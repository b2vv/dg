import { describe, expect, it } from 'vitest';
import { polishContourRing } from './contourPolish.js';
import { maxChordTurn } from './contourFillet.js';

describe('polishContourRing', () => {
  it('success: solid row pad-noise collapses to button-group rounded wrap', () => {
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

  it('success: fillets then clears a card on an L-ring (not button-group)', () => {
    // L-shaped ring with three cards — hole in AABB → no button-group shortcut.
    const ring = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 150 },
      { x: 150, y: 150 },
      { x: 150, y: 300 },
      { x: 0, y: 300 },
    ];
    const boxes = [
      { x: 10, y: 10, width: 120, height: 120 },
      { x: 160, y: 10, width: 120, height: 120 },
      { x: 10, y: 160, width: 120, height: 120 },
    ];
    const out = polishContourRing(ring, boxes, 0.9);
    expect(out.length).toBeGreaterThan(0);
    const box = boxes[0]!;
    let min = Infinity;
    for (const p of out) {
      const dx = Math.max(box.x - p.x, 0, p.x - (box.x + box.width));
      const dy = Math.max(box.y - p.y, 0, p.y - (box.y + box.height));
      min = Math.min(min, Math.hypot(dx, dy));
    }
    expect(min).toBeGreaterThanOrEqual(0.9 / 2 + 6 - 1e-6);
  });

  it('failure: empty ring stays empty', () => {
    expect(polishContourRing([], [], 1)).toEqual([]);
  });
});
