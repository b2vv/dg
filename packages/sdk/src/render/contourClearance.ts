/**
 * Keep department contour rings outside person/position cards.
 * Chaikin smooth pulls corners inward and can dip into card AABBs (T38).
 */

export interface ContourClearBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function pointClearance(
  x: number,
  y: number,
  box: ContourClearBox,
): number {
  const dx = Math.max(box.x - x, 0, x - (box.x + box.width));
  const dy = Math.max(box.y - y, 0, y - (box.y + box.height));
  return Math.hypot(dx, dy);
}

function isInsideExpanded(
  x: number,
  y: number,
  box: ContourClearBox,
  margin: number,
): boolean {
  return (
    x > box.x - margin &&
    x < box.x + box.width + margin &&
    y > box.y - margin &&
    y < box.y + box.height + margin
  );
}

/** Project a point inside/near a box onto the expanded AABB boundary (from center). */
function projectOutsideBox(
  x: number,
  y: number,
  box: ContourClearBox,
  margin: number,
): { x: number; y: number } {
  if (!isInsideExpanded(x, y, box, margin)) return { x, y };

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let dx = x - cx;
  let dy = y - cy;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    dy = -1;
  }
  const halfW = box.width / 2 + margin;
  const halfH = box.height / 2 + margin;
  const sx = halfW / Math.max(Math.abs(dx), 1e-9);
  const sy = halfH / Math.max(Math.abs(dy), 1e-9);
  const scale = Math.min(sx, sy);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function pushPoint(
  x: number,
  y: number,
  boxes: readonly ContourClearBox[],
  margin: number,
): { x: number; y: number } {
  let p = { x, y };
  // Multiple passes: a point can sit in overlapping expanded boxes.
  for (let i = 0; i < boxes.length + 1; i += 1) {
    let moved = false;
    for (const box of boxes) {
      if (!isInsideExpanded(p.x, p.y, box, margin)) continue;
      p = projectOutsideBox(p.x, p.y, box, margin);
      moved = true;
    }
    if (!moved) break;
  }
  return p;
}

function ringMinClearance(
  points: readonly { x: number; y: number }[],
  boxes: readonly ContourClearBox[],
): number {
  let min = Infinity;
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    for (let s = 0; s <= 8; s += 1) {
      const t = s / 8;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      for (const box of boxes) {
        min = Math.min(min, pointClearance(x, y, box));
      }
    }
  }
  return min;
}

/**
 * Push ring vertices (and invading chord midpoints) outside every card by
 * `margin` px. Handles CW/CCW C-notch rings without global inflate.
 */
export function nudgeContourClearOfBoxes(
  points: readonly { x: number; y: number }[],
  boxes: readonly ContourClearBox[],
  margin: number,
): { x: number; y: number }[] {
  if (points.length < 2 || boxes.length === 0 || margin <= 0) {
    return points.map((p) => ({ x: p.x, y: p.y }));
  }

  if (ringMinClearance(points, boxes) >= margin) {
    return points.map((p) => ({ x: p.x, y: p.y }));
  }

  let ring = points.map((p) => pushPoint(p.x, p.y, boxes, margin));

  for (let pass = 0; pass < 10; pass += 1) {
    const next: { x: number; y: number }[] = [];
    let split = false;
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      next.push(a);
      for (let s = 1; s < 4; s += 1) {
        const t = s / 4;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        for (const box of boxes) {
          if (pointClearance(x, y, box) < margin - 1e-6) {
            next.push(pushPoint(x, y, boxes, margin));
            split = true;
            break;
          }
        }
      }
    }
    ring = next.map((p) => pushPoint(p.x, p.y, boxes, margin));
    if (!split && ringMinClearance(ring, boxes) >= margin - 1e-6) break;
  }

  return ring;
}

/** Stroke half-width plus option-A card inset breathing room. */
export function contourCardClearanceMargin(strokeWidth: number): number {
  return strokeWidth / 2 + 2;
}

/** @deprecated kept for unit tests — signed screen-left inflate. */
export function inflateClosedRing(
  points: readonly { x: number; y: number }[],
  amount: number,
): { x: number; y: number }[] {
  const n = points.length;
  if (n < 3 || amount === 0) {
    return points.map((p) => ({ x: p.x, y: p.y }));
  }
  let area = 0;
  for (let i = 0; i < n; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    area += a.x * b.y - b.x * a.y;
  }
  const sign = area >= 0 ? 1 : -1;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i - 1 + n) % n]!;
    const curr = points[i]!;
    const next = points[(i + 1) % n]!;
    const e0x = curr.x - prev.x;
    const e0y = curr.y - prev.y;
    const e1x = next.x - curr.x;
    const e1y = next.y - curr.y;
    const l0 = Math.hypot(e0x, e0y) || 1;
    const l1 = Math.hypot(e1x, e1y) || 1;
    const n0x = (e0y / l0) * sign;
    const n0y = (-e0x / l0) * sign;
    const n1x = (e1y / l1) * sign;
    const n1y = (-e1x / l1) * sign;
    let nx = n0x + n1x;
    let ny = n0y + n1y;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    out.push({ x: curr.x + nx * amount, y: curr.y + ny * amount });
  }
  return out;
}
