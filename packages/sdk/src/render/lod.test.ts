import { describe, expect, it } from 'vitest';
import { resolveLodLevel, simplifyPolyline, defaultLodThresholds } from './lod.js';

describe('resolveLodLevel', () => {
  it('success: maps scale bands to far/mid/near', () => {
    expect(resolveLodLevel(0.2)).toBe('far');
    expect(resolveLodLevel(defaultLodThresholds.farMax - 0.01)).toBe('far');
    expect(resolveLodLevel(0.8)).toBe('mid');
    expect(resolveLodLevel(1.5)).toBe('near');
  });

  it('failure: non-finite scale falls back to mid', () => {
    expect(resolveLodLevel(Number.NaN)).toBe('mid');
    expect(resolveLodLevel(Number.POSITIVE_INFINITY)).toBe('mid');
  });
});

describe('simplifyPolyline', () => {
  it('success: far lod reduces vertex count', () => {
    const pts = Array.from({ length: 12 }, (_, i) => ({ x: i, y: 0 }));
    const far = simplifyPolyline(pts, 'far');
    expect(far.length).toBeLessThan(pts.length);
    expect(far[0]).toEqual(pts[0]);
  });

  it('success: near lod keeps all points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(simplifyPolyline(pts, 'near')).toEqual(pts);
  });
});
