import { ANIMATE_MAX_NODES, ENTER_SCALE_FROM, FIXED_DT, MAX_STEPS_PER_FRAME, SETTLE_CAP_MS } from './constants.js';
import type { Animator, AnimatorFactory, FrameBox, FrameClock, ResolvedAnimate, TargetBox, TransitionFrame } from './types.js';

interface ControllerOptions {
  resolved: ResolvedAnimate;
  createAnimator: AnimatorFactory;
  clock: FrameClock;
  maxNodes?: number;
  settleCapMs?: number;
}

interface Entry {
  box: FrameBox;
  x: Animator;
  y: Animator;
  scale: Animator;
  opacity: Animator;
}

function idleFrame(targets: readonly TargetBox[]): TransitionFrame {
  return new Map(targets.map((target) => [target.key, { ...target, scale: 1, opacity: 1, phase: 'idle' }]));
}

/** Pure transition state. Prepare is synchronous; only start schedules clock callbacks. */
export class TransitionController {
  private entries = new Map<string, Entry>();
  private targets: readonly TargetBox[] = [];
  private current: TransitionFrame = new Map();
  private confirmedFrame: TransitionFrame = new Map();
  private confirmedTargets: readonly TargetBox[] = [];
  private confirmedPrepared = false;
  private initialized = false;
  private confirmedInitialized = false;
  private active = false;
  private destroyed = false;
  private requested: number | null = null;
  private generation = 0;
  private startedAt: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private warned = false;
  private frameListeners = new Set<(frame: TransitionFrame) => void>();
  private settleListeners = new Set<() => void>();

  constructor(private readonly options: ControllerOptions) {}

  prepare(targets: readonly TargetBox[], opts: { animate: boolean }): void {
    if (this.destroyed) return;
    this.cancelRequest();
    this.confirmedPrepared = false;
    this.targets = targets.map((target) => ({ ...target }));
    if (!this.initialized || !opts.animate || targets.length > (this.options.maxNodes ?? ANIMATE_MAX_NODES)) {
      this.initialized = true;
      this.resetToTarget();
      return;
    }
    const next = new Map<string, Entry>();
    for (const target of this.targets) {
      const previous = this.current.get(target.key);
      const entry = this.entries.get(target.key) ?? this.createEntry(previous ?? {
        ...target, scale: ENTER_SCALE_FROM, opacity: 0, phase: 'entering',
      });
      entry.box = { ...target, phase: previous ? 'updating' : 'entering', scale: entry.scale.value, opacity: entry.opacity.value };
      entry.x.retarget(target.x);
      entry.y.retarget(target.y);
      entry.scale.retarget(1);
      entry.opacity.retarget(1);
      next.set(target.key, entry);
    }
    for (const [key, previous] of this.current) {
      if (next.has(key)) continue;
      const entry = this.entries.get(key) ?? this.createEntry(previous);
      entry.box = { ...previous, phase: 'exiting' };
      entry.x.snap(previous.x);
      entry.y.snap(previous.y);
      entry.scale.snap(previous.scale);
      entry.opacity.retarget(0);
      next.set(key, entry);
    }
    this.entries = next;
    this.active = !this.allSettled();
    if (this.active) this.publishFrame();
    else this.resetToTarget();
  }

  start(): void {
    if (this.destroyed || !this.active || this.requested !== null) return;
    const now = this.options.clock.now();
    this.startedAt ??= now;
    this.lastTime = now;
    this.accumulator = 0;
    this.requestTick();
  }

  /** Restore the last confirmed displayed frame, leaving it static. */
  abort(): void {
    if (this.destroyed) return;
    this.stop();
    this.targets = this.confirmedTargets;
    this.current = this.confirmedFrame;
    this.initialized = this.confirmedInitialized;
    this.confirmedPrepared = true;
    this.entries.clear();
  }

  /** Explicit completion emits the final frame and settle once if a transition was pending. */
  snapToTarget(): void {
    if (this.destroyed) return;
    const wasActive = this.active;
    this.resetToTarget();
    this.rememberConfirmedFrame();
    if (wasActive) this.notifyCompletion();
  }

