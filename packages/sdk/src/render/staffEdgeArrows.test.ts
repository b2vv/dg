import { describe, expect, it } from 'vitest';
import { arrowHeadTriangle, shortenPolylineForArrow } from './staffEdgeArrows.js';

describe('staffEdgeArrows', () => {
  it('success: vertical child-below arrow points downward', () => {
    const tri = arrowHeadTriangle({ x: 50, y: 40 }, { x: 50, y: 100 }, 8);
    expect(tri).toBeTruthy();
    expect(tri![0]).toEqual({ x: 50, y: 100 });
    expect(tri![1]!.y).toBeLessThan(100);
    expect(tri![2]!.y).toBeLessThan(100);
    expect(tri![1]!.x).not.toBe(tri![2]!.x);
  });

  it('success: shorten leaves tip room for the arrowhead', () => {
    const pts = shortenPolylineForArrow(
      [
        { x: 0, y: 0 },
        { x: 0, y: 40 },
      ],
      8,
    );
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]!.y).toBeLessThan(40);
    expect(pts[1]!.y).toBeGreaterThan(30);
  });

  it('failure: zero-length segment yields no triangle', () => {
    expect(arrowHeadTriangle({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull();
  });
});
