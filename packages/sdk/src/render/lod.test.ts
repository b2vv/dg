import { describe, expect, it } from '@rstest/core';
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

  it('failure: far lod must not move the outline off the shape', () => {
    // A rounded-rect ring: four corners plus points along the edges — the shape
    // every department contour actually is.
    const ring: Array<{ x: number; y: number }> = [];
    const corners = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 80 },
      { x: 0, y: 80 },
    ];
    for (let c = 0; c < corners.length; c += 1) {
      const from = corners[c]!;
      const to = corners[(c + 1) % corners.length]!;
      for (let t = 0; t < 5; t += 1) {
        ring.push({ x: from.x + ((to.x - from.x) * t) / 5, y: from.y + ((to.y - from.y) * t) / 5 });
      }
    }

    /** Furthest any original vertex ends up from the simplified outline. */
    const outlineDrift = (simplified: ReadonlyArray<{ x: number; y: number }>) => {
      const distToSegment = (
        p: { x: number; y: number },
        a: { x: number; y: number },
        b: { x: number; y: number },
      ) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
        return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
      };
      return Math.max(
        ...ring.map((p) =>
          Math.min(
            ...simplified.map((a, i) => distToSegment(p, a, simplified[(i + 1) % simplified.length]!)),
          ),
        ),
      );
    };

    // Dropping every Nth vertex throws away whichever corner lands on the wrong
    // index, and the ring then cuts a diagonal across it — a visibly skewed blob
    // the moment the user zooms out. Simplification may remove vertices; it may
    // not move the outline.
    expect(outlineDrift(simplifyPolyline(ring, 'far'))).toBeLessThan(2);
    expect(outlineDrift(simplifyPolyline(ring, 'mid'))).toBeLessThan(2);
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
