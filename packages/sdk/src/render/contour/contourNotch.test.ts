import { describe, expect, it } from '@rstest/core';
import {
  intersectRects,
  notchRect,
  notchedRings,
  subtractRects,
  type ContourNotchPoint,
  type ContourRect,
} from './contourNotch.js';

const card = (x: number, y: number): ContourRect => ({ x, y, width: 100, height: 60 });

function pointInsideRing(p: ContourNotchPoint, ring: readonly ContourNotchPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]!;
    const b = ring[j]!;
    const straddles = a.y > p.y !== b.y > p.y;
    if (!straddles) continue;
    const x = ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (p.x < x) inside = !inside;
  }
  return inside;
}

const centerOf = (r: ContourRect): ContourNotchPoint => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});

describe('subtractRects', () => {
  const frame: ContourRect = { x: 0, y: 0, width: 300, height: 200 };

  it('success: no cuts keeps the plain frame', () => {
    expect(subtractRects(frame, [])).toEqual([
      [
        { x: 0, y: 0 },
        { x: 300, y: 0 },
        { x: 300, y: 200 },
        { x: 0, y: 200 },
      ],
    ]);
  });

  it('success: an edge-anchored cut becomes a six-corner notch', () => {
    const rings = subtractRects(frame, [{ x: 200, y: 0, width: 100, height: 80 }]);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toHaveLength(6);
    expect(pointInsideRing({ x: 250, y: 40 }, rings[0]!)).toBe(false);
    expect(pointInsideRing({ x: 250, y: 150 }, rings[0]!)).toBe(true);
  });

  it('success: a cut that spans the frame splits it into two rings', () => {
    const rings = subtractRects(frame, [{ x: 0, y: 90, width: 300, height: 20 }]);
    expect(rings).toHaveLength(2);
    expect(rings.some((r) => pointInsideRing({ x: 150, y: 40 }, r))).toBe(true);
    expect(rings.some((r) => pointInsideRing({ x: 150, y: 160 }, r))).toBe(true);
    expect(rings.some((r) => pointInsideRing({ x: 150, y: 100 }, r))).toBe(false);
  });

  it('failure: a cut outside the frame changes nothing', () => {
    const rings = subtractRects(frame, [{ x: 400, y: 400, width: 50, height: 50 }]);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toHaveLength(4);
  });
});

describe('notchRect (G5 / G6 corridor)', () => {
  const frame: ContourRect = { x: 0, y: 0, width: 300, height: 300 };
  const foreign: ContourRect = { x: 100, y: 100, width: 100, height: 100 };

  it('success: opens right when nothing blocks it (Rust far-side order)', () => {
    const rect = notchRect(foreign, frame, []);
    expect(rect).toEqual({ x: 100, y: 100, width: 200, height: 100 });
  });

  it('success: picks a clear side when own cards block the right corridor', () => {
    const blockingRight: ContourRect = { x: 220, y: 100, width: 60, height: 100 };
    const rect = notchRect(foreign, frame, [blockingRight]);
    expect(rect.x + rect.width).toBeLessThanOrEqual(200 + 1e-6);
  });

  it('failure: fully enclosed foreign still gets the shortest corridor', () => {
    const ring = [
      { x: 220, y: 100, width: 60, height: 100 },
      { x: 20, y: 100, width: 60, height: 100 },
      { x: 100, y: 220, width: 100, height: 60 },
      { x: 100, y: 20, width: 100, height: 60 },
    ];
    const rect = notchRect(foreign, frame, ring);
    // Still reaches an edge — M2 wins over «do not touch own cards».
    const touchesEdge =
      rect.x <= 1e-6 ||
      rect.y <= 1e-6 ||
      Math.abs(rect.x + rect.width - 300) < 1e-6 ||
      Math.abs(rect.y + rect.height - 300) < 1e-6;
    expect(touchesEdge).toBe(true);
  });
});

describe('notchedRings (G2 + M2)', () => {
  it('success: foreign card inside the component frame is never filled (M2)', () => {
    const own = [card(0, 0), card(0, 120), card(240, 120)];
    const foreign = card(240, 0);
    const rings = notchedRings({
      memberBoxes: own,
      foreignBoxes: [foreign],
      margin: 8,
      corridor: 6,
    });
    expect(rings.length).toBeGreaterThan(0);
    for (const ring of rings) {
      expect(pointInsideRing(centerOf(foreign), ring)).toBe(false);
    }
    // Own cards stay inside the wash.
    expect(rings.some((r) => pointInsideRing(centerOf(own[0]!), r))).toBe(true);
    expect(rings.some((r) => pointInsideRing(centerOf(own[2]!), r))).toBe(true);
  });

  it('success: the notch keeps the G2 corridor gap around the foreign card', () => {
    const own = [card(0, 0), card(0, 120), card(240, 120)];
    const foreign = card(240, 0);
    const corridor = 6;
    const [ring] = notchedRings({
      memberBoxes: own,
      foreignBoxes: [foreign],
      margin: 8,
      corridor,
    });
    expect(ring).toBeTruthy();
    // The cut edge sits at least `corridor` away from the foreign card.
    const cutX = Math.min(...ring!.filter((p) => p.y < 60).map((p) => p.x));
    expect(cutX).toBeLessThanOrEqual(foreign.x - corridor + 1e-6);
  });

  it('failure: a foreign card outside the frame leaves a plain rectangle', () => {
    const rings = notchedRings({
      memberBoxes: [card(0, 0)],
      foreignBoxes: [card(1000, 1000)],
      margin: 8,
      corridor: 6,
    });
    expect(rings).toHaveLength(1);
    expect(rings[0]).toHaveLength(4);
  });

  it('failure: no members means no ring', () => {
    expect(notchedRings({ memberBoxes: [], foreignBoxes: [card(0, 0)], margin: 8, corridor: 6 })).toEqual([]);
  });
});

describe('intersectRects', () => {
  it('success: overlapping rects intersect', () => {
    expect(intersectRects({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toEqual({
      x: 5,
      y: 5,
      width: 5,
      height: 5,
    });
  });

  it('failure: touching edges do not count as an intersection', () => {
    expect(intersectRects({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBeNull();
  });
});
