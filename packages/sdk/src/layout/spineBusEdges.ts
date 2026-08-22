import { staffEdgePolylineToSvg, type StaffEdgePoint } from '../render/staffEdgeGeometry.js';
import type { OrgLayoutEdge, OrgLayoutNode } from './types.js';

export type { OrgEdgeStyle } from './types.js';

export interface WorldBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  matrixRow?: number;
}

export interface SpineBusOptions {
  /** Gap between bus and child card edge (px). */
  busGap?: number;
  /** Prefer bus just above the child row (`row-top`) or below parent (`below-parent`). */
  busY?: 'below-parent' | 'row-top';
}

export interface SpineBusPolyline {
  points: StaffEdgePoint[];
  /** Logical role for tests / diagnostics. */
  role: 'spine' | 'bus' | 'riser';
  fromId: string;
  toId: string;
}

const DEFAULT_BUS_GAP = 14;

function cx(box: WorldBox): number {
  return box.x + box.width / 2;
}

function rowKey(box: WorldBox): number {
  if (box.matrixRow != null) return box.matrixRow;
  return Math.round(box.y);
}

/**
 * Build spine + horizontal bus + vertical risers for one parent and its children.
 * Children below the parent are the primary case (org-matrix). Children above use a mirrored bus.
 */
export function buildSpineBusPaths(
  parentBox: WorldBox,
  childBoxes: WorldBox[],
  opts: SpineBusOptions = {},
): SpineBusPolyline[] {
  if (childBoxes.length === 0) return [];

  const busGap = opts.busGap ?? DEFAULT_BUS_GAP;
  const busMode = opts.busY ?? 'row-top';
  const parentCx = cx(parentBox);
  const out: SpineBusPolyline[] = [];

  const below = childBoxes.filter((c) => c.y >= parentBox.y + parentBox.height * 0.5);
  const above = childBoxes.filter((c) => !below.includes(c));

  if (below.length > 0) {
    out.push(
      ...buildDirectedSpineBus(parentBox, below, {
        direction: 'down',
        busGap,
        busMode,
        parentCx,
      }),
    );
  }
  if (above.length > 0) {
    out.push(
      ...buildDirectedSpineBus(parentBox, above, {
        direction: 'up',
        busGap,
        busMode,
        parentCx,
      }),
    );
  }

  return out;
}

function buildDirectedSpineBus(
  parentBox: WorldBox,
  children: WorldBox[],
  args: {
    direction: 'down' | 'up';
    busGap: number;
    busMode: 'below-parent' | 'row-top';
    parentCx: number;
  },
): SpineBusPolyline[] {
  const { direction, busGap, busMode, parentCx } = args;
  const out: SpineBusPolyline[] = [];

  const rows = new Map<number, WorldBox[]>();
  for (const c of children) {
    const key = rowKey(c);
    const list = rows.get(key);
    if (list) list.push(c);
    else rows.set(key, [c]);
  }

  const sortedKeys = [...rows.keys()].sort((a, b) =>
    direction === 'down' ? a - b : b - a,
  );

  let spineY =
    direction === 'down' ? parentBox.y + parentBox.height : parentBox.y;

  for (const key of sortedKeys) {
    const row = rows.get(key)!;
    const centers = row.map(cx);
    const busLeft = Math.min(...centers, parentCx);
    const busRight = Math.max(...centers, parentCx);

    let busY: number;
    if (direction === 'down') {
      const rowTop = Math.min(...row.map((c) => c.y));
      busY =
        busMode === 'below-parent'
          ? Math.min(spineY + busGap, rowTop - busGap)
          : rowTop - busGap;
      if (busY <= spineY) busY = (spineY + rowTop) / 2;
    } else {
      const rowBottom = Math.max(...row.map((c) => c.y + c.height));
      busY =
        busMode === 'below-parent'
          ? Math.max(spineY - busGap, rowBottom + busGap)
          : rowBottom + busGap;
      if (busY >= spineY) busY = (spineY + rowBottom) / 2;
    }

    if (Math.abs(spineY - busY) > 0.5) {
      out.push({
        role: 'spine',
        fromId: parentBox.id,
        toId: `${parentBox.id}__bus-${key}`,
        points: [
          { x: parentCx, y: spineY },
          { x: parentCx, y: busY },
        ],
      });
    }

    if (busRight - busLeft > 0.5) {
      out.push({
        role: 'bus',
        fromId: `${parentBox.id}__bus-${key}-L`,
        toId: `${parentBox.id}__bus-${key}-R`,
        points: [
          { x: busLeft, y: busY },
          { x: busRight, y: busY },
        ],
      });
    }

    for (const child of row) {
      const childCx = cx(child);
      const childPort = direction === 'down' ? child.y : child.y + child.height;
      out.push({
        role: 'riser',
        fromId: parentBox.id,
        toId: child.id,
        points: [
          { x: childCx, y: busY },
          { x: childCx, y: childPort },
        ],
      });
    }

    spineY = busY;
  }

  return out;
}

/** Convert spine/bus polylines into OrgLayoutEdge paths. */
export function spineBusToOrgEdges(polylines: SpineBusPolyline[]): OrgLayoutEdge[] {
  return polylines
    .filter((p) => p.points.length >= 2)
    .map((p) => ({
      fromId: p.fromId,
      toId: p.toId,
      kind: 'admin' as const,
      path: staffEdgePolylineToSvg(p.points),
    }));
}

/**
 * Replace parent→child admin edges with shared spine/bus geometry.
 * Non-admin / orgLinks should stay per-link (caller responsibility).
 */
export function buildSpineBusEdgesForForest(
  nodes: OrgLayoutNode[],
  parentChildPairs: Array<{ parentId: string; childId: string }>,
  opts: SpineBusOptions = {},
): OrgLayoutEdge[] {
  const byId = new Map(nodes.map((n) => [n.orgId, n]));
  const childrenByParent = new Map<string, WorldBox[]>();

  for (const { parentId, childId } of parentChildPairs) {
    const parent = byId.get(parentId);
    const child = byId.get(childId);
    if (!parent || !child) continue;
    const list = childrenByParent.get(parentId);
    const box: WorldBox = {
      id: child.orgId,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
      matrixRow: child.matrixRow,
    };
    if (list) list.push(box);
    else childrenByParent.set(parentId, [box]);
  }

  const edges: OrgLayoutEdge[] = [];
  for (const [parentId, kids] of childrenByParent) {
    const parent = byId.get(parentId)!;
    const parentBox: WorldBox = {
      id: parent.orgId,
      x: parent.x,
      y: parent.y,
      width: parent.width,
      height: parent.height,
      matrixRow: parent.matrixRow,
    };
    edges.push(...spineBusToOrgEdges(buildSpineBusPaths(parentBox, kids, opts)));
  }
  return edges;
}
