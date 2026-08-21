import { describe, expect, it } from 'vitest';
import {
  contourCardClearanceMargin,
  inflateClosedRing,
  nudgeContourClearOfBoxes,
} from './contourClearance.js';

function minClearanceToBox(
  pts: { x: number; y: number }[],
  box: { x: number; y: number; width: number; height: number },
): number {
  let min = Infinity;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    for (let s = 0; s <= 8; s += 1) {
      const t = s / 8;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const dx = Math.max(box.x - x, 0, x - (box.x + box.width));
      const dy = Math.max(box.y - y, 0, y - (box.y + box.height));
      min = Math.min(min, Math.hypot(dx, dy));
    }
  }
  return min;
}

describe('nudgeContourClearOfBoxes', () => {
  it('success: grows a ring that clips a card until clearance ≥ margin', () => {
    // Card inside a larger clockwise frame; one edge dips into the card.
    const box = { x: 40, y: 40, width: 40, height: 40 };
    const margin = 4;
    const ring = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 120 },
      { x: 0, y: 120 },
      // dip: chord through the card
      { x: 0, y: 60 },
      { x: 50, y: 60 },
      { x: 0, y: 70 },
    ];
    expect(minClearanceToBox(ring, box)).toBe(0);
    const out = nudgeContourClearOfBoxes(ring, [box], margin);
    expect(minClearanceToBox(out, box)).toBeGreaterThanOrEqual(margin);
  });

  it('failure: empty boxes leaves ring unchanged', () => {
    const ring = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(nudgeContourClearOfBoxes(ring, [], 2)).toEqual(ring);
  });

  it('success: margin includes stroke half + 2px inset', () => {
    expect(contourCardClearanceMargin(1.25)).toBeCloseTo(2.625);
  });

  it('success: clockwise square inflates outward', () => {
    const sq = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const out = inflateClosedRing(sq, 10);
    const xs = out.map((p) => p.x);
    const ys = out.map((p) => p.y);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(100);
    expect(Math.min(...ys)).toBeLessThan(0);
    expect(Math.max(...ys)).toBeGreaterThan(100);
  });
});
