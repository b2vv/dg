import type { DiagramOrganization } from '../data/types.js';
import { resolveMatrixDimensions } from './matrixGrid.js';
import { isOrgCollapsed } from './orgMode.js';
import type { OrgLayoutNode, OrgLayoutOptions } from './types.js';

/**
 * A set of siblings that lays out as a grid instead of a row (T113).
 *
 * The rule is **local and recursive**: any set of siblings whose members are
 * all collapsed becomes a grid. `work/SPEC.md` §2.1 used to state it globally
 * ("all organizations collapsed → matrix"), which is the same picture whenever
 * everything is shut and a different one the moment a node is open while its
 * children are not — exactly the two demo tabs where the defect showed.
 */
export interface CollapsedSiblingGrid {
  /** The organisation these members hang from. Never absent from the input. */
  parentId: string;
  /** Members in reading order: index `i` sits at row `i / cols`, column `i % cols`. */
  memberIds: string[];
  cols: number;
  rows: number;
}

type GridOptions = Pick<OrgLayoutOptions, 'matrixShape' | 'matrixRows' | 'matrixColumns'>;

/**
 * Order the members of one set.
 *
 * `matrixOrder` wins only when **every** member carries one. A partly filled
 * field is ignored wholesale rather than mixed with data order: two sources of
 * order produce a result nobody can explain, while "the host gave the order"
 * is a rule a reader can state. `work/SPEC.md:68` gives matrix order to
 * `matrixOrder`, but children inside a row-tree may simply not have it.
 *
 * The sort is stable, so duplicate, negative or fractional values still give
 * one answer rather than an arbitrary one.
 */
function orderedMembers(members: readonly DiagramOrganization[]): string[] {
  const allOrdered = members.every((o) => typeof o.matrixOrder === 'number');
  if (!allOrdered) return members.map((o) => o.id);
  return [...members]
    .sort((a, b) => (a.matrixOrder ?? 0) - (b.matrixOrder ?? 0))
    .map((o) => o.id);
}

/**
 * Which sibling sets become grids, and of what shape.
 *
 * Pure, and deliberately unaware of geometry: it answers *what* is a grid, and
 * the caller decides how to lay one out. Both consumers — the transform that
 * feeds the layout and the edge builder that has to tell a grid's own edges
 * from the tree's — ask this same function, so they cannot disagree about
 * which seats are in a grid (the shape T111 arrived at, plan §1).
 *
 * A set qualifies when it has **more than one** member and every one of them is
 * collapsed. `> 1` rather than `>= 1` matches the host's `matrixOnCollapse`
 * (`questions.md` §16): a lone collapsed child is a grid of one, which is the
 * child.
 *
 * ⚠️ Siblings with no parent — or whose parent is absent from this array — are
 * not a set. `toOrgFlatInput` nulls parents missing from the visible subtree,
 * so planning a set whose parent the layout never sees would hang a spine from
 * nothing.
 */
export function planCollapsedSiblingGrids(input: {
  organizations: readonly DiagramOrganization[];
  options: Required<GridOptions>;
}): CollapsedSiblingGrid[] {
  const { organizations, options } = input;
  const present = new Set(organizations.map((o) => o.id));

  const byParent = new Map<string, DiagramOrganization[]>();
  for (const org of organizations) {
    const parentId = org.parentOrgId;
    if (!parentId || !present.has(parentId)) continue;
    const siblings = byParent.get(parentId);
    if (siblings) siblings.push(org);
    else byParent.set(parentId, [org]);
  }

  const grids: CollapsedSiblingGrid[] = [];
  for (const [parentId, members] of byParent) {
    if (members.length < 2) continue;
    if (!members.every((o) => isOrgCollapsed(o))) continue;
    const { cols, rows } = resolveMatrixDimensions(members.length, options);
    grids.push({ parentId, memberIds: orderedMembers(members), cols, rows });
  }
  return grids;
}

/**
 * Rewrite the sets as chains, so the tidy layout draws each column as a stack.
 *
 * A column of the grid **is** a chain in tree terms: the layout centres a lone
 * child under its parent, so `cols` chains hung off one parent come out as a
 * grid, and the width is computed by the layout rather than by us
 * (`ploeg_layered_sibling_chains_form_a_grid` in `packages/core` pins this).
 *
 * The alternative — one synthetic node the size of the whole grid block — is
 * not available: the WASM boundary carries a single `nodeWidth`/`nodeHeight`
 * for the entire tree, so a node of a different size cannot be expressed
 * without widening that contract and the Rust behind it.
 *
 * ⚠️ **No synthetic ids.** Only `parentOrgId` changes; the set of organizations
 * is the same one that came in, which is why nothing has to be stripped on the
 * way back out.
 */
export function chainCollapsedGrids(input: {
  organizations: readonly DiagramOrganization[];
  grids: readonly CollapsedSiblingGrid[];
}): DiagramOrganization[] {
  const { organizations, grids } = input;
  if (grids.length === 0) return [...organizations];

  /** id → the member above it in its column, for every member of every grid. */
  const chainParent = new Map<string, string>();
  for (const grid of grids) {
    grid.memberIds.forEach((id, i) => {
      const above = grid.memberIds[i - grid.cols];
      if (above !== undefined) chainParent.set(id, above);
    });
  }

  return organizations.map((org) => {
    const above = chainParent.get(org.id);
    return above === undefined ? org : { ...org, parentOrgId: above };
  });
}

/**
 * Undo {@link chainCollapsedGrids} on the laid-out nodes.
 *
 * Coordinates are left exactly as the layout produced them — that is the whole
 * point of sending chains through it. What is restored is everything the chain
 * distorted about *meaning*: the real parent, and one depth for the whole set.
 *
 * Depth matters more than it looks. The chain depth is a fact about the
 * transport, and row-tree tells hosts it lays out "rows by depth"; reporting a
 * member of the second grid row as one level deeper would be a lie in the
 * public result rather than a detail.
 *
 * `matrixRow`/`matrixCol` are filled from the same reading order, reusing the
 * fields the matrix layout already populates rather than inventing a parallel
 * pair.
 */
export function unchainGridNodes(input: {
  nodes: readonly OrgLayoutNode[];
  grids: readonly CollapsedSiblingGrid[];
}): OrgLayoutNode[] {
  const { nodes, grids } = input;
  if (grids.length === 0) return [...nodes];

  const depthById = new Map(nodes.map((n) => [n.id, n.depth]));
  const restored = new Map<string, { parentId: string; depth: number; row: number; col: number }>();

  for (const grid of grids) {
    const parentDepth = depthById.get(grid.parentId);
    // A grid whose parent nobody laid out is left alone: inventing a depth from
    // a parent that is not on the canvas would place the member on a row that
    // does not exist.
    if (parentDepth === undefined) continue;
    grid.memberIds.forEach((id, i) => {
      restored.set(id, {
        parentId: grid.parentId,
        depth: parentDepth + 1,
        row: Math.floor(i / grid.cols),
        col: i % grid.cols,
      });
    });
  }

  return nodes.map((node) => {
    const fix = restored.get(node.id);
    if (!fix) return node;
    return {
      ...node,
      parentId: fix.parentId,
      depth: fix.depth,
      matrixRow: fix.row,
      matrixCol: fix.col,
    };
  });
}
