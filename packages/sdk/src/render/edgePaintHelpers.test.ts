import { describe, expect, it } from 'vitest';
import { drawEdgeEndDots, traceRoundedPolyline } from './staffEdgeArrows.js';
import { roundedRectRing } from './DepartmentCardView.js';
import { routerObstacle } from './staffEdgeGeometry.js';
import { estimateTextWidth } from './orgCardChrome.js';

/** Minimal Graphics stand-in — records the calls the painters emit. */
function recorder() {
  const calls: string[] = [];
  return {
    calls,
    moveTo: (x: number, y: number) => calls.push(`M${x},${y}`),
    lineTo: (x: number, y: number) => calls.push(`L${x},${y}`),
    arcTo: (x1: number, y1: number, x2: number, y2: number, r: number) =>
      calls.push(`A${x1},${y1},${x2},${y2},${r}`),
    circle: (x: number, y: number, r: number) => calls.push(`C${x},${y},${r}`),
    fill: () => calls.push('F'),
  };
}

describe('traceRoundedPolyline', () => {
  const elbow = [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 100 },
  ];

  it('success: radius 0 keeps square corners', () => {
    const g = recorder();
    traceRoundedPolyline(g, elbow, 0);
    expect(g.calls).toEqual(['M0,0', 'L0,100', 'L100,100']);
  });

  it('success: positive radius rounds the interior corner', () => {
    const g = recorder();
    traceRoundedPolyline(g, elbow, 8);
    expect(g.calls).toEqual(['M0,0', 'A0,100,100,100,8', 'L100,100']);
  });

  it('failure: fewer than two points paints nothing', () => {
    const g = recorder();
    traceRoundedPolyline(g, [{ x: 1, y: 1 }], 8);
    expect(g.calls).toEqual([]);
  });

  it('failure: corner shorter than the radius falls back to a square corner', () => {
    const g = recorder();
    traceRoundedPolyline(
      g,
      [
        { x: 0, y: 0 },
        { x: 0, y: 0.4 },
        { x: 4, y: 0.4 },
      ],
      8,
    );
    expect(g.calls).toEqual(['M0,0', 'L0,0.4', 'L4,0.4']);
  });
});

describe('drawEdgeEndDots', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];

  it('success: one dot per port, filled once', () => {
    const g = recorder();
    drawEdgeEndDots(g, pts, 0xa6a6a6, 2.5);
    expect(g.calls).toEqual(['C0,0,2.5', 'C10,0,2.5', 'F']);
  });

  it('failure: radius 0 or an empty route paints nothing', () => {
    const zero = recorder();
    drawEdgeEndDots(zero, pts, 0xa6a6a6, 0);
    expect(zero.calls).toEqual([]);
    const empty = recorder();
    drawEdgeEndDots(empty, [], 0xa6a6a6, 2.5);
    expect(empty.calls).toEqual([]);
  });
});

describe('roundedRectRing', () => {
  const rect = { x: 0, y: 0, width: 100, height: 60 };

  it('success: radius 0 is the four rect corners', () => {
    expect(roundedRectRing(rect, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 60 },
      { x: 0, y: 60 },
    ]);
  });

  it('success: rounded ring stays inside the rect and skips the sharp corners', () => {
    const ring = roundedRectRing(rect, 12, 4);
    expect(ring.length).toBeGreaterThan(4);
    for (const p of ring) {
      expect(p.x).toBeGreaterThanOrEqual(-1e-6);
      expect(p.x).toBeLessThanOrEqual(100 + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(-1e-6);
      expect(p.y).toBeLessThanOrEqual(60 + 1e-6);
    }
    expect(ring.some((p) => p.x === 0 && p.y === 0)).toBe(false);
  });

  it('failure: radius larger than half the box is clamped, not inverted', () => {
    const ring = roundedRectRing({ x: 0, y: 0, width: 20, height: 20 }, 999, 2);
    for (const p of ring) {
      expect(p.x).toBeGreaterThanOrEqual(-1e-6);
      expect(p.x).toBeLessThanOrEqual(20 + 1e-6);
    }
  });
});

describe('routerObstacle', () => {
  const box = { id: 'p1', x: 10, y: 20, width: 40, height: 40 };

  it('success: falls back to the port box when no obstacle is declared', () => {
    expect(routerObstacle(box)).toEqual({ x: 10, y: 20, width: 40, height: 40 });
  });

  it('success: declared obstacle wins and carries no port identity', () => {
    const rect = routerObstacle({
      ...box,
      obstacle: { x: 0, y: 18, width: 248, height: 44 },
    });
    expect(rect).toEqual({ x: 0, y: 18, width: 248, height: 44 });
    expect('id' in rect).toBe(false);
  });
});

describe('estimateTextWidth', () => {
  it('success: scales with glyph count and font size', () => {
    expect(estimateTextWidth('abcd', 10)).toBeCloseTo(22, 5);
    expect(estimateTextWidth('abcd', 20)).toBeCloseTo(44, 5);
  });

  it('failure: empty text has no width', () => {
    expect(estimateTextWidth('', 16)).toBe(0);
  });
});
