/**
 * Shared live + SVG post-pass: fillet convex corners, then clear own AABBs.
 */
import {
  contourCardClearanceMargin,
  nudgeContourClearOfBoxes,
  type ContourClearBox,
} from './contourClearance.js';
import { CONTOUR_CORNER_RADIUS, filletClosedRing } from './contourFillet.js';

export function polishContourRing(
  points: readonly { x: number; y: number }[],
  boxes: readonly ContourClearBox[],
  strokeWidth: number,
): { x: number; y: number }[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));
  const filleted = filletClosedRing(points, CONTOUR_CORNER_RADIUS);
  if (boxes.length === 0) return filleted;
  const margin = contourCardClearanceMargin(strokeWidth);
  return nudgeContourClearOfBoxes(filleted, boxes, margin);
}
