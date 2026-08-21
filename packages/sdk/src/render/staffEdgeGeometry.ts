export interface StaffEdgeBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  box: StaffEdgeBox,
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
  box: StaffEdgeBox,
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

/**
 * Orthogonal route by relative geometry.
 * Prefer clear vertical/horizontal gaps; if boxes overlap, lane around them.
 */
export function staffEdgePolyline(
  from: StaffEdgeBox,
  to: StaffEdgeBox,
  kind: StaffEdgeLink['kind'] = 'admin',
): StaffEdgePoint[] {
  const fromCy = from.y + from.height / 2;
  const toCy = to.y + to.height / 2;
  const sameBand = Math.abs(toCy - fromCy) < Math.min(from.height, to.height) * 0.35;
  const preferHorizontal = kind === 'matrix' || kind === 'dotted' || sameBand;

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
    if (isClean(c, from, to)) return c;
  }

  // Overlap / blocked gap — go around. Prefer lane routes even if they graze
  // overlapping AABBs (orthogonal exterior is still better than center-cuts).
  const preferTop = kind === 'matrix' || kind === 'dotted' || sameBand;
  return preferTop ? aroundTopPolyline(from, to) : aroundLeftPolyline(from, to);
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
    const points = staffEdgePolyline(from, to, edge.kind);
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
