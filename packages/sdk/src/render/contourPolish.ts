/**
 * Shared live + SVG post-pass: always button-group rounded wrap around
 * member cards in the magnetic component.
 */
import type { ContourClearBox } from './contourClearance.js';
import {
  buttonGroupRingFromBoxes,
  contourButtonGroupMargin,
  memberBoxesInsideRing,
} from './contourButtonGroup.js';
import { CONTOUR_CORNER_RADIUS } from './contourFillet.js';

export function polishContourRing(
  points: readonly { x: number; y: number }[],
  boxes: readonly ContourClearBox[],
  strokeWidth: number,
  paddingCells = 0,
): { x: number; y: number }[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));

  const members = memberBoxesInsideRing(points, boxes);
  if (members.length === 0) return [];

  const margin = contourButtonGroupMargin(paddingCells, strokeWidth);
  const radius = Math.min(CONTOUR_CORNER_RADIUS, margin);
  return buttonGroupRingFromBoxes(members, margin, radius);
}
