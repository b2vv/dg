import { describe, expect, it } from 'vitest';
import {
  buttonGroupRingFromBoxes,
  contourButtonGroupMargin,
  memberBoxesInsideRing,
  pointInPolygon,
  ringAllowsButtonGroup,
} from './contourButtonGroup.js';
import { maxChordTurn } from './contourFillet.js';

describe('contourButtonGroup', () => {
  const rowBoxes = [
    { x: 0, y: 0, width: 136, height: 156 },
    { x: 160, y: 0, width: 136, height: 156 },
    { x: 320, y: 0, width: 136, height: 156 },
  ];

  /** Orthogonal flood that looks like stairs / noise around the row. */
  const noisyPadRing = [
    { x: -40, y: -40 },
    { x: 100, y: -40 },
    { x: 100, y: -20 },
    { x: 200, y: -20 },
    { x: 200, y: -40 },
    { x: 496, y: -40 },
    { x: 496, y: 196 },
    { x: -40, y: 196 },
  ];

  it('success: solid row becomes a rounded button-group rect (no stair noise)', () => {
    expect(ringAllowsButtonGroup(noisyPadRing, rowBoxes)).toBe(true);
    const ring = buttonGroupRingFromBoxes(rowBoxes, contourButtonGroupMargin(1, 0.9));
    expect(ring.length).toBeGreaterThan(4);
    // Outer corners softened — no hard 90° chord turns.
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
      { x: 160, y: 220, width: 136, height: 156 }, // below — other component
    ];
    const members = memberBoxesInsideRing(topOnly, all);
    expect(members).toHaveLength(3);
  });

  it('failure: L-hole AABB must not become a filled button-group rect', () => {
    // Ring covers an L; member AABB would fill the missing corner.
    const lRing = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 150 },
      { x: 150, y: 150 },
      { x: 150, y: 300 },
      { x: 0, y: 300 },
    ];
    const lBoxes = [
      { x: 10, y: 10, width: 120, height: 120 },
      { x: 160, y: 10, width: 120, height: 120 },
      { x: 10, y: 160, width: 120, height: 120 },
    ];
    expect(ringAllowsButtonGroup(lRing, lBoxes)).toBe(false);
  });
});
