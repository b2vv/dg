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
  /** Orthogonal polyline between card ports. */
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

/**
 * Orthogonal route that picks ports from relative geometry:
 * - peer / matrix / same-row → side centers + mid-X elbow
 * - child below → parent bottom → child top
 * - child above → parent top → child bottom
 */
export function staffEdgePolyline(
  from: StaffEdgeBox,
  to: StaffEdgeBox,
  kind: StaffEdgeLink['kind'] = 'admin',
): StaffEdgePoint[] {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;

  const rowBand = Math.max(from.height, to.height) * 0.55;
  const horizontal =
    kind === 'matrix' || kind === 'dotted' || Math.abs(toCy - fromCy) < rowBand;

  if (horizontal) {
    const goRight = toCx >= fromCx;
    const x1 = goRight ? from.x + from.width : from.x;
    const y1 = fromCy;
    const x2 = goRight ? to.x : to.x + to.width;
    const y2 = toCy;
    if (Math.abs(y1 - y2) < 0.5) {
      return [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ];
    }
    const midX = x1 + (x2 - x1) / 2;
    return [
      { x: x1, y: y1 },
      { x: midX, y: y1 },
      { x: midX, y: y2 },
      { x: x2, y: y2 },
    ];
  }

  const childBelow = toCy > fromCy;
  const x1 = fromCx;
  const y1 = childBelow ? from.y + from.height : from.y;
  const x2 = toCx;
  const y2 = childBelow ? to.y : to.y + to.height;

  if (Math.abs(x1 - x2) < 0.5) {
    return [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
  }
  const midY = y1 + (y2 - y1) / 2;
  return [
    { x: x1, y: y1 },
    { x: x1, y: midY },
    { x: x2, y: midY },
    { x: x2, y: y2 },
  ];
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
