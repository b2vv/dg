/**
 * G2 / M2 on the paint path: keep foreign cards out of a department wash.
 *
 * The magnetic component's padded AABB is the starting shape (button-group
 * polish). Every foreign card that lands inside it is inflated by the corridor
 * gap (G2) and cut away, so a foreign position is never covered by the fill
 * (M2). Following G5 the cut is extended to the nearest reachable frame edge —
 * a rectangular notch, not an enclosed hole — and the direction order (right →
 * down → left → up) matches the Rust far-side preference (G6).
 *
 * `packages/core/src/contour.rs` stays the reference implementation for the
 * cell-space flood used by export/tests; this module is the synchronous
 * world-space equivalent for the canvas (T77-M01 Option B keeps the renderer
 * free of the WASM round-trip).
 */

import type { ContourClearBox } from './contourClearance.js';
import { CONTOUR_EPS, type ContourPoint } from './contourFillet.js';

/** Rect in world space — same shape the clearance helpers already pass around. */
export type ContourRect = ContourClearBox;

const EPS = CONTOUR_EPS;

export function aabbOfRects(rects: readonly ContourRect[]): ContourRect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function inflateRect(r: ContourRect, by: number): ContourRect {
  return { x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 };
}

export function intersectRects(a: ContourRect, b: ContourRect): ContourRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right - x <= EPS || bottom - y <= EPS) return null;
  return { x, y, width: right - x, height: bottom - y };
}

function overlapsAny(rect: ContourRect, others: readonly ContourRect[]): boolean {
  return others.some((o) => intersectRects(rect, o) !== null);
}

/** Corridor from `foreign` to one frame edge, clipped to the frame. */
function corridorTo(
  foreign: ContourRect,
  frame: ContourRect,
  side: 'right' | 'down' | 'left' | 'up',
): ContourRect {
  const right = frame.x + frame.width;
  const bottom = frame.y + frame.height;
  if (side === 'right') {
    return { x: foreign.x, y: foreign.y, width: right - foreign.x, height: foreign.height };
  }
  if (side === 'left') {
    return { x: frame.x, y: foreign.y, width: foreign.x + foreign.width - frame.x, height: foreign.height };
  }
  if (side === 'down') {
    return { x: foreign.x, y: foreign.y, width: foreign.width, height: bottom - foreign.y };
  }
  return { x: foreign.x, y: frame.y, width: foreign.width, height: foreign.y + foreign.height - frame.y };
}

/**
 * G5: widen a foreign cut into a notch that opens onto a frame edge. Prefers a
 * corridor that clears every own card; falls back to the shortest one when the
 * component encloses the foreign card on all sides.
 */
export function notchRect(
  foreign: ContourRect,
  frame: ContourRect,
  ownBoxes: readonly ContourRect[],
): ContourRect {
  const sides = ['right', 'down', 'left', 'up'] as const;
  const options = sides.map((side) => {
    const rect = corridorTo(foreign, frame, side);
    const length = side === 'right' || side === 'left' ? rect.width : rect.height;
    return { rect, length, clear: !overlapsAny(rect, ownBoxes) };
  });
  const clear = options.filter((o) => o.clear);
  const pool = clear.length > 0 ? clear : options;
  let best = pool[0]!;
  for (const option of pool) {
    if (option.length < best.length - EPS) best = option;
  }
  return best.rect;
}

function uniqueSorted(values: readonly number[]): number[] {
  const out = [...values].sort((a, b) => a - b);
  return out.filter((v, i) => i === 0 || v - out[i - 1]! > EPS);
}

function edgeKey(a: ContourPoint, b: ContourPoint): string {
  return `${a.x},${a.y}|${b.x},${b.y}`;
}

/** Boundary edges of the kept cells: an edge shared by two kept cells cancels. */
function boundaryEdges(
  xs: readonly number[],
  ys: readonly number[],
  kept: readonly boolean[][],
): Map<string, [ContourPoint, ContourPoint]> {
  const edges = new Map<string, [ContourPoint, ContourPoint]>();
  const add = (a: ContourPoint, b: ContourPoint) => {
    const twin = edgeKey(b, a);
    if (edges.delete(twin)) return;
    edges.set(edgeKey(a, b), [a, b]);
  };
  for (let i = 0; i < xs.length - 1; i += 1) {
    for (let j = 0; j < ys.length - 1; j += 1) {
      if (!kept[i]![j]) continue;
      const x0 = xs[i]!;
      const x1 = xs[i + 1]!;
      const y0 = ys[j]!;
      const y1 = ys[j + 1]!;
      // Clockwise winding so outer rings stay consistent for the fill.
      add({ x: x0, y: y0 }, { x: x1, y: y0 });
      add({ x: x1, y: y0 }, { x: x1, y: y1 });
      add({ x: x1, y: y1 }, { x: x0, y: y1 });
      add({ x: x0, y: y1 }, { x: x0, y: y0 });
    }
  }
  return edges;
}

