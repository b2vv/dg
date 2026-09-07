import { describe, expect, it } from '@rstest/core';
import {
  chainCollapsedGrids,
  planCollapsedSiblingGrids,
  unchainGridNodes,
} from './collapsedSiblingGrid.js';
import { DEFAULT_ORG_LAYOUT_OPTIONS } from './types.js';
import type { DiagramOrganization } from '../data/types.js';
import type { OrgLayoutNode } from './types.js';

/**
 * T113 K1 — which sibling sets become a grid, and of what shape.
 *
 * The rule is local and recursive (`work/SPEC.md` §2.1, corrected 2026-09-06):
 * any set of siblings whose members are **all** collapsed lays out as a grid,
 * not just the case where the whole diagram is collapsed.
 */

const org = (
  id: string,
  parentOrgId: string | undefined,
  collapsed: boolean,
  matrixOrder?: number,
): DiagramOrganization => ({
  id,
  name: id,
  groupIds: [],
  ...(parentOrgId === undefined ? {} : { parentOrgId }),
  collapsed,
  ...(matrixOrder === undefined ? {} : { matrixOrder }),
});

const opts = {
  matrixShape: DEFAULT_ORG_LAYOUT_OPTIONS.matrixShape,
  matrixRows: DEFAULT_ORG_LAYOUT_OPTIONS.matrixRows,
  matrixColumns: DEFAULT_ORG_LAYOUT_OPTIONS.matrixColumns,
};

/** `root` expanded, `n` collapsed children — the shape both broken tabs have. */
const rootWithCollapsedChildren = (n: number): DiagramOrganization[] => [
  org('root', undefined, false),
  ...Array.from({ length: n }, (_, i) => org(`c${i}`, 'root', true, i)),
];

