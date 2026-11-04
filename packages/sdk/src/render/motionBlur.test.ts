import { describe, expect, it } from '@rstest/core';
import { motionBlurPx, defaultMotionBlurOptions } from './motionBlur.js';

// Expected values are hand-computed from the linear ramp with explicit thresholds
// (minSpeed 0.5, maxSpeed 3, maxPx 6), not recomputed the way the code does.
const opts = { maxPx: 6, minSpeed: 0.5, maxSpeed: 3 };

describe('motionBlurPx', () => {
  it('dead zone: at or below minSpeed stays sharp (0)', () => {
    expect(motionBlurPx(0, opts)).toBe(0);
    expect(motionBlurPx(0.5, opts)).toBe(0);
    expect(motionBlurPx(0.3, opts)).toBe(0);
  });

  it('ramps linearly between thresholds', () => {
    // midpoint of [0.5, 3] is 1.75 → half of maxPx = 3
    expect(motionBlurPx(1.75, opts)).toBeCloseTo(3, 5);
    // a quarter up: speed 1.125 → 0.25 * 6 = 1.5
    expect(motionBlurPx(1.125, opts)).toBeCloseTo(1.5, 5);
  });

  it('caps at maxPx for fast flings', () => {
    expect(motionBlurPx(3, opts)).toBe(6);
    expect(motionBlurPx(10, opts)).toBe(6);
  });

  it('guards non-finite / negative speed as 0', () => {
    expect(motionBlurPx(Number.NaN, opts)).toBe(0);
    expect(motionBlurPx(-5, opts)).toBe(0);
    expect(motionBlurPx(Number.POSITIVE_INFINITY, opts)).toBe(6);
  });

  it('defaults are sane (dead zone at 0 speed, capped)', () => {
    expect(motionBlurPx(0, defaultMotionBlurOptions)).toBe(0);
    expect(motionBlurPx(100, defaultMotionBlurOptions)).toBe(defaultMotionBlurOptions.maxPx);
  });
});
