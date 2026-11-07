import { describe, expect, it, rs } from '@rstest/core';
import { createAnimator as realCreateAnimator } from './animators.js';
import { TransitionController } from './TransitionController.js';
import { FIXED_DT, MAX_STEPS_PER_FRAME } from './constants.js';
import type { Animator, AnimatorFactory, FrameClock, TargetBox } from './types.js';

class LinearAnimator implements Animator {
  target: number;
  steps: number[] = [];
  velocity = 0;
  constructor(public value: number, private stuck = false, private speed = 1) { this.target = value; }
  get settled(): boolean { return this.value === this.target; }
  retarget(target: number): void { this.target = target; }
  snap(value = this.target): void { this.value = value; this.target = value; this.velocity = 0; }
  advance(dt: number): void {
    this.steps.push(dt);
    if (this.stuck || this.settled) return;
    this.velocity += dt * 60 * this.speed;
    const delta = this.target - this.value;
    this.value += Math.sign(delta) * Math.min(Math.abs(delta), this.velocity);
  }
}

function setup(options: { maxNodes?: number; settleCapMs?: number; stuck?: boolean; createAnimator?: AnimatorFactory } = {}) {
  let time = 0;
  let id = 0;
  const pending = new Map<number, (t: number) => void>();
  const clock: FrameClock = {
    now: () => time,
    requestFrame(cb) { pending.set(++id, cb); return id; },
    cancelFrame(handle) { pending.delete(handle); },
  };
  const made: { kind: string; animator: LinearAnimator }[] = [];
  const createAnimator: AnimatorFactory = (kind, initial) => {
    const animator = new LinearAnimator(initial, options.stuck, kind === 'tween' ? 0.1 : 1);
    made.push({ kind, animator });
    return animator;
  };
  const controller = new TransitionController({
    resolved: { stiffness: 100, damping: 20, mass: 1, fadeMs: 200 },
    clock, createAnimator, ...options,
  });
  const tick = (ms = 17) => {
    time += ms;
    const callbacks = [...pending.values()];
    pending.clear();
    for (const cb of callbacks) cb(time);
  };
  const finish = () => {
    for (let n = 0; pending.size > 0 && n < 100; n++) tick();
    expect(pending.size).toBe(0);
  };
  const seed = (targets: TargetBox[] = [box('person:a')]) => {
    controller.prepare(targets, { animate: true });
    controller.confirm();
  };
  return { controller, pending, made, tick, finish, seed, requests: () => id };
}

function box(key: string, x = 0, y = 0, w = 20, h = 10): TargetBox {
  return { key, x, y, w, h };
}

