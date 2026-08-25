/**
 * Paint magnetic groups as button-group chrome: one rounded rect around
 * member cards (no cell-flood L/C geometry).
 *
 * This module is the *frame* only: the padded union AABB of a component.
 * Foreign cards that fall inside that frame are notched out downstream by
 * `contourNotch` (G2 / M2), so an empty corner of an L-shape still reads as
 * filled, but a foreign card in it never does. Full cell-space G5–G7 parity
 * stays in `packages/core/src/contour.rs` (export / tests).
 */
import type { ContourClearBox, ContourMemberBox } from './contourClearance.js';
import { CONTOUR_CORNER_RADIUS, filletClosedRing, type ContourPoint } from './contourFillet.js';

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
 * Demo Padding slider: extra px margin around the card union only (paint layer).
 * Does not expand Rust flood / G7 / notch geometry.
 */
export function contourButtonGroupMargin(
  paddingCells: number,
  strokeWidth: number,
): number {
  const pad = Number.isFinite(paddingCells) ? Math.max(0, paddingCells) : 0;
  const stroke = Number.isFinite(strokeWidth) ? Math.max(0, strokeWidth) : 0;
  return Math.max(6, stroke / 2 + 4) + pad * 8;
}

export function memberBoxesForCluster(
  clusterIds: readonly string[],
  members: readonly ContourMemberBox[],
): ContourMemberBox[] {
  const set = new Set(clusterIds);
  return members.filter((m) => set.has(m.positionId));
}

/** Closed ring: expanded AABB of member cards with card-matching corner radius.
 * Union AABB on purpose (T78-L8) — no G5–G7 notch on canvas. */
export function buttonGroupRingFromBoxes(
  boxes: readonly ContourClearBox[],
  margin: number,
  radius: number = CONTOUR_CORNER_RADIUS,
  arcSegments = 4,
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
  const r = Math.min(radius, margin, Math.min(w, h) / 2);
  return filletClosedRing(sharp, r, Math.max(1, arcSegments));
}
