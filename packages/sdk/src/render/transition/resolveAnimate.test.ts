import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { FADE_MS } from './constants.js';
import { resolveAnimate } from './resolveAnimate.js';
import type { AnimateOption } from './types.js';

afterEach(() => { rs.restoreAllMocks(); });

describe('resolveAnimate', () => {
  it('success: smooth and the equivalent perceptual form resolve identically', () => {
    const smooth = resolveAnimate(true, false);
    expect(smooth).toEqual(resolveAnimate('smooth', false));
    expect(smooth).toEqual(resolveAnimate({ duration: 0.4, bounce: 0.1 }, false));
    expect(smooth?.stiffness).toBeCloseTo(246.740110027234);
    expect(smooth?.damping).toBeCloseTo(28.274333882308);
    expect(smooth?.mass).toBe(1);
    expect(smooth?.fadeMs).toBe(FADE_MS);
  });

  it('success: physical values are preserved and mass defaults to one', () => {
    expect(resolveAnimate({ stiffness: 120, damping: 0 }, false)).toEqual({ stiffness: 120, damping: 0, mass: 1, fadeMs: FADE_MS });
    expect(resolveAnimate({ stiffness: 120, damping: 12, mass: 2 }, false)).toEqual({ stiffness: 120, damping: 12, mass: 2, fadeMs: FADE_MS });
  });

  it('success: bounce defaults to zero and clamps at both ends', () => {
    expect(resolveAnimate({ duration: 1 }, false)).toEqual(resolveAnimate({ duration: 1, bounce: 0 }, false));
    expect(resolveAnimate({ duration: 1, bounce: -2 }, false)).toEqual(resolveAnimate({ duration: 1, bounce: 0 }, false));
    expect(resolveAnimate({ duration: 1, bounce: 2 }, false)).toEqual(resolveAnimate({ duration: 1, bounce: 0.9 }, false));
  });

  it('success: disabled and reduced motion options are quiet', () => {
    const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
    for (const option of [undefined, false, 'instant'] as const) expect(resolveAnimate(option, false)).toBeNull();
    for (const option of [true, 'snappy', 'gentle', { duration: 1 }] as const) expect(resolveAnimate(option, true)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  const invalid: unknown[] = [
    null, 42, [], {}, 'unknown', 'toString', { duration: 0 }, { duration: -1 },
    { duration: NaN }, { duration: Infinity }, { duration: '1' },
    { duration: 1, bounce: NaN }, { duration: 1, bounce: Infinity }, { duration: 1, bounce: '0' },
    { stiffness: 0, damping: 2 }, { stiffness: -1, damping: 2 }, { stiffness: Infinity, damping: 2 },
    { stiffness: NaN, damping: 2 }, { stiffness: 1, damping: -1 }, { stiffness: 1, damping: Infinity },
    { stiffness: 1, damping: NaN }, { stiffness: 1 }, { stiffness: 1, damping: 1, mass: 0 },
    { stiffness: 1, damping: 1, mass: -1 }, { stiffness: 1, damping: 1, mass: Infinity },
    { stiffness: 1, damping: 1, mass: NaN }, { stiffness: 1, damping: 1, mass: '1' },
    { duration: Number.MIN_VALUE }, { duration: Number.MAX_VALUE },
  ];
  it.each(invalid.map((option) => ({ option })))('failure: invalid option %j disables animation with exactly one warning', ({ option }) => {
    const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
    // Simulates untyped host configuration at the SDK boundary.
    expect(resolveAnimate(option as AnimateOption, false)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toEqual([expect.stringContaining('animate'), option]);
  });
});
