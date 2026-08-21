/**
 * Paint magnetic groups like a button-group chrome: one rounded rect
 * around member cards, instead of cell-flood stairs / Chaikin noise.
 */
import type { ContourClearBox } from './contourClearance.js';
import { CONTOUR_CORNER_RADIUS, filletClosedRing, type ContourPoint } from './contourFillet.js';

export function pointInPolygon(
  x: number,
  y: number,
  ring: readonly ContourPoint[],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]!.x;
    const yi = ring[i]!.y;
    const xj = ring[j]!.x;
    const yj = ring[j]!.y;
    const inter = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

/** Cards whose centers lie inside the component ring (this magnetic group). */
export function memberBoxesInsideRing(
  ring: readonly ContourPoint[],
  boxes: readonly ContourClearBox[],
): ContourClearBox[] {
  if (ring.length < 3) return [];
  return boxes.filter((b) =>
    pointInPolygon(b.x + b.width / 2, b.y + b.height / 2, ring),
  );
}

function boxesAabb(boxes: readonly ContourClearBox[]): ContourClearBox | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Breathing room around the card union (REQUIREMENTS: ~8px / fraction of cell).
 * `paddingCells` scales the margin without reverting to multi-cell flood stairs.
 */
export function contourButtonGroupMargin(
  paddingCells: number,
  strokeWidth: number,
): number {
  const pad = Number.isFinite(paddingCells) ? Math.max(0, paddingCells) : 0;
  const stroke = Number.isFinite(strokeWidth) ? Math.max(0, strokeWidth) : 0;
  return Math.max(6, stroke / 2 + 4) + pad * 8;
}

/**
 * True when member-card AABB is solidly covered by the cell ring (no L/C hole).
 * Large pad floods still qualify — paint uses a tight rounded rect instead.
 */
export function ringAllowsButtonGroup(
  ring: readonly ContourPoint[],
  members: readonly ContourClearBox[],
  sampleGrid = 5,
): boolean {
  if (ring.length < 3 || members.length === 0) return false;
  const aabb = boxesAabb(members);
  if (!aabb || aabb.width <= 0 || aabb.height <= 0) return false;

  const n = Math.max(2, sampleGrid);
  let inside = 0;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const x = aabb.x + ((i + 0.5) / n) * aabb.width;
      const y = aabb.y + ((j + 0.5) / n) * aabb.height;
      total += 1;
      if (pointInPolygon(x, y, ring)) inside += 1;
    }
  }
  return inside / total >= 0.85;
}

/** Closed ring: expanded AABB of member cards with card-matching corner radius. */
export function buttonGroupRingFromBoxes(
  boxes: readonly ContourClearBox[],
  margin: number,
  radius: number = CONTOUR_CORNER_RADIUS,
): ContourPoint[] {
  const aabb = boxesAabb(boxes);
  if (!aabb) return [];
  const x = aabb.x - margin;
  const y = aabb.y - margin;
  const w = aabb.width + margin * 2;
  const h = aabb.height + margin * 2;
  if (w <= 0 || h <= 0) return [];
  const sharp: ContourPoint[] = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  return filletClosedRing(sharp, Math.min(radius, Math.min(w, h) / 2));
}
