/**
 * Round sharp convex corners of a closed contour ring to match card radii.
 * Concave / notch reentrants stay sharp so the CEO mouth does not close.
 */

export const CONTOUR_CORNER_RADIUS = 10;

export interface ContourPoint {
  x: number;
  y: number;
}

function signedArea(pts: readonly ContourPoint[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

function dist(a: ContourPoint, b: ContourPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Replace convex corners with short circular arcs (radius ≈ card borderRadius).
 * Near-collinear and concave vertices are left unchanged.
 */
export function filletClosedRing(
  points: readonly ContourPoint[],
  radius: number = CONTOUR_CORNER_RADIUS,
  arcSegments = 4,
): ContourPoint[] {
  const n = points.length;
  if (n < 3 || radius <= 0 || arcSegments < 1) {
    return points.map((p) => ({ x: p.x, y: p.y }));
  }

  let ring = points.map((p) => ({ x: p.x, y: p.y }));
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) {
    ring = ring.slice(0, -1);
  }
  if (ring.length < 3) return points.map((p) => ({ x: p.x, y: p.y }));

  const orient = Math.sign(signedArea(ring)) || 1;
  const out: ContourPoint[] = [];
  const m = ring.length;

  for (let i = 0; i < m; i += 1) {
    const prev = ring[(i - 1 + m) % m]!;
    const curr = ring[i]!;
    const next = ring[(i + 1) % m]!;
    const len0 = dist(prev, curr);
    const len1 = dist(curr, next);
    if (len0 < 1e-6 || len1 < 1e-6) {
      out.push({ x: curr.x, y: curr.y });
      continue;
    }

    const d0x = (curr.x - prev.x) / len0;
    const d0y = (curr.y - prev.y) / len0;
    const d1x = (next.x - curr.x) / len1;
    const d1y = (next.y - curr.y) / len1;
    const cross = d0x * d1y - d0y * d1x;
    const dot = Math.max(-1, Math.min(1, d0x * d1x + d0y * d1y));
    const turn = Math.atan2(cross, dot);

    // Concave / notch (opposite to exterior orientation) — keep sharp.
    if (Math.sign(turn) !== orient || Math.abs(turn) < 0.25) {
      out.push({ x: curr.x, y: curr.y });
      continue;
    }

    const half = Math.abs(turn) / 2;
    const tanHalf = Math.tan(half);
    if (tanHalf < 1e-6) {
      out.push({ x: curr.x, y: curr.y });
      continue;
    }

    const maxTrim = Math.min(len0, len1) * 0.45;
    let trim = radius / tanHalf;
    const r = trim > maxTrim ? maxTrim * tanHalf : radius;
    trim = Math.min(trim, maxTrim);

    const p1 = { x: curr.x - d0x * trim, y: curr.y - d0y * trim };
    const p2 = { x: curr.x + d1x * trim, y: curr.y + d1y * trim };

    // Inward normal of incoming edge → arc center sits inside the fill.
    const n0x = -d0y * orient;
    const n0y = d0x * orient;
    const center = { x: p1.x + n0x * r, y: p1.y + n0y * r };

    const a0 = Math.atan2(p1.y - center.y, p1.x - center.x);
    const a1 = Math.atan2(p2.y - center.y, p2.x - center.x);
    let sweep = a1 - a0;
    while (sweep <= -Math.PI) sweep += 2 * Math.PI;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    // Arc should turn the same way as the polygon corner.
    if (Math.sign(sweep) !== Math.sign(turn) && Math.abs(sweep) > 1e-6) {
      sweep += sweep > 0 ? -2 * Math.PI : 2 * Math.PI;
    }

    out.push(p1);
    for (let s = 1; s < arcSegments; s += 1) {
      const t = s / arcSegments;
      const ang = a0 + sweep * t;
      out.push({
        x: center.x + Math.cos(ang) * r,
        y: center.y + Math.sin(ang) * r,
      });
    }
    out.push(p2);
  }

  return dedupeNear(out, 0.05);
}

function dedupeNear(pts: ContourPoint[], eps: number): ContourPoint[] {
  if (pts.length === 0) return pts;
  const out: ContourPoint[] = [{ ...pts[0]! }];
  for (let i = 1; i < pts.length; i += 1) {
    const p = pts[i]!;
    const q = out[out.length - 1]!;
    if (Math.hypot(p.x - q.x, p.y - q.y) > eps) out.push({ ...p });
  }
  return out;
}

/** Max absolute turn (radians) between consecutive chords — lower ⇒ rounder. */
export function maxChordTurn(points: readonly ContourPoint[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let max = 0;
  for (let i = 0; i < n; i += 1) {
    const a = points[(i - 1 + n) % n]!;
    const b = points[i]!;
    const c = points[(i + 1) % n]!;
    const l0 = dist(a, b);
    const l1 = dist(b, c);
    if (l0 < 1e-6 || l1 < 1e-6) continue;
    const d0x = (b.x - a.x) / l0;
    const d0y = (b.y - a.y) / l0;
    const d1x = (c.x - b.x) / l1;
    const d1y = (c.y - b.y) / l1;
    const turn = Math.abs(Math.atan2(d0x * d1y - d0y * d1x, d0x * d1x + d0y * d1y));
    max = Math.max(max, turn);
  }
  return max;
}
