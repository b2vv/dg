/** Near LOD edge hints when layout chrome is smaller than the layout cell. */
export type PersonEdgeVisualHints =
  | {
      layout: 'gojs-row';
      cardY: number;
      cardH: number;
      countBarH: number;
    }
  | {
      /** Figma seat: ports sit on the avatar tile, not the full text row. */
      layout: 'figma-row';
      tileX: number;
      tileY: number;
      tileSize: number;
    };

export interface StaffEdgeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StaffEdgeBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  personEdgeHints?: PersonEdgeVisualHints;
  /**
   * Area other routes must avoid when it is larger than the port box — a
   * chrome-less Figma seat docks edges on its 40px tile but still owns the
   * whole text row.
   */
  obstacle?: { x: number; y: number; width: number; height: number };
}

/** Area a route must not cut through: the declared obstacle, else the port box. */
export function routerObstacle(box: StaffEdgeBox): StaffEdgeRect {
  const { x, y, width, height } = box.obstacle ?? box;
  return { x, y, width, height };
}

export interface StaffEdgeLink {
  fromId: string;
  toId: string;
  kind: 'admin' | 'matrix' | 'dotted' | 'cross-tier';
}

export interface StaffEdgePoint {
  x: number;
  y: number;
}

export interface StaffEdgeSegment {
  fromId: string;
  toId: string;
  kind: StaffEdgeLink['kind'];
  points: StaffEdgePoint[];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** First/last ports of the adaptive orthogonal route. */
export function staffEdgeEndpoints(
  from: StaffEdgeBox,
  to: StaffEdgeBox,
  kind: StaffEdgeLink['kind'] = 'admin',
): { x1: number; y1: number; x2: number; y2: number } {
  const pts = staffEdgePolyline(from, to, kind);
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  return { x1: first.x, y1: first.y, x2: last.x, y2: last.y };
}

function boxesOverlap(a: StaffEdgeBox, b: StaffEdgeBox, gap = 0.5): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

/** Exit left sides and run in a lane left of both cards (no interior crossing). */
function aroundLeftPolyline(from: StaffEdgeBox, to: StaffEdgeBox): StaffEdgePoint[] {
  const pad = 16;
  const laneX = Math.min(from.x, to.x) - pad;
  const fromCy = from.y + from.height / 2;
  const toCy = to.y + to.height / 2;
  return [
    { x: from.x, y: fromCy },
    { x: laneX, y: fromCy },
    { x: laneX, y: toCy },
    { x: to.x, y: toCy },
  ];
}

/** Exit tops and run in a lane above both cards. */
function aroundTopPolyline(from: StaffEdgeBox, to: StaffEdgeBox): StaffEdgePoint[] {
  const pad = 16;
  const laneY = Math.min(from.y, to.y) - pad;
  const fromCx = from.x + from.width / 2;
  const toCx = to.x + to.width / 2;
  return [
    { x: fromCx, y: from.y },
    { x: fromCx, y: laneY },
    { x: toCx, y: laneY },
    { x: toCx, y: to.y },
  ];
}

function verticalPolyline(from: StaffEdgeBox, to: StaffEdgeBox): StaffEdgePoint[] | null {
  const fromCx = from.x + from.width / 2;
  const toCx = to.x + to.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCy = to.y + to.height / 2;
  const childBelow = toCy >= fromCy;

  if (childBelow) {
    const y1 = from.y + from.height;
    const y2 = to.y;
    if (y1 > y2 - 0.5) return null; // no clear vertical gap
    const x1 = fromCx;
    const x2 = toCx;
    if (Math.abs(x1 - x2) < 0.5) {
      return [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ];
    }
    const midY = (y1 + y2) / 2;
    return [
      { x: x1, y: y1 },
      { x: x1, y: midY },
      { x: x2, y: midY },
      { x: x2, y: y2 },
    ];
  }

  const y1 = from.y;
  const y2 = to.y + to.height;
  if (y2 > y1 - 0.5) return null;
  const x1 = fromCx;
  const x2 = toCx;
  if (Math.abs(x1 - x2) < 0.5) {
    return [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
  }
  const midY = (y1 + y2) / 2;
  return [
    { x: x1, y: y1 },
    { x: x1, y: midY },
    { x: x2, y: midY },
    { x: x2, y: y2 },
  ];
}

/**
 * Side ports only when there is a clear horizontal gap between AABBs.
 * midX sits in the gap (never inside either endpoint card).
 */
function horizontalPolyline(from: StaffEdgeBox, to: StaffEdgeBox): StaffEdgePoint[] | null {
  const fromCx = from.x + from.width / 2;
  const toCx = to.x + to.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCy = to.y + to.height / 2;
  const fromRight = from.x + from.width;
  const toRight = to.x + to.width;
  const goRight = toCx >= fromCx;
  const clearGap = goRight ? fromRight <= to.x + 0.5 : toRight <= from.x + 0.5;
  if (!clearGap) return null;

  const x1 = goRight ? fromRight : from.x;
  const y1 = fromCy;
  const x2 = goRight ? to.x : toRight;
  const y2 = toCy;
  if (Math.abs(y1 - y2) < 0.5) {
    return [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
  }
  const midX = goRight ? (fromRight + to.x) / 2 : (toRight + from.x) / 2;
  return [
    { x: x1, y: y1 },
    { x: midX, y: y1 },
    { x: midX, y: y2 },
    { x: x2, y: y2 },
  ];
}

/** True if an open segment between a→b enters the interior of `box`. */
export function segmentHitsBoxInterior(
  a: StaffEdgePoint,
  b: StaffEdgePoint,
  box: StaffEdgeRect,
  eps = 0.75,
): boolean {
  const left = box.x + eps;
  const right = box.x + box.width - eps;
  const top = box.y + eps;
  const bottom = box.y + box.height - eps;
  if (right <= left || bottom <= top) return false;

  const samples = 8;
  for (let i = 1; i < samples; i += 1) {
    const t = i / samples;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (x > left && x < right && y > top && y < bottom) return true;
  }
  return false;
}

export function polylineHitsBoxInterior(
  points: StaffEdgePoint[],
  box: StaffEdgeRect,
  eps = 0.75,
): boolean {
  for (let i = 0; i < points.length - 1; i += 1) {
    if (segmentHitsBoxInterior(points[i]!, points[i + 1]!, box, eps)) return true;
  }
  return false;
}

function isClean(points: StaffEdgePoint[], from: StaffEdgeBox, to: StaffEdgeBox): boolean {
  return !polylineHitsBoxInterior(points, from) && !polylineHitsBoxInterior(points, to);
}

export type StaffEdgeRouteVia = 'direct' | 'around' | 'forced';

export interface StaffEdgeRoute {
  via: StaffEdgeRouteVia;
  points: StaffEdgePoint[];
}

/**
 * Same router as `staffEdgePolyline`, tagged by which branch won.
 * `forced` is the last around-lane, returned without a cleanliness check.
 */
/**
 * Obstacle boxes sorted by top edge, so an edge only looks at its own band.
 *
 * Rejecting by bounding box cut the constant but not the order: every edge
 * still walked every card, so the router stayed n². The index is built once
 * per obstacle array and cached on its identity — `mapStaffEdgeBoxesForLod`
 * returns a fresh array per render, so a cached index is never stale, and a
 * WeakMap lets it go when the render's boxes do.
 */
interface ObstacleIndex {
  sorted: StaffEdgeBox[];
  /** `sorted[i]`'s top edge, kept apart so the search reads one flat array. */
  tops: number[];
  /** The tallest box, which is how far above a band an overlap can begin. */
  maxHeight: number;
}

const obstacleIndexCache = new WeakMap<StaffEdgeBox[], ObstacleIndex>();

function obstacleIndexFor(obstacles: StaffEdgeBox[]): ObstacleIndex {
  const cached = obstacleIndexCache.get(obstacles);
  if (cached) return cached;
  const sorted = [...obstacles].sort((a, b) => (a.obstacle ?? a).y - (b.obstacle ?? b).y);
  const tops = sorted.map((b) => (b.obstacle ?? b).y);
  let maxHeight = 0;
  for (const b of sorted) {
    const h = (b.obstacle ?? b).height;
    if (h > maxHeight) maxHeight = h;
  }
  const index: ObstacleIndex = { sorted, tops, maxHeight };
  obstacleIndexCache.set(obstacles, index);
  return index;
}

/** First position whose top is >= `y`. */
function lowerBound(tops: number[], y: number): number {
  let lo = 0;
  let hi = tops.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tops[mid]! < y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function classifyStaffEdgeRoute(
  from: StaffEdgeBox,
  to: StaffEdgeBox,
  kind: StaffEdgeLink['kind'] = 'admin',
  obstacles: StaffEdgeBox[] = [],
): StaffEdgeRoute {
  const fromCy = from.y + from.height / 2;
  const toCy = to.y + to.height / 2;
  const sameBand = Math.abs(toCy - fromCy) < Math.min(from.height, to.height) * 0.35;
  const preferHorizontal = kind === 'matrix' || kind === 'dotted' || sameBand;

  // Neither the array nor the per-pair rectangle is allocated any more.
  //
  // `obstacles` is every card on the canvas, and this routine runs once per
  // edge, so `filter` here built a fresh ~4000-element array per edge — 15.5M
  // copies for one staff window — and `routerObstacle` allocated a rectangle
  // for every (edge, box) pair on top of that. Measured at 855ms of a 1.2s
  // render, growing as n² (report §12).
  //
  // The bounding-box reject in front of the segment walk is exact rather than
  // approximate: an interior hit requires real penetration, so two rectangles
  // that do not overlap at all cannot produce one. The 1px inflation is slack
  // against `polylineHitsBoxInterior`'s own epsilon.
  const blocked = (line: StaffEdgePoint[]): boolean => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of line) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    // Start above the band by the tallest box: a card whose top sits higher can
    // still reach into the band, and starting exactly at `minY` would miss it.
    const { sorted, tops, maxHeight } = obstacleIndexFor(obstacles);
    for (let i = lowerBound(tops, minY - 1 - maxHeight); i < sorted.length; i += 1) {
      const box = sorted[i]!;
      const r = box.obstacle ?? box;
      if (r.y > maxY + 1) break;
      if (box.id === from.id || box.id === to.id) continue;
      if (r.x > maxX + 1 || r.x + r.width < minX - 1 || r.y + r.height < minY - 1) continue;
      if (polylineHitsBoxInterior(line, routerObstacle(box))) return true;
    }
    return false;
  };
  const hasOthers = obstacles.some((b) => b.id !== from.id && b.id !== to.id);

  // Cross-tier prefers the straight vertical drop, but only when it stays clear
  // of foreign cards — otherwise it falls through to the shared candidate/around
  // ladder (the drop used to clip whatever sat under the parent).
  if (kind === 'cross-tier') {
    const vert = verticalPolyline(from, to);
    if (
      vert &&
      isClean(vert, from, to) &&
      !blocked(vert)
    ) {
      return { via: 'direct', points: vert };
    }
  }

  const candidates: StaffEdgePoint[][] = [];
  if (preferHorizontal) {
    const side = horizontalPolyline(from, to);
    if (side) candidates.push(side);
    const vert = verticalPolyline(from, to);
    if (vert) candidates.push(vert);
  } else {
    const vert = verticalPolyline(from, to);
    if (vert) candidates.push(vert);
    const side = horizontalPolyline(from, to);
    if (side) candidates.push(side);
  }

  for (const c of candidates) {
    if (!isClean(c, from, to)) continue;
    if (blocked(c)) continue;
    return { via: 'direct', points: c };
  }

  const preferTop = kind === 'matrix' || kind === 'dotted' || sameBand || hasOthers;
  const around = preferTop ? aroundTopPolyline(from, to) : aroundLeftPolyline(from, to);
  if (!blocked(around)) {
    return { via: 'around', points: around };
  }
  const alt = preferTop ? aroundLeftPolyline(from, to) : aroundTopPolyline(from, to);
  return { via: 'forced', points: alt };
}

/**
 * Orthogonal route by relative geometry.
 * Prefer clear vertical/horizontal gaps; if boxes overlap, lane around them.
 * Optional `obstacles` (other cards) force a lane route when the direct path
 * would cut through them — critical for matrix org trees.
 */
export function staffEdgePolyline(
  from: StaffEdgeBox,
  to: StaffEdgeBox,
  kind: StaffEdgeLink['kind'] = 'admin',
  obstacles: StaffEdgeBox[] = [],
): StaffEdgePoint[] {
  return classifyStaffEdgeRoute(from, to, kind, obstacles).points;
}

export function staffEdgePolylineToSvg(points: StaffEdgePoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first!.x} ${first!.y}`;
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

export function buildStaffEdgeSegments(
  edges: StaffEdgeLink[],
  boxes: StaffEdgeBox[],
): StaffEdgeSegment[] {
  const byId = new Map(boxes.map((b) => [b.id, b]));
  const out: StaffEdgeSegment[] = [];
  for (const edge of edges) {
    const from = byId.get(edge.fromId);
    const to = byId.get(edge.toId);
    if (!from || !to) continue;
    const points = staffEdgePolyline(from, to, edge.kind, boxes);
    const first = points[0]!;
    const last = points[points.length - 1]!;
    out.push({
      fromId: edge.fromId,
      toId: edge.toId,
      kind: edge.kind,
      points,
      x1: first.x,
      y1: first.y,
      x2: last.x,
      y2: last.y,
    });
  }
  return out;
}

export { boxesOverlap };