describe('planCollapsedSiblingGrids (T113 K1)', () => {
  it('success: nine all-collapsed siblings become a 3x3 grid', () => {
    const grids = planCollapsedSiblingGrids({
      organizations: rootWithCollapsedChildren(9),
      options: opts,
    });
    expect(grids).toHaveLength(1);
    expect(grids[0]).toMatchObject({ parentId: 'root', cols: 3, rows: 3 });
    expect(grids[0]?.memberIds).toEqual([
      'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8',
    ]);
  });

  it('success: four become 2x2 — the Flat orgs case the user reported', () => {
    const grids = planCollapsedSiblingGrids({
      organizations: rootWithCollapsedChildren(4),
      options: opts,
    });
    expect(grids[0]).toMatchObject({ cols: 2, rows: 2 });
  });

  it('success: five fill three columns and leave the last row short', () => {
    const grids = planCollapsedSiblingGrids({
      organizations: rootWithCollapsedChildren(5),
      options: opts,
    });
    // ceil(sqrt(5)) = 3 columns, so rows = ceil(5/3) = 2 and one cell is empty.
    expect(grids[0]).toMatchObject({ cols: 3, rows: 2 });
  });

  it('success: the rule is recursive — two sets on different levels are judged apart', () => {
    // root (expanded) → a (expanded) → three collapsed
    //                 → b, c, d (collapsed)   ← also a set
    const organizations: DiagramOrganization[] = [
      org('root', undefined, false),
      org('a', 'root', false),
      org('b', 'root', true),
      org('c', 'root', true),
      org('d', 'root', true),
      org('a1', 'a', true),
      org('a2', 'a', true),
      org('a3', 'a', true),
    ];
    const grids = planCollapsedSiblingGrids({ organizations, options: opts });
    // `root`'s own children are NOT all collapsed (a is expanded) → no grid there.
    expect(grids.map((g) => g.parentId).sort()).toEqual(['a']);
  });

  it('failure: a single collapsed sibling is not a grid', () => {
    const grids = planCollapsedSiblingGrids({
      organizations: rootWithCollapsedChildren(1),
      options: opts,
    });
    expect(grids).toEqual([]);
  });

  it('failure: one expanded sibling keeps the whole set a row', () => {
    const organizations = rootWithCollapsedChildren(4);
    organizations[2] = org('c1', 'root', false, 1);
    expect(planCollapsedSiblingGrids({ organizations, options: opts })).toEqual([]);
  });

  it('failure: `collapsed: undefined` counts as collapsed, same rule as everywhere else', () => {
    // isOrgCollapsed treats undefined as collapsed; a set must not change
    // meaning depending on whether the host wrote the flag out.
    const organizations: DiagramOrganization[] = [
      org('root', undefined, false),
      { id: 'x', name: 'x', groupIds: [], parentOrgId: 'root' },
      { id: 'y', name: 'y', groupIds: [], parentOrgId: 'root' },
      { id: 'z', name: 'z', groupIds: [], parentOrgId: 'root' },
    ];
    expect(planCollapsedSiblingGrids({ organizations, options: opts })).toHaveLength(1);
  });

  it('failure: no organizations, and one organization, produce no grid and no throw', () => {
    expect(planCollapsedSiblingGrids({ organizations: [], options: opts })).toEqual([]);
    expect(
      planCollapsedSiblingGrids({
        organizations: [org('only', undefined, true)],
        options: opts,
      }),
    ).toEqual([]);
  });

  it('failure: parentless siblings are not a set — the visible tree has one root', () => {
    // Two collapsed orgs with no parent are roots of a forest, not siblings
    // under someone. Grouping them would invent a parent to hang a spine from.
    const organizations = [org('r1', undefined, true), org('r2', undefined, true)];
    expect(planCollapsedSiblingGrids({ organizations, options: opts })).toEqual([]);
  });

  it('failure: a parent absent from the payload is not a parent here either', () => {
    // `toOrgFlatInput` nulls parents missing from the visible subtree; the grid
    // must agree, or it would plan a set whose parent the layout never sees.
    const organizations = [
      org('x', 'ghost', true, 0),
      org('y', 'ghost', true, 1),
      org('z', 'ghost', true, 2),
    ];
    expect(planCollapsedSiblingGrids({ organizations, options: opts })).toEqual([]);
  });

  it('success: matrixOrder decides the order when every member carries one', () => {
    const organizations: DiagramOrganization[] = [
      org('root', undefined, false),
      org('late', 'root', true, 9),
      org('early', 'root', true, 1),
      org('mid', 'root', true, 5),
    ];
    expect(planCollapsedSiblingGrids({ organizations, options: opts })[0]?.memberIds).toEqual([
      'early', 'mid', 'late',
    ]);
  });

  it('failure: a partly filled matrixOrder is ignored wholesale, not mixed in', () => {
    // Mixing two sources of order gives a result nobody can explain; taking the
    // data order whole is at least a rule a reader can state.
    const organizations: DiagramOrganization[] = [
      org('root', undefined, false),
      org('b', 'root', true, 9),
      org('a', 'root', true),
      org('c', 'root', true, 1),
    ];
    expect(planCollapsedSiblingGrids({ organizations, options: opts })[0]?.memberIds).toEqual([
      'b', 'a', 'c',
    ]);
  });

  it('failure: duplicate, negative and fractional matrixOrder stay deterministic', () => {
    const organizations: DiagramOrganization[] = [
      org('root', undefined, false),
      org('p', 'root', true, -1),
      org('q', 'root', true, 2.5),
      org('r', 'root', true, 2.5),
      org('s', 'root', true, -1),
    ];
    const once = planCollapsedSiblingGrids({ organizations, options: opts })[0]?.memberIds;
    const twice = planCollapsedSiblingGrids({ organizations, options: opts })[0]?.memberIds;
    expect(once).toEqual(twice);
    // ties keep the order they arrived in, so the answer is explainable
    expect(once).toEqual(['p', 's', 'q', 'r']);
  });

  it('failure: the input is not mutated', () => {
    const organizations = rootWithCollapsedChildren(4);
    const before = JSON.stringify(organizations);
    planCollapsedSiblingGrids({ organizations, options: opts });
    expect(JSON.stringify(organizations)).toBe(before);
  });

  it('failure: two members is a grid by the rule, and visibly still one row', () => {
    // ceil(sqrt(2)) = 2 columns, so the "grid" is 1x2 — the same row as before.
    // Named so nobody treats the unchanged picture as a bug (spec §Межа).
    const grids = planCollapsedSiblingGrids({
      organizations: rootWithCollapsedChildren(2),
      options: opts,
    });
    expect(grids[0]).toMatchObject({ cols: 2, rows: 1 });
  });
});

