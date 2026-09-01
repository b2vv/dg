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

/** Person card AABB keyed for magnetic cluster paint (button-group). */
export interface ContourMemberBox extends ContourClearBox {
  positionId: string;
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

/**
 * Does a point sit closer to any card than the margin allows?
 *
 * Lifted out of the ring walk so the loop reads as «sample the segment, push
 * what intrudes» instead of five nested blocks that never named the question.
 */
function pointIntrudes(
  x: number,
  y: number,
  boxes: readonly ContourClearBox[],
  margin: number,
): boolean {
  for (const box of boxes) {
    if (pointClearance(x, y, box) < margin - 1e-6) return true;
  }
  return false;
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
        if (pointIntrudes(x, y, boxes, margin)) {
          next.push(pushPoint(x, y, boxes, margin));
          split = true;
        }
      }
    }
    ring = next.map((p) => pushPoint(p.x, p.y, boxes, margin));
    if (!split && ringMinClearance(ring, boxes) >= margin - 1e-6) break;
  }

  return ring;
}

/** Own-card AABB padding (G7-lite) beyond stroke half-width, in world px. */
export const CONTOUR_OWN_PADDING_PX = 6;

/** Stroke half-width plus own-AABB breathing room (G7-lite). */
export function contourCardClearanceMargin(strokeWidth: number): number {
  return strokeWidth / 2 + CONTOUR_OWN_PADDING_PX;
}
