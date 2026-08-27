import { describe, expect, it, rstest } from '@rstest/core';
import {
  easeOutCubic,
  lerpClosedRings,
  resampleClosedRing,
  rotateRingToAlign,
  runPointMorph,
} from './contourMorph.js';

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

const shifted = [
  { x: 20, y: 10 },
  { x: 120, y: 10 },
  { x: 120, y: 110 },
  { x: 20, y: 110 },
];

describe('contourMorph', () => {
  it('success: resampleClosedRing yields requested count', () => {
    const pts = resampleClosedRing(square, 16);
    expect(pts).toHaveLength(16);
    expect(pts[0]!.x).toBeCloseTo(0, 5);
    expect(pts[0]!.y).toBeCloseTo(0, 5);
  });

  it('success: lerpClosedRings at 0/1 matches endpoints', () => {
    const a = lerpClosedRings(square, shifted, 0, 12);
    const b = lerpClosedRings(square, shifted, 1, 12);
    expect(a[0]).toEqual(resampleClosedRing(square, 12)[0]);
    const aligned = rotateRingToAlign(resampleClosedRing(square, 12), resampleClosedRing(shifted, 12));
    expect(b[0]!.x).toBeCloseTo(aligned[0]!.x, 5);
    expect(b[0]!.y).toBeCloseTo(aligned[0]!.y, 5);
  });

  it('success: mid lerp sits between', () => {
    const mid = lerpClosedRings(square, shifted, 0.5, 8);
    const from = resampleClosedRing(square, 8);
    expect(mid[0]!.x).toBeGreaterThan(from[0]!.x);
    expect(mid[0]!.x).toBeLessThan(from[0]!.x + 20);
  });

  it('success: runPointMorph reaches target and can cancel', async () => {
    const frames: number[] = [];
    let time = 0;
    const queue: Array<(t: number) => void> = [];
    const handle = runPointMorph({
      from: square,
      to: shifted,
      durationMs: 100,
      sampleCount: 8,
      now: () => time,
      requestFrame: (cb) => {
        queue.push(cb);
        return queue.length;
      },
      cancelFrame: () => {
        queue.length = 0;
      },
      onUpdate: (pts) => {
        frames.push(pts[0]!.x);
      },
    });

    while (queue.length > 0) {
      time += 40;
      const cb = queue.shift()!;
      cb(time);
    }
    await handle.done;
    expect(frames.length).toBeGreaterThan(1);
    expect(frames[frames.length - 1]).toBeCloseTo(
      rotateRingToAlign(resampleClosedRing(square, 8), resampleClosedRing(shifted, 8))[0]!.x,
      5,
    );

    const cancelled: number[] = [];
    time = 0;
    const queue2: Array<(t: number) => void> = [];
    const h2 = runPointMorph({
      from: square,
      to: shifted,
      durationMs: 200,
      now: () => time,
      requestFrame: (cb) => {
        queue2.push(cb);
        return 1;
      },
      cancelFrame: rstest.fn(),
      onUpdate: (pts) => cancelled.push(pts[0]!.x),
    });
    time = 20;
    queue2.shift()?.(time);
    h2.cancel();
    await h2.done;
    expect(cancelled.length).toBeGreaterThan(0);
  });

  it('failure: empty from ring still produces samples', () => {
    const pts = resampleClosedRing([], 4);
    expect(pts).toHaveLength(4);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(-1)).toBe(0);
  });
});
