import type { DiagramOrganization, DiagramOrgLink } from '../data/types.js';
import { computeMatrixLayout } from './matrixLayout.js';
import {
  chainCollapsedGrids,
  planCollapsedSiblingGrids,
  unchainGridNodes,
  type CollapsedSiblingGrid,
} from './collapsedSiblingGrid.js';
import { detectOrgMode, findExpandedRootIds, isOrgCollapsed } from './orgMode.js';
import { validateOrgHierarchy } from './orgTree.js';
import { buildSpineBusEdgesForForest } from './spineBusEdges.js';
import { OrgHierarchyError } from './orgTree.js';
import {
  DEFAULT_ORG_LAYOUT_OPTIONS,
  assertOrgLayoutMetrics,
  type OrgLayoutOptions,
  type OrgLayoutResult,
} from './types.js';
import {
  computeOrgRowTreeLayoutWasm,
  type OrgFlatInput,
} from '../wasm/layoutBridge.js';

function toOrgFlatInput(organizations: DiagramOrganization[]): OrgFlatInput[] {
  const ids = new Set(organizations.map((o) => o.id));
  return organizations.map((o) => ({
    id: o.id,
    // Visible subtree may omit ancestors; that is not a hanging parent in the
    // host data. Null them so WASM validate sees a forest, not UnknownParent.
    parentOrgId: o.parentOrgId && ids.has(o.parentOrgId) ? o.parentOrgId : null,
    name: o.name,
  }));
}

/**
 * Deepest expanded subtree the row-tree layout accepts, counting the expanded
 * root as depth 1.
 *
 * This is a contract, not a measurement of what happens to survive. Past it the
 * traversals below — and the one left in Rust — run out of stack.
 *
 * ⚠️ **Тут стояло «до ~4 000 модуль кидає й живе, за ~4 500 труїться», і це
 * спростовано** тим самим виміром, що нижче: на свіжій сторінці Chromium ковтає
 * навіть 50 000 і кидає чистий `RangeError`. Труїть не глибина, а **повтор** —
 * див. врізку в кінці. Згадка про `computeAllContours` застаріла ще раніше: у
 * крейті контуру немає з T80, через межу ходить один виклик.
 *
 * 🔴 **Виміряно в браузері 2026-09-11 (T120 гілка А), і число лишається 2 500.**
 * Попередня редакція цього коментаря просила саме такого переміру: 2 500 було
 * виведене з Node (падіння за ~2 900), а Node — не те середовище, у якому
 * працює продукт.
 *
 * | Рушій | головний потік | воркер | через `create()` |
 * |---|---|---|---|
 * | Chromium | 7 625 | **3 937** | 8 000 |
 * | Firefox | 5 812 | **3 250** | — |
 *
 * Мінімум — **3 250** (воркер у Firefox), і 2 500 сидить на 23% нижче. Підняти
 * до 3 000 означало б зрізати запас до 8% заради 20% глибини, маючи WebKit
 * невиміряним, а число — рухливим від того, скільки стека витратив викликач
 * (у Chromium той самий обхід дає 7 625 із зонда й 8 000 через `create()`).
 *
 * ⚠️ **І запас тут стереже не відмову, а смерть сторінки.** Зрив у WASM не
 * завжди чистий: у Chromium **п'ятий поспіль** зрив на одному інстансі вбиває
 * модуль назавжди — далі будь-який виклик, навіть глибини 500, кидає
 * `RuntimeError: memory access out of bounds`. Причому виклик, який убив,
 * сам повернув `RangeError`, тож **тип помилки не є ознакою виживання**.
 * Firefox на 15 повторах не помер. Розбір і числа —
 * `work/reports/row-tree-depth/browser-probe.md`.
 *
 * Lower this number rather than defend it.
 */
export const MAX_ROW_TREE_DEPTH = 2_500;

/**
 * Collect the expanded subtree, refusing anything deeper than
 * {@link MAX_ROW_TREE_DEPTH}.
 *
 * Iterative on purpose: the recursion this replaces overflowed the stack before
 * any check could run, so the guard had to live somewhere the guard itself
 * could reach. The children index replaces a full scan of `organizations` per
 * visited node, which is also what lets a 50 000-org chain be refused in
 * milliseconds instead of seconds — it stops at the first node past the limit
 * rather than walking the rest.
 */
