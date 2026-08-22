import { describe, expect, it } from 'vitest';
import {
  buttonGroupRingFromBoxes,
  contourButtonGroupMargin,
} from './contourButtonGroup.js';
import { maxChordTurn } from './contourFillet.js';
import { polishContourRing } from './contourPolish.js';

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
});

describe('polishContourRing padding', () => {
  it('success: padding increases outer width on a row cluster', () => {
    const boxes = [
      { x: 0, y: 0, width: 136, height: 156 },
      { x: 160, y: 0, width: 136, height: 156 },
    ];
    expect(ringWidth(polishContourRing(boxes, 0.9, 2))).toBeGreaterThan(
      ringWidth(polishContourRing(boxes, 0.9, 0)) + 10,
    );
  });
});
