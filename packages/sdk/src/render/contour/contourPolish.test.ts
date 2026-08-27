import { describe, expect, it } from '@rstest/core';
import { polishContourRings } from './contourPolish.js';
import { maxChordTurn } from './contourFillet.js';

describe('polishContourRings', () => {
  it('success: member row becomes button-group rounded wrap', () => {
    const boxes = [
      { x: 0, y: 0, width: 136, height: 156 },
      { x: 160, y: 0, width: 136, height: 156 },
      { x: 320, y: 0, width: 136, height: 156 },
    ];
    const out = (polishContourRings({ memberBoxes: boxes, strokeWidth: 0.9, paddingCells: 1 })[0] ?? []);
    expect(out.length).toBeGreaterThan(4);
    expect(maxChordTurn(out)).toBeLessThan(Math.PI / 2 - 0.05);
  });

  it('failure: empty member list stays empty', () => {
    expect((polishContourRings({ memberBoxes: [], strokeWidth: 0.9, paddingCells: 1 })[0] ?? [])).toEqual([]);
  });
});