function visibleOrgsForRowTree(
  organizations: DiagramOrganization[],
  expandedRootId: string,
): { visible: DiagramOrganization[]; maxDepth: number } {
  const byId = new Map(organizations.map((o) => [o.id, o]));
  const childrenByParent = new Map<string, DiagramOrganization[]>();
  for (const org of organizations) {
    if (!org.parentOrgId) continue;
    const siblings = childrenByParent.get(org.parentOrgId);
    if (siblings) siblings.push(org);
    else childrenByParent.set(org.parentOrgId, [org]);
  }

  const visible = new Set<string>();
  // Returned rather than only compared: T113 hangs a grid's rows below the set,
  // and the second guard needs a number to add them to. A check that can only
  // throw cannot answer «how deep is this really».
  let maxDepth = 0;
  const pending: Array<{ id: string; depth: number }> = [{ id: expandedRootId, depth: 1 }];
  while (pending.length > 0) {
    const { id, depth } = pending.pop()!;
    const org = byId.get(id);
    if (!org) continue;
    if (depth > MAX_ROW_TREE_DEPTH) {
      throw new OrgHierarchyError(
        `Organization tree too deep: reached depth ${depth} at ${id}, ` +
          `maximum is ${MAX_ROW_TREE_DEPTH}`,
      );
    }
    visible.add(id);
    if (depth > maxDepth) maxDepth = depth;
    if (isOrgCollapsed(org)) continue;
    for (const child of childrenByParent.get(id) ?? []) {
      pending.push({ id: child.id, depth: depth + 1 });
    }
  }
  return { visible: organizations.filter((o) => visible.has(o.id)), maxDepth };
}

/**
 * Swap a grid's chain edges for a spine, bus and risers (T113 K4).
 *
 * The chain is how the set travels to the layout, not how it should be drawn:
 * left alone, the canvas would show the ladder we climbed to get the geometry.
 * A member is always a leaf of the visible tree, so the only edges that can
 * point **at** one are its chain parent's — which makes «is the target a member
 * of a grid» a complete and stable test, where matching on an id shape or a
 * depth would be brittle for no gain.
 *
 * The builder is the one the global matrix already uses (`matrixLayout.ts`),
 * down to the same `busGap`, so the two matrices in this product are drawn by
 * the same geometry rather than by two lookalikes.
 */
function withGridSpines(input: {
  edges: OrgLayoutResult['edges'];
  nodes: OrgLayoutResult['nodes'];
  grids: readonly CollapsedSiblingGrid[];
  opts: Required<OrgLayoutOptions>;
}): OrgLayoutResult['edges'] {
  const { edges, nodes, grids, opts } = input;
  if (grids.length === 0) return edges;

  const members = new Set(grids.flatMap((g) => g.memberIds));
  const pairs = grids.flatMap((g) =>
    g.memberIds.map((childId) => ({ parentId: g.parentId, childId })),
  );
  return [
    ...edges.filter((e) => !members.has(e.toId)),
    ...buildSpineBusEdgesForForest([...nodes], pairs, {
      busGap: Math.max(8, Math.min(18, opts.verticalGap / 2)),
      busY: 'row-top',
    }),
  ];
}