function chainLoops(
  edges: Map<string, [ContourPoint, ContourPoint]>,
): ContourPoint[][] {
  const byStart = new Map<string, [ContourPoint, ContourPoint][]>();
  for (const edge of edges.values()) {
    const key = `${edge[0].x},${edge[0].y}`;
    const list = byStart.get(key) ?? [];
    list.push(edge);
    byStart.set(key, list);
  }
  const loops: ContourPoint[][] = [];
  for (const [, list] of byStart) {
    while (list.length > 0) {
      const start = list.pop()!;
      const loop: ContourPoint[] = [start[0]];
      let current = start[1];
      while (`${current.x},${current.y}` !== `${loop[0]!.x},${loop[0]!.y}`) {
        const next = byStart.get(`${current.x},${current.y}`);
        const edge = next?.pop();
        if (!edge) break;
        loop.push(current);
        current = edge[1];
      }
      if (loop.length >= 4) loops.push(mergeCollinearRing(loop));
    }
  }
  return loops;
}

/**
 * Drop vertices that sit in the middle of a straight run, so every remaining
 * vertex is a real corner with one vertical and one horizontal edge.
 */
export function mergeCollinearRing(loop: readonly ContourPoint[]): ContourPoint[] {
  const out: ContourPoint[] = [];
  for (let i = 0; i < loop.length; i += 1) {
    const prev = loop[(i - 1 + loop.length) % loop.length]!;
    const cur = loop[i]!;
    const next = loop[(i + 1) % loop.length]!;
    const straightX = Math.abs(prev.x - cur.x) < EPS && Math.abs(cur.x - next.x) < EPS;
    const straightY = Math.abs(prev.y - cur.y) < EPS && Math.abs(cur.y - next.y) < EPS;
    if (!straightX && !straightY) out.push(cur);
  }
  return out;
}

function signedArea(loop: readonly ContourPoint[]): number {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i]!;
    const b = loop[(i + 1) % loop.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/**
 * `frame` minus `cuts`, as closed orthogonal rings. Cuts that split the frame
 * yield one ring per remaining part; enclosed leftovers (holes) are dropped —
 * {@link notchRect} keeps cuts connected to an edge so they do not occur.
 */
export function subtractRects(
  frame: ContourRect,
  cuts: readonly ContourRect[],
): ContourPoint[][] {
  const clipped = cuts.map((c) => intersectRects(c, frame)).filter((c): c is ContourRect => !!c);
  if (clipped.length === 0) {
    return [
      [
        { x: frame.x, y: frame.y },
        { x: frame.x + frame.width, y: frame.y },
        { x: frame.x + frame.width, y: frame.y + frame.height },
        { x: frame.x, y: frame.y + frame.height },
      ],
    ];
  }
  const xs = uniqueSorted([frame.x, frame.x + frame.width, ...clipped.flatMap((c) => [c.x, c.x + c.width])]);
  const ys = uniqueSorted([frame.y, frame.y + frame.height, ...clipped.flatMap((c) => [c.y, c.y + c.height])]);
  const kept: boolean[][] = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    kept[i] = [];
    for (let j = 0; j < ys.length - 1; j += 1) {
      const cx = (xs[i]! + xs[i + 1]!) / 2;
      const cy = (ys[j]! + ys[j + 1]!) / 2;
      kept[i]![j] = !clipped.some(
        (c) => cx > c.x && cx < c.x + c.width && cy > c.y && cy < c.y + c.height,
      );
    }
  }
  return chainLoops(boundaryEdges(xs, ys, kept)).filter((loop) => Math.abs(signedArea(loop)) > EPS);
}

export interface NotchedRingsInput {
  /** Cards of one magnetic component. */
  memberBoxes: readonly ContourRect[];
  /** Every other card on the canvas — same dept other component counts as foreign (M1). */
  foreignBoxes: readonly ContourRect[];
  /** Padding between the cards and the frame. */
  margin: number;
  /** G2 minimum gap between the contour and a foreign card. */
  corridor: number;
}

/** Padded component frame with every intruding foreign card notched out. */
export function notchedRings(input: NotchedRingsInput): ContourPoint[][] {
  const own = aabbOfRects(input.memberBoxes);
  if (!own) return [];
  const frame = inflateRect(own, input.margin);
  const cuts: ContourRect[] = [];
  for (const foreign of input.foreignBoxes) {
    const inflated = inflateRect(foreign, input.corridor);
    if (!intersectRects(inflated, frame)) continue;
    cuts.push(notchRect(inflated, frame, input.memberBoxes));
  }
  return subtractRects(frame, cuts);
}
