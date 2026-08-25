import { describe, expect, it } from 'vitest';
import {
  buttonGroupRingFromBoxes,
  contourButtonGroupMargin,
} from './contourButtonGroup.js';
import { maxChordTurn } from './contourFillet.js';
import { polishContourRings } from './contourPolish.js';

function ringWidth(ring: readonly { x: number; y: number }[]): number {
  return Math.max(...ring.map((p) => p.x)) - Math.min(...ring.map((p) => p.x));
}

describe('contourButtonGroup', () => {
  const rowBoxes = [
    { x: 0, y: 0, width: 136, height: 156 },
    { x: 160, y: 0, width: 136, height: 156 },
    { x: 320, y: 0, width: 136, height: 156 },
  ];

  it('success: row becomes a rounded button-group rect', () => {
    const ring = buttonGroupRingFromBoxes(rowBoxes, contourButtonGroupMargin(1, 0.9));
    expect(ring.length).toBeGreaterThan(4);
    expect(maxChordTurn(ring)).toBeLessThan(Math.PI / 2 - 0.05);
  });

  it('failure: empty boxes yield an empty ring', () => {
    expect(buttonGroupRingFromBoxes([], 8)).toEqual([]);
  });

  it('documented skip G5–G7: L-shape union AABB covers the missing corner (T78-L8)', () => {
    const L = [
      { x: 0, y: 0, width: 100, height: 40 },
      { x: 0, y: 40, width: 40, height: 40 },
    ];
    const ring = buttonGroupRingFromBoxes(L, 0);
    const xs = ring.map((p) => p.x);
    const ys = ring.map((p) => p.y);
    expect(Math.min(...xs)).toBeLessThanOrEqual(0);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(100);
    expect(Math.min(...ys)).toBeLessThanOrEqual(0);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(80);
    // Empty L-corner (80, 60) is inside the wash — canvas does not notch G5–G7.
    expect(Math.min(...xs) <= 80 && 80 <= Math.max(...xs)).toBe(true);
    expect(Math.min(...ys) <= 60 && 60 <= Math.max(...ys)).toBe(true);
  });
});

describe('polishContourRings padding', () => {
  it('success: padding increases outer width on a row cluster', () => {
    const boxes = [
      { x: 0, y: 0, width: 136, height: 156 },
      { x: 160, y: 0, width: 136, height: 156 },
    ];
    expect(ringWidth((polishContourRings({ memberBoxes: boxes, strokeWidth: 0.9, paddingCells: 2 })[0] ?? []))).toBeGreaterThan(
      ringWidth((polishContourRings({ memberBoxes: boxes, strokeWidth: 0.9, paddingCells: 0 })[0] ?? [])) + 10,
    );
  });
});
