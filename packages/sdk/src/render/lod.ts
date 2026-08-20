/** Zoom-driven level of detail (SPEC §5.1). */
export type LodLevel = 'far' | 'mid' | 'near';

export interface LodThresholds {
  /** scale < farMax → far */
  farMax: number;
  /** scale < midMax → mid; else near */
  midMax: number;
}

export const defaultLodThresholds: LodThresholds = {
  farMax: 0.45,
  midMax: 1.2,
};

export function resolveLodLevel(
  scale: number,
  thresholds: LodThresholds = defaultLodThresholds,
): LodLevel {
  if (!Number.isFinite(scale)) return 'mid';
  if (scale < thresholds.farMax) return 'far';
  if (scale < thresholds.midMax) return 'mid';
  return 'near';
}

/** Subsample closed polygon vertices for far/mid zoom (keeps first + last). */
export function simplifyPolyline(
  points: ReadonlyArray<{ x: number; y: number }>,
  lod: LodLevel,
): Array<{ x: number; y: number }> {
  if (points.length <= 4 || lod === 'near') {
    return points.map((p) => ({ x: p.x, y: p.y }));
  }
  const step = lod === 'far' ? 3 : 2;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < points.length; i += step) {
    out.push({ x: points[i]!.x, y: points[i]!.y });
  }
  const last = points[points.length - 1]!;
  const tail = out[out.length - 1];
  if (!tail || tail.x !== last.x || tail.y !== last.y) {
    out.push({ x: last.x, y: last.y });
  }
  return out.length >= 3 ? out : points.map((p) => ({ x: p.x, y: p.y }));
}
