import { easeOutCubic } from '../contour/contourMorph.js';
import { EPS_POS, EPS_VEL, FIXED_DT } from './constants.js';
import type { Animator, AnimatorFactory, ResolvedAnimate } from './types.js';

export class SpringAnimator implements Animator {
  private current: number;
  private target: number;
  private velocity = 0;

  constructor(initial: number, private readonly resolved: ResolvedAnimate) {
    this.current = initial;
    this.target = initial;
  }

  get value(): number { return this.current; }

  get settled(): boolean {
    return Math.abs(this.current - this.target) < EPS_POS && Math.abs(this.velocity) < EPS_VEL;
  }

  retarget(target: number): void { this.target = target; }

  snap(value = this.target): void {
    this.current = value;
    this.target = value;
    this.velocity = 0;
  }

  advance(dtSeconds: number): void {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    // Bound work and integration size even when called without the controller.
    const dt = Math.min(dtSeconds, FIXED_DT);
    const { stiffness, damping, mass } = this.resolved;
    const acceleration = (stiffness * (this.target - this.current) - damping * this.velocity) / mass;
    const velocity = this.velocity + acceleration * dt;
    const value = this.current + velocity * dt;
    // Finite host numbers can still overflow arithmetic. Finish the transition
    // rather than allowing Infinity/NaN to reach scene geometry.
    if (!Number.isFinite(velocity) || !Number.isFinite(value)) {
      this.snap();
      return;
    }
    this.velocity = velocity;
    this.current = value;
  }
}

// Both strategies belong to the assigned animator module and share its factory.
// eslint-disable-next-line max-classes-per-file
export class TweenAnimator implements Animator {
  private current: number;
  private start: number;
  private target: number;
  private elapsedMs: number;
  private readonly durationMs: number;

  constructor(initial: number, resolved: ResolvedAnimate) {
    this.current = initial;
    this.start = initial;
    this.target = initial;
    this.durationMs = resolved.fadeMs;
    this.elapsedMs = this.durationMs;
  }

  get value(): number { return this.current; }
  get settled(): boolean { return this.elapsedMs >= this.durationMs; }

  retarget(target: number): void {
    this.start = this.current;
    this.target = target;
    this.elapsedMs = 0;
  }

  snap(value = this.target): void {
    this.current = value;
    this.start = value;
    this.target = value;
    this.elapsedMs = this.durationMs;
  }

  advance(dtSeconds: number): void {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || this.settled) return;
    this.elapsedMs = Math.min(this.durationMs, this.elapsedMs + dtSeconds * 1000);
    if (this.settled) {
      this.current = this.target;
      return;
    }
    const progress = easeOutCubic(this.elapsedMs / this.durationMs);
    this.current = (1 - progress) * this.start + progress * this.target;
  }
}

export const createAnimator: AnimatorFactory = (kind, initial, resolved): Animator =>
  kind === 'spring' ? new SpringAnimator(initial, resolved) : new TweenAnimator(initial, resolved);