describe('TransitionController', () => {
  it('success: initial, unchanged and size-only frames need no animation', () => {
    const { controller: c, seed, pending } = setup();
    seed(); c.start();
    expect(c.frame().get('person:a')).toEqual({ ...box('person:a'), scale: 1, opacity: 1, phase: 'idle' });
    c.prepare([box('person:a')], { animate: true }); c.start();
    expect(pending.size).toBe(0);
    c.prepare([box('person:a', 0, 0, 80, 90)], { animate: true }); c.start();
    expect(c.frame().get('person:a')?.w).toBe(80);
    expect(c.isActive()).toBe(false);
    expect(pending.size).toBe(0);
  });

  it('success: unchanged targets with real animators request zero frames', () => {
    const { controller: c, seed, finish, pending, requests } = setup({ createAnimator: realCreateAnimator });
    seed([box('person:a')]);
    const targets = [box('person:a', 100), box('person:b', 40)];
    c.prepare(targets, { animate: true });
    expect(c.isActive()).toBe(true);
    c.start();
    finish();
    expect(c.isActive()).toBe(false);
    expect(requests()).toBeGreaterThan(0);
    c.confirm();

    const before = requests();
    c.prepare(targets, { animate: true });
    expect(c.isActive()).toBe(false);
    c.start();
    expect(requests() - before).toBe(0);
    expect(pending.size).toBe(0);
  });

  it('success: diff enters, updates and exits by kind:id; prepare schedules nothing', () => {
    const { controller: c, seed, pending, made, finish } = setup();
    seed([box('person:a'), box('person:b', 40)]);
    c.prepare([box('person:a', 100, 50, 90, 30), box('position:a', 70)], { animate: true });
    expect(pending.size).toBe(0);
    expect(c.frame().get('person:a')).toEqual({ ...box('person:a', 0, 0, 90, 30), scale: 1, opacity: 1, phase: 'updating' });
    expect(c.frame().get('position:a')).toEqual({ ...box('position:a', 70), scale: 0.9, opacity: 0, phase: 'entering' });
    expect(c.frame().get('person:b')?.phase).toBe('exiting');
    expect(made.slice(-4).map(({ kind }) => kind)).toEqual(['spring', 'spring', 'spring', 'tween']);
    const settled = rs.fn(); c.onSettle(settled);
    c.start(); c.start(); expect(pending.size).toBe(1);
    finish();
    expect(c.frame().size).toBe(2);
    expect(c.frame().get('person:a')?.x).toBe(100);
    expect(c.frame().get('position:a')?.opacity).toBe(1);
    expect(settled).toHaveBeenCalledTimes(1);
    c.start(); expect(pending.size).toBe(0);
  });

  it('success: retarget starts at current values and keeps animator velocity', () => {
    const { controller: c, seed, tick, made, pending } = setup();
    seed(); c.prepare([box('person:a', 100)], { animate: true }); c.confirm(); c.start(); tick();
    const before = c.frame().get('person:a')?.x;
    expect(before).toBe(1);
    const count = made.length;
    c.prepare([box('person:a', 200)], { animate: true });
    expect(c.frame().get('person:a')?.x).toBe(before);
    expect(made.length).toBe(count);
    expect(pending.size).toBe(0);
    c.start(); tick();
    expect(c.frame().get('person:a')?.x).toBe(3);
    expect(pending.size).toBe(1);
  });

  it('success: exiting boxes stay at their last position and re-entry absorbs the fading entry', () => {
    const { controller: c, seed, tick, finish, made } = setup();
    seed(); c.prepare([box('person:a', 100)], { animate: true }); c.start(); tick();
    c.prepare([], { animate: true });
    expect(c.frame().get('person:a')?.x).toBe(1);
    c.start(); tick();
    expect(c.frame().get('person:a')?.x).toBe(1);
    expect(c.frame().get('person:a')?.opacity).toBeCloseTo(0.9);
    const count = made.length;
    c.prepare([box('person:a', 80)], { animate: true });
    expect(made.length).toBe(count);
    expect(c.frame().size).toBe(1);
    expect(c.frame().get('person:a')?.phase).toBe('updating');
    expect(c.frame().get('person:a')?.opacity).toBeCloseTo(0.9);
    expect(c.frame().get('person:a')?.x).toBe(1);
    c.start(); finish(); expect(c.frame().get('person:a')?.x).toBe(80);
  });

  it('failure: empty initial targets and removing every target settle without residual frames', () => {
    const { controller: c, seed, pending, finish } = setup();
    seed([]); c.start(); expect(pending.size).toBe(0);
    c.prepare([box('person:a')], { animate: true });
    expect(c.frame().get('person:a')?.opacity).toBe(0);
    c.start(); finish();
    c.prepare([], { animate: true });
    expect(c.frame().get('person:a')?.opacity).toBe(1);
    c.start(); finish(); expect(c.frame().size).toBe(0);
  });

  it('failure: disabled and oversized transitions snap and cancel pending frames', () => {
    const { controller: c, seed, pending } = setup({ maxNodes: 1 });
    seed(); c.prepare([box('person:a', 100)], { animate: true }); c.start();
    c.prepare([box('person:a', 200), box('person:b')], { animate: true }); c.start();
    expect(c.frame().get('person:a')?.x).toBe(200); expect(pending.size).toBe(0);
    c.prepare([box('person:a', 300)], { animate: false }); c.start();
    expect(c.frame().size).toBe(1); expect(c.frame().get('person:a')?.x).toBe(300);
    expect(pending.size).toBe(0);
  });

  it('failure: abort restores confirmed target set and the last displayed confirmed frame', () => {
    const { controller: c, seed, tick, pending } = setup();
    seed(); c.prepare([box('person:a', 100)], { animate: true }); c.confirm(); c.start(); tick();
    const confirmed = c.frame();
    c.prepare([box('person:b')], { animate: true }); c.start(); tick(); c.abort();
    expect(c.frame()).toEqual(confirmed); expect(c.isActive()).toBe(false); expect(pending.size).toBe(0);
    c.snapToTarget(); expect(c.frame().get('person:a')?.x).toBe(100); expect(c.frame().has('person:b')).toBe(false);
  });

  it('failure: abort before any confirmation restores empty state', () => {
    const { controller: c, pending } = setup();
    c.prepare([box('person:a')], { animate: true }); c.abort(); c.start();
    expect(c.frame().size).toBe(0); expect(pending.size).toBe(0);
  });

  it('failure: stalled animators settle at burst cap despite continuous retargeting', () => {
    const { controller: c, seed, tick, pending } = setup({ stuck: true, settleCapMs: 70 });
    seed(); const settled = rs.fn(); c.onSettle(settled);
    for (let n = 1; n <= 4; n++) {
      c.prepare([box('person:a', n * 100)], { animate: true }); c.confirm(); c.start(); tick(20);
    }
    expect(c.frame().get('person:a')?.x).toBe(400);
    expect(pending.size).toBe(0); expect(settled).toHaveBeenCalledTimes(1);
  });

  it('failure: a 200 ms frame gap drops owed steps and continues animating', () => {
    const { controller: c, seed, tick, made, pending, finish } = setup();
    seed(); c.prepare([box('person:a', 100)], { animate: true }); c.start();
    const frame = rs.fn(); c.onFrame(frame);
    tick(200);
    for (const { animator } of made) {
      expect(animator.steps.length).toBe(MAX_STEPS_PER_FRAME);
      expect(animator.steps.every((dt) => dt === FIXED_DT)).toBe(true);
    }
    expect(c.isActive()).toBe(true);
    expect(c.frame().get('person:a')?.x).toBe(21);
    expect(pending.size).toBe(1);
    expect(frame).toHaveBeenCalledTimes(1);
    // The next short frame must not integrate the discarded backlog.
    tick(1);
    for (const { animator } of made) expect(animator.steps.length).toBe(MAX_STEPS_PER_FRAME);
    expect(c.frame().get('person:a')?.x).toBe(21);
    finish();
    expect(c.frame().get('person:a')?.x).toBe(100);
  });

  it('failure: a 5 s frame gap reaches the settle cap and snaps safely', () => {
    const { controller: c, seed, tick, made, pending } = setup({ stuck: true });
    seed(); c.prepare([box('person:a', 100)], { animate: true }); c.start(); tick(5000);
    for (const { animator } of made) {
      expect(animator.steps.length).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
    }
    expect(c.frame().get('person:a')).toEqual({ ...box('person:a', 100), scale: 1, opacity: 1, phase: 'idle' });
    expect(c.isActive()).toBe(false);
    expect(pending.size).toBe(0);
  });

  it('success: fractional frame time accumulates into fixed steps', () => {
    const { controller: c, seed, tick } = setup();
    seed(); c.prepare([box('person:a', 100)], { animate: true }); c.start();
    tick(8); expect(c.frame().get('person:a')?.x).toBe(0);
    tick(9); expect(c.frame().get('person:a')?.x).toBe(1);
  });

  it('failure: listener exceptions warn once and do not stop other listeners or settling', () => {
    const { controller: c, seed, finish } = setup();
    const warn = rs.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      seed(); c.prepare([box('person:a', 100)], { animate: true });
      c.onFrame(() => { throw new Error('frame'); });
      const frame = rs.fn(); c.onFrame(frame);
      c.onSettle(() => { throw new Error('settle'); });
      const settle = rs.fn(); c.onSettle(settle);
      const removed = rs.fn(); const unsubscribe = c.onFrame(removed); unsubscribe();
      c.start(); finish();
      expect(frame).toHaveBeenCalled(); expect(settle).toHaveBeenCalledTimes(1);
      expect(removed).not.toHaveBeenCalled(); expect(warn).toHaveBeenCalledTimes(1);
    } finally { warn.mockRestore(); }
  });

  it('failure: snap and destroy invalidate even already captured callbacks', () => {
    for (const action of ['snapToTarget', 'destroy'] as const) {
      const { controller: c, seed, pending } = setup();
      seed(); c.prepare([box('person:b', 100)], { animate: true }); c.start();
      const stale = [...pending.values()]; const frame = rs.fn(); c.onFrame(frame);
      c[action](); const calls = frame.mock.calls.length;
      for (const cb of stale) cb(17);
      expect(frame.mock.calls.length).toBe(calls); expect(pending.size).toBe(0);
      expect(c.isActive()).toBe(false);
      if (action === 'snapToTarget') expect(c.frame().has('person:a')).toBe(false);
      else { c.destroy(); c.prepare([box('person:c')], { animate: true }); c.start(); expect(pending.size).toBe(0); }
    }
  });
});
