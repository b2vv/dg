import { describe, expect, it } from '@rstest/core';
import { SpringAnimator, TweenAnimator, createAnimator } from './animators.js';
import { EPS_POS, EPS_VEL, FIXED_DT } from './constants.js';
import { resolveAnimate } from './resolveAnimate.js';
import type { Animator, ResolvedAnimate } from './types.js';

const physics: ResolvedAnimate = { stiffness: 100, damping: 10, mass: 2, fadeMs: 200 };

function stepsToSettle(animator: Animator): number {
  let steps = 0;
  while (!animator.settled && steps < 600) {
    animator.advance(FIXED_DT);
    steps += 1;
  }
  expect(animator.settled).toBe(true);
  return steps;
}

describe('SpringAnimator', () => {
  it('success: integrates a damped spring with mass in seconds', () => {
    const spring = new SpringAnimator(0, physics);
    expect(spring.settled).toBe(true);
    spring.retarget(100);
    spring.advance(0.01);
    expect(spring.value).toBeCloseTo(0.5);
    spring.advance(0.01);
    expect(spring.value).toBeCloseTo(1.4725);
    stepsToSettle(spring);
    expect(Math.abs(spring.value - 100)).toBeLessThan(EPS_POS);
  });

  it('success: snappy settles in fewer fixed steps than gentle', () => {
    const snappy = resolveAnimate('snappy', false);
    const gentle = resolveAnimate('gentle', false);
    if (!snappy || !gentle) throw new Error('Valid presets must resolve');
    const fast = new SpringAnimator(0, snappy);
    const slow = new SpringAnimator(0, gentle);
    fast.retarget(100);
    slow.retarget(100);
    expect(stepsToSettle(fast)).toBeLessThan(stepsToSettle(slow));
  });

  it('success: retarget preserves momentum without a position jump', () => {
    const spring = new SpringAnimator(0, physics);
    const normal = new SpringAnimator(0, physics);
    spring.retarget(100);
    normal.retarget(100);
    spring.advance(0.01);
    normal.advance(0.01);
    const before = spring.value;
    spring.retarget(before);
    expect(spring.value).toBe(before);
    expect(spring.settled).toBe(false);
    spring.advance(0.01);
    normal.advance(0.01);
    expect(spring.value - before).toBeCloseTo(0.475);
    expect(spring.value - before).toBeLessThanOrEqual(normal.value - before);
  });

  it('success: snap resets velocity and sets an explicit value as the new rest point', () => {
    const spring = new SpringAnimator(0, physics);
    spring.retarget(100);
    spring.advance(FIXED_DT);
    spring.snap();
    expect(spring.value).toBe(100);
    expect(spring.settled).toBe(true);
    spring.snap(12);
    spring.advance(FIXED_DT);
    expect(spring.value).toBe(12);
    expect(spring.settled).toBe(true);
  });

  it('failure: position at the threshold is not settled', () => {
    const spring = new SpringAnimator(0, physics);
    spring.retarget(EPS_POS);
    expect(spring.settled).toBe(false);
    spring.retarget(EPS_POS / 2);
    expect(spring.settled).toBe(true);
    const moving = new SpringAnimator(0, { ...physics, stiffness: EPS_VEL * 100, mass: 1, damping: 0 });
    moving.retarget(1);
    moving.advance(0.01);
    moving.retarget(moving.value);
    expect(moving.settled).toBe(false);
  });

  it('failure: huge dt is bounded to one normal step', () => {
    const spring = new SpringAnimator(0, physics);
    const normal = new SpringAnimator(0, physics);
    spring.retarget(100);
    normal.retarget(100);
    spring.advance(Number.MAX_VALUE);
    normal.advance(FIXED_DT);
    expect(spring.value).toBe(normal.value);
  });

  it('failure: extreme finite coordinates and coefficients never poison state', () => {
    const spring = new SpringAnimator(-Number.MAX_VALUE, { ...physics, stiffness: Number.MAX_VALUE, mass: Number.MIN_VALUE });
    spring.retarget(Number.MAX_VALUE);
    for (let i = 0; i < 10; i += 1) {
      spring.advance(FIXED_DT);
      expect(Number.isFinite(spring.value)).toBe(true);
    }
  });
});

describe('TweenAnimator and factory', () => {
  it('success: factory selects spring and tween implementations', () => {
    expect(createAnimator('spring', 0, physics)).toBeInstanceOf(SpringAnimator);
    expect(createAnimator('tween', 0, physics)).toBeInstanceOf(TweenAnimator);
  });

  it('success: fade duration uses milliseconds and ease-out-cubic', () => {
    const tween = new TweenAnimator(0, physics);
    expect(tween.settled).toBe(true);
    tween.retarget(1);
    tween.advance(0.1);
    expect(tween.value).toBeCloseTo(0.875);
    expect(tween.settled).toBe(false);
    tween.advance(0.1);
    expect(tween.value).toBe(1);
    expect(tween.settled).toBe(true);
  });

  it('success: retarget restarts the full duration from current value', () => {
    const tween = new TweenAnimator(0, physics);
    tween.retarget(1);
    tween.advance(0.1);
    tween.retarget(0);
    expect(tween.value).toBe(0.875);
    tween.advance(0.1);
    expect(tween.value).toBeCloseTo(0.109375);
    expect(tween.settled).toBe(false);
    tween.advance(0.1);
    expect(tween.settled).toBe(true);
    tween.snap(2);
    expect(tween.value).toBe(2);
    expect(tween.settled).toBe(true);
    tween.retarget(3);
    tween.snap();
    expect(tween.value).toBe(3);
  });

  it('failure: huge elapsed time finishes exactly at target', () => {
    const tween = createAnimator('tween', 0, physics);
    tween.retarget(1);
    tween.advance(Number.MAX_VALUE);
    expect(tween.value).toBe(1);
    expect(tween.settled).toBe(true);
  });

  it('failure: zero, negative and non-finite steps leave both animators unchanged', () => {
    for (const kind of ['spring', 'tween'] as const) {
      const animator = createAnimator(kind, 0, physics);
      animator.retarget(1);
      for (const dt of [0, -1, NaN, Infinity]) animator.advance(dt);
      expect(animator.value).toBe(0);
      expect(animator.settled).toBe(false);
    }
  });
});
