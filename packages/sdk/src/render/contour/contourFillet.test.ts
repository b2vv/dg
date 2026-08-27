import { describe, expect, it } from '@rstest/core';
import {
  CONTOUR_CORNER_RADIUS,
  filletClosedRing,
  maxChordTurn,
} from './contourFillet.js';

describe('filletClosedRing', () => {
  it('success: square convex corners become softer than 90° chords', () => {
    const sq = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(maxChordTurn(sq)).toBeCloseTo(Math.PI / 2, 5);
    const out = filletClosedRing(sq, CONTOUR_CORNER_RADIUS, 5);
    expect(out.length).toBeGreaterThan(sq.length);
    expect(maxChordTurn(out)).toBeLessThan(Math.PI / 2 - 0.15);
    // Sharp corners removed from the ring.
    expect(out.some((p) => p.x === 0 && p.y === 0)).toBe(false);
  });

  it('success: concave notch corner stays sharp', () => {
    // C-like: outer CCW square with a right-side notch (concave at (80,40)/(80,60)).
    const notch = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 40 },
      { x: 80, y: 40 },
      { x: 80, y: 60 },
      { x: 100, y: 60 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const out = filletClosedRing(notch, 10, 4);
    // The two notch reentrants should still appear (within 1px) — not arced away.
    const near = (x: number, y: number) =>
      out.some((p) => Math.hypot(p.x - x, p.y - y) < 1.5);
    expect(near(80, 40) || near(80, 60)).toBe(true);
  });

  it('failure: tiny radius or short ring is a no-op copy', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    expect(filletClosedRing(pts, 10)).toEqual(pts);
    const sq = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(filletClosedRing(sq, 0)).toEqual(sq);
  });

  it('success: octagon 45° corners trim r·tan(φ/2), not r/tan(φ/2)', () => {
    const R = 80;
    const oct = Array.from({ length: 8 }, (_, i) => {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      return { x: Math.cos(a) * R, y: Math.sin(a) * R };
    });
    const radius = 10;
    const phi = Math.PI / 4;
    const expectedTrim = radius * Math.tan(phi / 2);
    const invertedTrim = radius / Math.tan(phi / 2);
    const out = filletClosedRing(oct, radius, 4);
    expect(invertedTrim).toBeGreaterThan(expectedTrim + 10);
    const n = oct.length;
    for (let i = 0; i < n; i += 1) {
      const curr = oct[i]!;
      const next = oct[(i + 1) % n]!;
      const len = Math.hypot(next.x - curr.x, next.y - curr.y);
      const ux = (next.x - curr.x) / len;
      const uy = (next.y - curr.y) / len;
      const onEdge = (dist: number) => ({ x: curr.x + ux * dist, y: curr.y + uy * dist });
      const expected = onEdge(expectedTrim);
      const inverted = onEdge(invertedTrim);
      const near = (target: { x: number; y: number }) =>
        out.some((p) => Math.hypot(p.x - target.x, p.y - target.y) < 1.5);
      expect(near(expected)).toBe(true);
      expect(near(inverted)).toBe(false);
    }
  });
});
