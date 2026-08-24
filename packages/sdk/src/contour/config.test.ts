import { describe, expect, it } from 'vitest';
import { MAX_SMOOTH_ITERATIONS, toRustConfig } from './config.js';

describe('toRustConfig', () => {
  it('success: smoothIterations above cap clamp to MAX_SMOOTH_ITERATIONS (A9)', () => {
    expect(toRustConfig({ smoothIterations: 20 }).smooth_iterations).toBe(MAX_SMOOTH_ITERATIONS);
    expect(toRustConfig({ smoothIterations: 8 }).smooth_iterations).toBe(8);
    expect(toRustConfig({}).smooth_iterations).toBe(2);
  });
});
