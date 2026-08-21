import { describe, expect, it } from 'vitest';
import { resolvePixiResolution } from './PixiHost.js';

describe('resolvePixiResolution', () => {
  it('success: uses explicit positive resolution capped at 3', () => {
    expect(resolvePixiResolution(2)).toBe(2);
    expect(resolvePixiResolution(8)).toBe(3);
  });

  it('failure: non-finite / non-positive explicit falls back to devicePixelRatio path', () => {
    expect(resolvePixiResolution(0)).toBeGreaterThan(0);
    expect(resolvePixiResolution(Number.NaN)).toBeGreaterThan(0);
    expect(resolvePixiResolution(-1)).toBeGreaterThan(0);
  });
});