export async function computeOrgRowTreeLayout(
  organizations: DiagramOrganization[],
  expandedRootId: string,
  options: OrgLayoutOptions = {},
): Promise<OrgLayoutResult> {
  validateOrgHierarchy(organizations);
  const opts = { ...DEFAULT_ORG_LAYOUT_OPTIONS, ...options };
  assertOrgLayoutMetrics(opts);
  if (!organizations.some((o) => o.id === expandedRootId)) {
    throw new OrgHierarchyError(`Unknown organization: ${expandedRootId}`);
  }
  const { visible, maxDepth } = visibleOrgsForRowTree(organizations, expandedRootId);

  // T113: a set of siblings that is entirely collapsed lays out as a grid, and
  // travels to the layout as one chain per column (`collapsedSiblingGrid.ts`).
  const grids = planCollapsedSiblingGrids({ organizations: visible, options: opts });
  const extraRows = grids.reduce((deepest, g) => Math.max(deepest, g.rows - 1), 0);
  if (maxDepth + extraRows > MAX_ROW_TREE_DEPTH) {
    // Its own message on purpose. The tree the host sent is inside the limit;
    // what pushed it over is a grid the host never asked for, and the old
    // wording would have blamed the data.
    throw new OrgHierarchyError(
      `Organization tree too deep once collapsed siblings are laid out as a grid: ` +
        `depth ${maxDepth} plus ${extraRows} grid row(s) exceeds ${MAX_ROW_TREE_DEPTH}`,
    );
  }
  const forLayout = chainCollapsedGrids({ organizations: visible, grids });

  const raw = await computeOrgRowTreeLayoutWasm(toOrgFlatInput(forLayout), expandedRootId, {
    direction: 'vertical',
    nodeWidth: opts.nodeWidth,
    nodeHeight: opts.nodeHeight,
    horizontalGap: opts.horizontalGap,
    verticalGap: opts.verticalGap,
    margin: opts.margin,
  });

  const nodes = unchainGridNodes({
    nodes: raw.nodes.map((n) => ({
      id: n.id,
      orgId: n.orgId,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      depth: n.depth,
      parentId: n.parentId ?? undefined,
    })),
    grids,
  });

  return {
    mode: 'row-tree',
    nodes,
    edges: withGridSpines({
      edges: raw.edges.map((e) => ({
        fromId: e.fromId,
        toId: e.toId,
        path: e.path,
        kind: 'admin' as const,
      })),
      nodes,
      grids,
      opts,
    }),
    width: raw.width,
    height: raw.height,
  };
}

export async function computeOrgLayout(
  organizations: DiagramOrganization[],
  orgLinks: DiagramOrgLink[] = [],
  options: OrgLayoutOptions = {},
): Promise<OrgLayoutResult> {
  validateOrgHierarchy(organizations);
  const mode = detectOrgMode(organizations);

  if (mode === 'matrix') {
    return computeMatrixLayout(organizations, orgLinks, options);
  }

  const rootIds = findExpandedRootIds(organizations);
  if (rootIds.length === 0) {
    return computeMatrixLayout(organizations, orgLinks, options);
  }

  if (rootIds.length === 1) {
    return computeOrgRowTreeLayout(organizations, rootIds[0]!, options);
  }

  // T78-L3: forest — layout each expanded root and place side-by-side.
  const opts = { ...DEFAULT_ORG_LAYOUT_OPTIONS, ...options };
  const trees = await Promise.all(
    rootIds.map((id) => computeOrgRowTreeLayout(organizations, id, options)),
  );
  const gap = opts.horizontalGap;
  let cursorX = 0;
  const nodes: OrgLayoutResult['nodes'] = [];
  const edges: OrgLayoutResult['edges'] = [];
  let height = 0;
  for (const tree of trees) {
    for (const n of tree.nodes) {
      nodes.push({ ...n, x: n.x + cursorX });
    }
    for (const e of tree.edges) {
      if (!e.path) {
        edges.push(e);
        continue;
      }
      // Shift absolute M/L coordinates in the SVG path by cursorX.
      const shifted = e.path.replace(
        /([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,
        (_m, cmd: string, xs: string, ys: string) =>
          `${cmd}${Number(xs) + cursorX} ${ys}`,
      );
      edges.push({ ...e, path: shifted });
    }
    height = Math.max(height, tree.height);
    cursorX += tree.width + gap;
  }
  return {
    mode: 'row-tree',
    nodes,
    edges,
    width: Math.max(0, cursorX - gap),
    height,
  };
}

/** Worker handler body — also registered in compute-handlers */
export async function handleComputeOrgRowTreeLayout(payload: {
  organizations: DiagramOrganization[];
  expandedRootId: string;
  options?: OrgLayoutOptions;
}): Promise<OrgLayoutResult> {
  return computeOrgRowTreeLayout(
    payload.organizations,
    payload.expandedRootId,
    payload.options,
  );
}