/**
 * T113 K2 — the set travels to the layout as chains and comes back as a grid.
 *
 * There are **no synthetic ids**: a chain re-parents the real organizations and
 * nothing else. The first plan said otherwise in two places; GATE 2 caught the
 * contradiction, and the shape that survives is the smaller one.
 */
describe('chainCollapsedGrids / unchainGridNodes (T113 K2)', () => {
  const nineUnderRoot = () => {
    const organizations = rootWithCollapsedChildren(9);
    const grids = planCollapsedSiblingGrids({ organizations, options: opts });
    return { organizations, grids };
  };

  it('success: nine members become three chains of three', () => {
    const { organizations, grids } = nineUnderRoot();
    const chained = chainCollapsedGrids({ organizations, grids });
    const parentOf = (id: string) => chained.find((o) => o.id === id)?.parentOrgId;
    // reading order c0..c8 over 3 columns: c0 c1 c2 / c3 c4 c5 / c6 c7 c8
    expect([parentOf('c0'), parentOf('c1'), parentOf('c2')]).toEqual(['root', 'root', 'root']);
    expect([parentOf('c3'), parentOf('c4'), parentOf('c5')]).toEqual(['c0', 'c1', 'c2']);
    expect([parentOf('c6'), parentOf('c7'), parentOf('c8')]).toEqual(['c3', 'c4', 'c5']);
  });

  it('success: a short last row leaves shorter chains, not a hole in the middle', () => {
    const organizations = rootWithCollapsedChildren(5);
    const grids = planCollapsedSiblingGrids({ organizations, options: opts });
    const chained = chainCollapsedGrids({ organizations, grids });
    const parentOf = (id: string) => chained.find((o) => o.id === id)?.parentOrgId;
    // 3 columns: c0 c1 c2 / c3 c4 — the third column is one deep, the others two
    expect([parentOf('c0'), parentOf('c1'), parentOf('c2')]).toEqual(['root', 'root', 'root']);
    expect([parentOf('c3'), parentOf('c4')]).toEqual(['c0', 'c1']);
  });

  it('success: every id in the output existed in the input — no synthetic nodes', () => {
    const { organizations, grids } = nineUnderRoot();
    const chained = chainCollapsedGrids({ organizations, grids });
    expect(chained.map((o) => o.id).sort()).toEqual(organizations.map((o) => o.id).sort());
  });

  it('failure: the input is not mutated', () => {
    const { organizations, grids } = nineUnderRoot();
    const before = JSON.stringify(organizations);
    chainCollapsedGrids({ organizations, grids });
    expect(JSON.stringify(organizations)).toBe(before);
  });

  it('failure: with no grids the organizations come back untouched', () => {
    const organizations = rootWithCollapsedChildren(1);
    expect(chainCollapsedGrids({ organizations, grids: [] })).toEqual(organizations);
  });

  /** What the layout would hand back for a 2x2 grid under an expanded root. */
  const laidOut = (): OrgLayoutNode[] => [
    { id: 'root', orgId: 'root', x: 100, y: 0, width: 200, height: 64, depth: 1 },
    { id: 'c0', orgId: 'c0', x: 0, y: 100, width: 200, height: 64, depth: 2, parentId: 'root' },
    { id: 'c1', orgId: 'c1', x: 240, y: 100, width: 200, height: 64, depth: 2, parentId: 'root' },
    { id: 'c2', orgId: 'c2', x: 0, y: 200, width: 200, height: 64, depth: 3, parentId: 'c0' },
    { id: 'c3', orgId: 'c3', x: 240, y: 200, width: 200, height: 64, depth: 3, parentId: 'c1' },
  ];

  const fourGrid = () => {
    const organizations = rootWithCollapsedChildren(4);
    return planCollapsedSiblingGrids({ organizations, options: opts });
  };

  it('success: unchaining restores the real parent for every member', () => {
    const out = unchainGridNodes({ nodes: laidOut(), grids: fourGrid() });
    for (const id of ['c0', 'c1', 'c2', 'c3']) {
      expect(out.find((n) => n.id === id)?.parentId).toBe('root');
    }
  });

  it('success: unchaining puts every member on one depth — the parent`s plus one', () => {
    // The chain depth is a fact about the transport, not about the tree. Row-tree
    // promises "rows by depth", so leaving 3 on the lower row would be a lie in
    // the public result.
    const out = unchainGridNodes({ nodes: laidOut(), grids: fourGrid() });
    for (const id of ['c0', 'c1', 'c2', 'c3']) {
      expect(out.find((n) => n.id === id)?.depth).toBe(2);
    }
  });

  it('success: unchaining fills matrixRow and matrixCol in reading order', () => {
    const out = unchainGridNodes({ nodes: laidOut(), grids: fourGrid() });
    const cell = (id: string) => {
      const n = out.find((x) => x.id === id);
      return [n?.matrixRow, n?.matrixCol];
    };
    expect(cell('c0')).toEqual([0, 0]);
    expect(cell('c1')).toEqual([0, 1]);
    expect(cell('c2')).toEqual([1, 0]);
    expect(cell('c3')).toEqual([1, 1]);
  });

  it('success: coordinates are left exactly where the layout put them', () => {
    const before = laidOut();
    const out = unchainGridNodes({ nodes: before, grids: fourGrid() });
    for (const n of before) {
      const after = out.find((x) => x.id === n.id);
      expect([after?.x, after?.y]).toEqual([n.x, n.y]);
    }
  });

  it('failure: nodes outside any grid keep their parent and depth', () => {
    const out = unchainGridNodes({ nodes: laidOut(), grids: fourGrid() });
    const root = out.find((n) => n.id === 'root');
    expect(root?.parentId).toBeUndefined();
    expect(root?.depth).toBe(1);
    expect(root?.matrixRow).toBeUndefined();
  });

  it('failure: a grid whose parent is missing from the nodes leaves them alone', () => {
    // Defensive rather than expected: inventing a depth from a parent nobody
    // laid out would put the member on a row that does not exist.
    const nodes = laidOut().filter((n) => n.id !== 'root');
    const out = unchainGridNodes({ nodes, grids: fourGrid() });
    expect(out.find((n) => n.id === 'c2')?.depth).toBe(3);
    expect(out.find((n) => n.id === 'c2')?.parentId).toBe('c0');
  });

  it('failure: the node list is not mutated', () => {
    const nodes = laidOut();
    const before = JSON.stringify(nodes);
    unchainGridNodes({ nodes, grids: fourGrid() });
    expect(JSON.stringify(nodes)).toBe(before);
  });

  it('success: chaining then unchaining is identity on parentage', () => {
    // The round trip is the whole contract: whatever the transport does in
    // between, the host must not be able to tell it happened.
    const { organizations, grids } = nineUnderRoot();
    const chained = chainCollapsedGrids({ organizations, grids });
    const nodes: OrgLayoutNode[] = chained.map((o, i) => ({
      id: o.id,
      orgId: o.id,
      x: i * 10,
      y: i * 10,
      width: 200,
      height: 64,
      depth: 1,
      ...(o.parentOrgId === undefined ? {} : { parentId: o.parentOrgId }),
    }));
    const out = unchainGridNodes({ nodes, grids });
    for (const id of ['c0', 'c3', 'c6', 'c8']) {
      expect(out.find((n) => n.id === id)?.parentId).toBe('root');
    }
  });
});
