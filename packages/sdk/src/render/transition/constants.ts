// Seconds per simulation step, keeping integration independent of display refresh rate.
export const FIXED_DT = 1 / 60;
// Steps per frame, bounding catch-up work after a delayed frame.
export const MAX_STEPS_PER_FRAME = 6;
// Pixels of remaining displacement, below which position is considered at rest.
export const EPS_POS = 0.5;
// Pixels per second, below which velocity is considered at rest.
export const EPS_VEL = 1;
// Unitless scale ratio, giving entering cards a subtle grow-in effect.
export const ENTER_SCALE_FROM = 0.9;
// Milliseconds per transition burst, bounding settling delays during continuous updates.
export const SETTLE_CAP_MS = 750;
// Nodes per animated scene, above which snapping bounds per-frame work.
export const ANIMATE_MAX_NODES = 2000;
// Milliseconds per opacity tween, keeping fades consistent across spring presets.
export const FADE_MS = 200;
// Duration in seconds and unitless bounce (0..1), defining perceptual presets; instant skips animation.
export const ANIMATE_PRESETS = {
  smooth: { duration: 0.4, bounce: 0.1 },
  snappy: { duration: 0.25, bounce: 0.25 },
  gentle: { duration: 0.6, bounce: 0.15 },
} as const;
