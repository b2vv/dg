import { describe, expect, it } from 'vitest';
import { polishContourRing } from './contourPolish.js';
import { maxChordTurn } from './contourFillet.js';

describe('polishContourRing', () => {
  it('success: any component ring collapses to button-group rounded wrap', () => {
    const noisy = [
      { x: -40, y: -40 },
      { x: 100, y: -40 },
      { x: 100, y: -20 },
      { x: 200, y: -20 },
      { x: 200, y: -40 },
      { x: 496, y: -40 },
      { x: 496, y: 196 },
      { x: -40, y: 196 },
    ];
    const boxes = [
      { x: 0, y: 0, width: 136, height: 156 },
      { x: 160, y: 0, width: 136, height: 156 },
      { x: 320, y: 0, width: 136, height: 156 },
    ];
    const out = polishContourRing(noisy, boxes, 0.9, 1);
    expect(out.length).toBeGreaterThan(4);
    expect(maxChordTurn(out)).toBeLessThan(Math.PI / 2 - 0.05);
  });

  it('failure: empty ring stays empty', () => {
    expect(polishContourRing([], [], 1)).toEqual([]);
  });

  it('failure: ring with no member cards paints nothing', () => {
    const ring = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const elsewhere = [{ x: 500, y: 500, width: 40, height: 40 }];
    expect(polishContourRing(ring, elsewhere, 0.9)).toEqual([]);
  });
});
