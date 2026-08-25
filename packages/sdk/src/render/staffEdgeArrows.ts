import type { StaffEdgePoint } from '../layout/staffEdgeGeometry.js';

/** Tip + two base corners for a filled arrowhead at `to`, pointing along `from`→`to`. */
export function arrowHeadTriangle(
  from: StaffEdgePoint,
  to: StaffEdgePoint,
  size = 7,
): [StaffEdgePoint, StaffEdgePoint, StaffEdgePoint] | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6 || size <= 0) return null;
  const ux = dx / len;
  const uy = dy / len;
  const baseX = to.x - ux * size;
  const baseY = to.y - uy * size;
  const px = -uy;
  const py = ux;
  const half = size * 0.45;
  return [
    { x: to.x, y: to.y },
    { x: baseX + px * half, y: baseY + py * half },
    { x: baseX - px * half, y: baseY - py * half },
  ];
}

/** Shorten the last chord so the stroke ends at the arrow base (avoids tip overdraw). */
export function shortenPolylineForArrow(
  points: readonly StaffEdgePoint[],
  arrowSize: number,
): StaffEdgePoint[] {
  if (points.length < 2 || arrowSize <= 0) return points.map((p) => ({ ...p }));
  const out = points.map((p) => ({ ...p }));
  const a = out[out.length - 2]!;
  const b = out[out.length - 1]!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  // Tiny last segments: keep tip on the port (no visible gap).
  if (len <= arrowSize * 2) return out;
  const t = (len - arrowSize * 0.85) / len;
  out[out.length - 1] = { x: a.x + dx * t, y: a.y + dy * t };
  return out;
}

/**
 * Stroke an orthogonal polyline with rounded elbows (Figma connectors).
 * `radius` 0 falls back to plain lineTo corners.
 */
export function traceRoundedPolyline(
  g: { moveTo(x: number, y: number): unknown; lineTo(x: number, y: number): unknown; arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): unknown },
  points: readonly StaffEdgePoint[],
  radius: number,
): void {
  if (points.length < 2) return;
  const first = points[0]!;
  g.moveTo(first.x, first.y);
  if (radius <= 0) {
    for (let i = 1; i < points.length; i += 1) {
      const p = points[i]!;
      g.lineTo(p.x, p.y);
    }
    return;
  }
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1]!;
    const corner = points[i]!;
    const next = points[i + 1]!;
    const inLen = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const outLen = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    if (r <= 0.5) {
      g.lineTo(corner.x, corner.y);
      continue;
    }
    g.arcTo(corner.x, corner.y, next.x, next.y, r);
  }
  const last = points[points.length - 1]!;
  g.lineTo(last.x, last.y);
}

/**
 * Figma connector ends: a filled dot on the first and last port.
 * `radius <= 0` paints nothing, so callers can pass the resolved style through.
 */
export function drawEdgeEndDots(
  g: { circle(x: number, y: number, radius: number): unknown; fill(style: { color: number }): unknown },
  points: readonly StaffEdgePoint[],
  color: number,
  radius: number,
): void {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || radius <= 0) return;
  g.circle(first.x, first.y, radius);
  g.circle(last.x, last.y, radius);
  g.fill({ color });
}
