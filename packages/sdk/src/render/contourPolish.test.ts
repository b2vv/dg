import { describe, expect, it } from 'vitest';
import { polishContourRing } from './contourPolish.js';

describe('polishContourRing', () => {
  it('success: fillets then clears a card that sits on a sharp corner', () => {
    const ring = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 120 },
      { x: 0, y: 120 },
    ];
    const box = { x: 100, y: 100, width: 40, height: 40 };
    const out = polishContourRing(ring, [box], 0.9);
    expect(out.length).toBeGreaterThan(ring.length);
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
