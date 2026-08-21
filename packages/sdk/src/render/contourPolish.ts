/**
 * Shared live + SVG post-pass: button-group rounded wrap when solid,
 * else fillet convex corners and clear own AABBs.
 */
import {
  contourCardClearanceMargin,
  nudgeContourClearOfBoxes,
  type ContourClearBox,
} from './contourClearance.js';
import {
  buttonGroupRingFromBoxes,
  contourButtonGroupMargin,
  memberBoxesInsideRing,
  ringAllowsButtonGroup,
} from './contourButtonGroup.js';
import { CONTOUR_CORNER_RADIUS, filletClosedRing } from './contourFillet.js';

export function polishContourRing(
  points: readonly { x: number; y: number }[],
  boxes: readonly ContourClearBox[],
  strokeWidth: number,
  paddingCells = 0,
): { x: number; y: number }[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));

  const members = memberBoxesInsideRing(points, boxes);
  if (ringAllowsButtonGroup(points, members)) {
    const margin = contourButtonGroupMargin(paddingCells, strokeWidth);
    // Radius must not exceed margin or filleted arcs cut into the cards.
    const radius = Math.min(CONTOUR_CORNER_RADIUS, margin);
    return buttonGroupRingFromBoxes(members, margin, radius);
  }

  const filleted = filletClosedRing(points, CONTOUR_CORNER_RADIUS);
  const clearBoxes = members.length > 0 ? members : boxes;
  if (clearBoxes.length === 0) return filleted;
  const margin = contourCardClearanceMargin(strokeWidth);
  return nudgeContourClearOfBoxes(filleted, clearBoxes, margin);
}
