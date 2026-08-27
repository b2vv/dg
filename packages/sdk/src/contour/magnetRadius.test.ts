import { describe, expect, it } from '@rstest/core';
import { ContourConfigError, resolveMagnetRadius } from './magnetRadius.js';

describe('resolveMagnetRadius (T78-T4)', () => {
  it('success: undefined → default 1.5', () => {
    expect(resolveMagnetRadius(undefined)).toBe(1.5);
    expect(resolveMagnetRadius(null)).toBe(1.5);
  });

  it('success: finite ≥ 0 passes through', () => {
    expect(resolveMagnetRadius(0)).toBe(0);
    expect(resolveMagnetRadius(1.5)).toBe(1.5);
    expect(resolveMagnetRadius(2)).toBe(2);
  });

  it('failure: NaN / Inf / negative reject', () => {
    expect(() => resolveMagnetRadius(Number.NaN)).toThrow(ContourConfigError);
    expect(() => resolveMagnetRadius(Number.POSITIVE_INFINITY)).toThrow(ContourConfigError);
    expect(() => resolveMagnetRadius(-1)).toThrow(ContourConfigError);
  });
});
