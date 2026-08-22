/**
 * Paint-only polish: button-group rounded wrap around cluster member cards.
 * Padding / smooth here — not in Rust flood (no L/C path).
 */
import type { ContourClearBox } from './contourClearance.js';
import {
  buttonGroupRingFromBoxes,
  contourButtonGroupMargin,
} from './contourButtonGroup.js';
import { CONTOUR_CORNER_RADIUS } from './contourFillet.js';

export function polishContourRing(
  memberBoxes: readonly ContourClearBox[],
  strokeWidth: number,
  paddingCells = 0,
  smoothIterations = 0,
): { x: number; y: number }[] {
  if (memberBoxes.length === 0) return [];

  const margin = contourButtonGroupMargin(paddingCells, strokeWidth);
  const radius = Math.min(CONTOUR_CORNER_RADIUS, margin);
  const arcSegments = Math.max(2, 2 + Math.max(0, Math.floor(smoothIterations)));
  return buttonGroupRingFromBoxes(memberBoxes, margin, radius, arcSegments);
}