  confirm(): void {
    if (this.destroyed) return;
    this.confirmedPrepared = true;
    this.confirmedTargets = this.targets;
    this.confirmedInitialized = this.initialized;
    this.confirmedFrame = this.current;
  }

  frame(): TransitionFrame { return this.current; }
  isActive(): boolean { return this.active; }

  onFrame(cb: (frame: TransitionFrame) => void): () => void {
    if (!this.destroyed) this.frameListeners.add(cb);
    return () => { this.frameListeners.delete(cb); };
  }

  onSettle(cb: () => void): () => void {
    if (!this.destroyed) this.settleListeners.add(cb);
    return () => { this.settleListeners.delete(cb); };
  }

  destroy(): void {
    this.stop();
    this.destroyed = true;
    this.entries.clear();
    this.frameListeners.clear();
    this.settleListeners.clear();
  }

  private createEntry(box: FrameBox): Entry {
    const create = this.options.createAnimator;
    const resolved = this.options.resolved;
    return {
      box,
      x: create('spring', box.x, resolved),
      y: create('spring', box.y, resolved),
      scale: create('spring', box.scale, resolved),
      opacity: create('tween', box.opacity, resolved),
    };
  }

  private allSettled(): boolean {
    for (const entry of this.entries.values()) {
      if (!entry.x.settled || !entry.y.settled || !entry.scale.settled || !entry.opacity.settled) return false;
    }
    return true;
  }

  private publishFrame(): void {
    const frame = new Map<string, FrameBox>();
    for (const [key, entry] of this.entries) {
      frame.set(key, { ...entry.box, x: entry.x.value, y: entry.y.value, scale: entry.scale.value, opacity: entry.opacity.value });
    }
    this.current = frame;
  }

  private requestTick(): void {
    const generation = this.generation;
    this.requested = this.options.clock.requestFrame((now) => {
      if (generation !== this.generation || this.destroyed || !this.active) return;
      this.requested = null;
      this.tick(now);
    });
  }

  private tick(now: number): void {
    const elapsed = Math.max(0, now - this.lastTime);
    this.lastTime = now;
    this.accumulator += elapsed / 1000;
    if (!Number.isFinite(this.accumulator) || now - (this.startedAt ?? now) >= (this.options.settleCapMs ?? SETTLE_CAP_MS)) {
      this.snapToTarget();
      return;
    }
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      for (const entry of this.entries.values()) {
        entry.x.advance(FIXED_DT);
        entry.y.advance(FIXED_DT);
        entry.scale.advance(FIXED_DT);
        entry.opacity.advance(FIXED_DT);
      }
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (this.accumulator >= FIXED_DT) this.accumulator = 0;
    if (this.allSettled()) {
      this.snapToTarget();
      return;
    }
    this.publishFrame();
    this.rememberConfirmedFrame();
    const generation = this.generation;
    this.emit(this.frameListeners, this.current);
    if (this.active && !this.destroyed && generation === this.generation && this.requested === null) this.requestTick();
  }

  private rememberConfirmedFrame(): void {
    if (this.confirmedPrepared) this.confirmedFrame = this.current;
  }

  private resetToTarget(): void {
    this.stop();
    this.entries.clear();
    this.current = idleFrame(this.targets);
  }

  private cancelRequest(): void {
    this.generation++;
    if (this.requested !== null) this.options.clock.cancelFrame(this.requested);
    this.requested = null;
  }

  private stop(): void {
    this.cancelRequest();
    this.active = false;
    this.startedAt = null;
    this.accumulator = 0;
  }

  private notifyCompletion(): void {
    const generation = this.generation;
    this.emit(this.frameListeners, this.current);
    if (!this.destroyed && generation === this.generation) this.emit(this.settleListeners, undefined);
  }

  private emit<T>(listeners: Set<(value: T) => void>, value: T): void {
    for (const listener of [...listeners]) {
      if (this.destroyed) break;
      try { listener(value); }
      catch (error) {
        if (!this.warned) {
          this.warned = true;
          console.warn('Transition listener failed', error);
        }
      }
    }
  }
}
