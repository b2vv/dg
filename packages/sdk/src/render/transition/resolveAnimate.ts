import { ANIMATE_PRESETS, FADE_MS } from './constants.js';
import type { AnimateOption, ResolvedAnimate } from './types.js';

function positiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function resolvePhysics(option: unknown): ResolvedAnimate | null {
  if (typeof option !== 'object' || option === null || Array.isArray(option)) return null;
  if ('duration' in option) {
    const bounce = 'bounce' in option && option.bounce !== undefined ? option.bounce : 0;
    if (!positiveFinite(option.duration) || typeof bounce !== 'number' || !Number.isFinite(bounce)) return null;
    // Natural frequency ω = 2π / duration; with mass 1 and ζ = 1 − bounce,
    // the spring equation gives stiffness = ω²m and damping = 2ζωm.
    const omega = 2 * Math.PI / option.duration;
    const stiffness = omega * omega;
    const damping = 2 * (1 - Math.max(0, Math.min(0.9, bounce))) * omega;
    if (!positiveFinite(stiffness) || !Number.isFinite(damping)) return null;
    return { stiffness, damping, mass: 1, fadeMs: FADE_MS };
  }
  if (!('stiffness' in option) || !('damping' in option)) return null;
  const mass = 'mass' in option && option.mass !== undefined ? option.mass : 1;
  if (!positiveFinite(option.stiffness) || !positiveFinite(mass)
    || typeof option.damping !== 'number' || !Number.isFinite(option.damping) || option.damping < 0) return null;
  return { stiffness: option.stiffness, damping: option.damping, mass, fadeMs: FADE_MS };
}

export function resolveAnimate(option: AnimateOption | undefined, reducedMotion: boolean): ResolvedAnimate | null {
  if (reducedMotion || option === undefined || option === false || option === 'instant') return null;
  let input: unknown = option;
  if (option === true) input = ANIMATE_PRESETS.smooth;
  else if (option === 'smooth' || option === 'snappy' || option === 'gentle') input = ANIMATE_PRESETS[option];
  const resolved = resolvePhysics(input);
  if (!resolved) console.warn('Invalid animate option; animation disabled:', option);
  return resolved;
}
