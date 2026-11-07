/** Velocity-driven motion blur for camera pan (research: scroll-blur). */

export interface MotionBlurOptions {
  /** Blur ceiling in screen px at/above `maxSpeed`. */
  maxPx: number;
  /** Dead zone: speed at/below this stays sharp (0 blur). Screen px per ms. */
  minSpeed: number;
  /** Speed at/above which blur reaches `maxPx`. Screen px per ms. */
  maxSpeed: number;
}

export const defaultMotionBlurOptions: MotionBlurOptions = {
  maxPx: 6,
  minSpeed: 0.5,
  maxSpeed: 3,
};

/**
 * Camera speed (screen px/ms) → blur radius (screen px).
 *
 * Below `minSpeed` the result is exactly 0 — a slow pan stays sharp AND skips
 * the filter entirely (the cheap case). Between the thresholds it ramps
 * linearly to `maxPx`, and it never exceeds `maxPx` however fast the fling.
 */
export function motionBlurPx(
  speed: number,
  opts: MotionBlurOptions = defaultMotionBlurOptions,
): number {
  // The negated form also catches NaN and negative speed, not just the dead zone.
  if (!(speed > opts.minSpeed)) return 0;
  if (speed >= opts.maxSpeed) return opts.maxPx;
  const t = (speed - opts.minSpeed) / (opts.maxSpeed - opts.minSpeed);
  return t * opts.maxPx;
}
