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
  // Tolerance is a budget for how far the outline may move, in world px. `far`
  // is only reached below ~0.45 scale, so 2 world px is under one screen pixel;
  // `mid` runs up to ~1.2 scale, where 1 world px is about the same.
  //
  // This used to keep every Nth vertex instead. On a straight run that looks
  // fine, which is what its test covered — but a department contour is a
  // rounded rect, and a corner that landed on the wrong index simply vanished,
  // leaving the ring to cut a diagonal across it. Distance decides what may go.
  const tolerance = lod === 'far' ? 2 : 1;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [from, to] = stack.pop()!;
    let worstIndex = -1;
    let worstDistance = tolerance;
    for (let i = from + 1; i < to; i += 1) {
      const distance = distanceToSegment(points[i]!, points[from]!, points[to]!);
      if (distance > worstDistance) {
        worstDistance = distance;
        worstIndex = i;
      }
    }
    if (worstIndex !== -1) {
      keep[worstIndex] = 1;
      stack.push([from, worstIndex], [worstIndex, to]);
    }
  }

  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < points.length; i += 1) {
    if (keep[i]) out.push({ x: points[i]!.x, y: points[i]!.y });
  }
  if (out.length >= 3) return out;

  // Everything collapsed onto the closing chord — the ring has no area to keep.
  // Three points still describe it, and returning the original run instead would
  // mean the flattest shapes are the ones that never get simplified.
  const middle = points[Math.floor((points.length - 1) / 2)]!;
  return [
    { x: points[0]!.x, y: points[0]!.y },
    { x: middle.x, y: middle.y },
    { x: points[points.length - 1]!.x, y: points[points.length - 1]!.y },
  ];
}

/** Perpendicular distance from `p` to segment `a`–`b` (not to the infinite line). */
function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
