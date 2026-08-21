import type { StaffEdgePoint } from './staffEdgeGeometry.js';

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
