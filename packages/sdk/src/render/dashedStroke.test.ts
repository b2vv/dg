import { Graphics } from 'pixi.js';
import { describe, expect, it, rstest } from '@rstest/core';
import { roundedRectRing, strokeDashedRing } from './dashedStroke.js';

const rect = { x: 0, y: 0, width: 40, height: 20 };

describe('dashedStroke', () => {
  it('success: a zero radius gives the four corners, in order', () => {
    expect(roundedRectRing(rect, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 20 },
      { x: 0, y: 20 },
    ]);
  });

  it('success: a radius is clamped to half the shorter side', () => {
    const ring = roundedRectRing({ x: 0, y: 0, width: 20, height: 20 }, 999, 2);
    for (const p of ring) {
      expect(p.x).toBeGreaterThanOrEqual(-0.001);
      expect(p.x).toBeLessThanOrEqual(20.001);
      expect(p.y).toBeGreaterThanOrEqual(-0.001);
      expect(p.y).toBeLessThanOrEqual(20.001);
    }
  });

  it('success: dashes cover the dash/(dash+gap) share of the perimeter', () => {
    const g = new Graphics();
    const from: Array<[number, number]> = [];
    const to: Array<[number, number]> = [];
    rstest.spyOn(g, 'moveTo').mockImplementation((x: number, y: number) => {
      from.push([x, y]);
      return g;
    });
    rstest.spyOn(g, 'lineTo').mockImplementation((x: number, y: number) => {
      to.push([x, y]);
      return g;
    });

    strokeDashedRing(g, roundedRectRing(rect, 0), 5, 3);

    const drawn = from.reduce(
      (sum, [x, y], i) => sum + Math.hypot(to[i]![0] - x, to[i]![1] - y),
      0,
    );
    // Perimeter 120, so 5/8 of it is ink. Phase carries across corners, which
    // splits a straddling dash into two chords but does not add length.
    expect(drawn).toBeCloseTo((2 * (40 + 20) * 5) / 8, 5);
  });

  it('failure: a degenerate ring draws nothing instead of looping forever', () => {
    const g = new Graphics();
    const moves = rstest.spyOn(g, 'moveTo');
    strokeDashedRing(g, [{ x: 5, y: 5 }], 5, 3);
    strokeDashedRing(g, [], 5, 3);
    expect(moves).not.toHaveBeenCalled();
  });
});
