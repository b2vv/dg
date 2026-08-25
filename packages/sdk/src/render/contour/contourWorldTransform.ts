/**
 * Map contour paths (cell-index × cellSize) into staff layout world space.
 * Contour uses cellWidth/Height; staff pitch may include gaps — scale by pitch.
 */

export interface ContourWorldTransform {
  originX: number;
  originY: number;
  pitchX: number;
  pitchY: number;
  cellWidth: number;
  cellHeight: number;
}

export interface ContourWorldNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function resolveContourWorldTransform(
  nodes: readonly ContourWorldNode[],
  positionById: Map<string, { gridCell?: { col: number; row: number } }>,
  cellWidth: number,
  cellHeight: number,
  pitchX: number,
  pitchY: number,
): ContourWorldTransform {
  for (const n of nodes) {
    const p = positionById.get(n.id);
    if (!p?.gridCell) continue;
    const insetX = (cellWidth - n.width) / 2;
    const insetY = (cellHeight - n.height) / 2;
    // Card world = col*pitch + inset + origin  →  origin = card - col*pitch - inset
    return {
      originX: n.x - p.gridCell.col * pitchX - insetX,
      originY: n.y - p.gridCell.row * pitchY - insetY,
      pitchX,
      pitchY,
      cellWidth,
      cellHeight,
    };
  }
  return {
    originX: 0,
    originY: 0,
    pitchX,
    pitchY,
    cellWidth,
    cellHeight,
  };
}

/** Contour pixel (x,y) → staff world. */
export function mapContourPointToWorld(
  x: number,
  y: number,
  t: ContourWorldTransform,
): { x: number; y: number } {
  return {
    x: (x / t.cellWidth) * t.pitchX + t.originX,
    y: (y / t.cellHeight) * t.pitchY + t.originY,
  };
}

export function mapContourPointsToWorld(
  points: readonly { x: number; y: number }[],
  t: ContourWorldTransform,
): { x: number; y: number }[] {
  return points.map((p) => mapContourPointToWorld(p.x, p.y, t));
}

/** Identity when pitch == cell and origin 0 (common Variant B case). */
export function isIdentityContourTransform(t: ContourWorldTransform): boolean {
  return (
    t.originX === 0 &&
    t.originY === 0 &&
    t.pitchX === t.cellWidth &&
    t.pitchY === t.cellHeight
  );
}
