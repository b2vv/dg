export interface FrameClock { now(): number; requestFrame(cb: (t: number) => void): number; cancelFrame(id: number): void }

/** advance(dt) by a fixed step; settled = at rest by threshold (|Δ|<ε, |v|<ε), not by time. */
export interface Animator { readonly value: number; readonly settled: boolean;
  retarget(target: number): void; snap(value?: number): void; advance(dtSeconds: number): void }

export type AnimatePreset = 'smooth' | 'snappy' | 'gentle' | 'instant';
export type AnimateOption = boolean | AnimatePreset
  | { duration: number; bounce?: number }               // perceptual form (seconds, 0..1)
  | { stiffness: number; damping: number; mass?: number }; // physical form
/** Normalized result; null = no animation (off, 'instant', reduced motion, invalid). */
export interface ResolvedAnimate { stiffness: number; damping: number; mass: number; fadeMs: number }

export type TransitionPhase = 'entering' | 'updating' | 'exiting' | 'idle';
export interface TargetBox { key: string; x: number; y: number; w: number; h: number }
export interface FrameBox extends TargetBox { scale: number; opacity: number; phase: TransitionPhase }
export type TransitionFrame = ReadonlyMap<string, FrameBox>;

/** How a controller obtains animators (lets the controller be tested with fakes). */
export type AnimatorFactory = (kind: 'spring' | 'tween', initial: number, resolved: ResolvedAnimate) => Animator;
