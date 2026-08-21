import { describe, expect, it } from 'vitest';
import {
  buttonGroupRingFromBoxes,
  contourButtonGroupMargin,
  memberBoxesInsideRing,
  pointInPolygon,
} from './contourButtonGroup.js';
import { maxChordTurn } from './contourFillet.js';

describe('contourButtonGroup', () => {
  const rowBoxes = [
    { x: 0, y: 0, width: 136, height: 156 },
    { x: 160, y: 0, width: 136, height: 156 },
    { x: 320, y: 0, width: 136, height: 156 },
  ];

  it('success: row becomes a rounded button-group rect (no stair noise)', () => {
    const ring = buttonGroupRingFromBoxes(rowBoxes, contourButtonGroupMargin(1, 0.9));
    expect(ring.length).toBeGreaterThan(4);
    expect(maxChordTurn(ring)).toBeLessThan(Math.PI / 2 - 0.05);
    expect(pointInPolygon(68, 78, ring)).toBe(true);
    expect(pointInPolygon(388, 78, ring)).toBe(true);
  });

  it('success: members are only cards whose centers sit in the component ring', () => {
    const topOnly = [
      { x: -10, y: -10 },
      { x: 470, y: -10 },
      { x: 470, y: 170 },
      { x: -10, y: 170 },
    ];
    const all = [
      ...rowBoxes,
      { x: 160, y: 220, width: 136, height: 156 },
    ];
    const members = memberBoxesInsideRing(topOnly, all);
    expect(members).toHaveLength(3);
  });

  it('failure: empty boxes yield an empty ring', () => {
    expect(buttonGroupRingFromBoxes([], 8)).toEqual([]);
  });
});
