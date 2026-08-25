/**
 * Paint-only polish: rounded wrap around one magnetic component.
 * Padding / smooth here — not in Rust flood (no L/C path).
 */
import type { ContourClearBox } from './contourClearance.js';
import {
  buttonGroupRingFromBoxes,
  contourButtonGroupMargin,
} from './contourButtonGroup.js';
import { CONTOUR_CORNER_RADIUS, filletClosedRing, type ContourPoint } from './contourFillet.js';
import { notchedRings } from './contourNotch.js';

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

export interface PolishContourInput {
  /** Cards of one magnetic component. */
  memberBoxes: readonly ContourClearBox[];
  /** Every other card on the canvas (other departments and other components). */
  foreignBoxes?: readonly ContourClearBox[];
  strokeWidth: number;
  /** Demo Padding slider — px margin around the component's own cards. */
  paddingCells?: number;
  smoothIterations?: number;
  /**
   * G2 gap kept from a foreign card, in px. Defaults to the wash margin, so a
   * contour never hugs a foreign card tighter than it hugs its own.
   */
  corridorPx?: number;
}

/**
 * Component wash with foreign cards notched out (G2 / M2). Without foreign
 * cards inside the frame this is the plain button-group ring, so the result
 * matches {@link polishContourRing}; a cut that splits the frame returns one
 * ring per remaining part.
 */
export function polishContourRings(input: PolishContourInput): ContourPoint[][] {
  if (input.memberBoxes.length === 0) return [];
  const margin = contourButtonGroupMargin(input.paddingCells ?? 0, input.strokeWidth);
  const radius = Math.min(CONTOUR_CORNER_RADIUS, margin);
  const arcSegments = Math.max(2, 2 + Math.max(0, Math.floor(input.smoothIterations ?? 0)));
  const foreign = input.foreignBoxes ?? [];
  if (foreign.length === 0) {
    const ring = buttonGroupRingFromBoxes(input.memberBoxes, margin, radius, arcSegments);
    return ring.length >= 2 ? [ring] : [];
  }
  return notchedRings({
    memberBoxes: input.memberBoxes,
    foreignBoxes: foreign,
    margin,
    corridor: Math.max(margin, input.corridorPx ?? margin),
  })
    .map((ring) => filletClosedRing(ring, Math.min(radius, margin), arcSegments))
    .filter((ring) => ring.length >= 2);
}
