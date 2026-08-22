import { describe, expect, it } from 'vitest';
import { polishContourRing } from './contourPolish.js';
import { maxChordTurn } from './contourFillet.js';

describe('polishContourRing', () => {
  it('success: member row becomes button-group rounded wrap', () => {
    const boxes = [
      { x: 0, y: 0, width: 136, height: 156 },
      { x: 160, y: 0, width: 136, height: 156 },
      { x: 320, y: 0, width: 136, height: 156 },
    ];
    const out = polishContourRing(boxes, 0.9, 1);
    expect(out.length).toBeGreaterThan(4);
    expect(maxChordTurn(out)).toBeLessThan(Math.PI / 2 - 0.05);
  });

  it('failure: empty member list stays empty', () => {
    expect(polishContourRing([], 0.9, 1)).toEqual([]);
  });
});
