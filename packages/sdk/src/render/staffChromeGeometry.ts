// Pure geometry for the React near-view chrome (T129): world→screen for frames
// and line points, and the rounded SVG path for connector lines. No DOM, no React,
// no Pixi — just numbers, so it is unit-tested in SDK (the presentation lives in the
// demo backdrop, which is outside the gate suite). Kept next to `promoteMath`
// (`worldBoxToScreen`), whose origin convention this matches: `x * scale + viewport`.
import type { ViewportTransform } from './Viewport.js';

export interface ScreenPoint {
  x: number;
  y: number;
}

/** World point → screen px, same origin as {@link worldBoxToScreen}. */
export function worldPointToScreen(x: number, y: number, v: ViewportTransform): ScreenPoint {
  return { x: x * v.scale + v.x, y: y * v.scale + v.y };
}

/**
 * SVG path data for an orthogonal polyline with rounded corners — the mockup
 * `pathD` behaviour (paraphrased from `shps-links.js`): each interior vertex is
 * replaced by a quadratic arc whose radius is clamped to half of the shorter of
 * the two adjacent segments, so a short chord never over-rounds. Straight runs
 * stay `L`. `radius` is in the SAME space as the points (pass screen-space radius
 * for screen-space points).
 */
export function roundedPathD(points: readonly ScreenPoint[], radius: number): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  if (points.length === 1) return `M${first.x} ${first.y}`;
  let d = `M${first.x} ${first.y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const l1 = Math.hypot(b.x - a.x, b.y - a.y);
    const l2 = Math.hypot(c.x - b.x, c.y - b.y);
    // Zero-length segment (duplicate vertex): no corner to round, no divide-by-zero.
    if (l1 === 0 || l2 === 0) {
      d += `L${b.x} ${b.y}`;
      continue;
    }
    const rr = Math.min(radius, l1 / 2, l2 / 2);
    const ux = (b.x - a.x) / l1;
    const uy = (b.y - a.y) / l1;
    const wx = (c.x - b.x) / l2;
    const wy = (c.y - b.y) / l2;
    d += `L${b.x - ux * rr} ${b.y - uy * rr}Q${b.x} ${b.y} ${b.x + wx * rr} ${b.y + wy * rr}`;
  }
  const last = points[points.length - 1]!;
  d += `L${last.x} ${last.y}`;
  return d;
}
