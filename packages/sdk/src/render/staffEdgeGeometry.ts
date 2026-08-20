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
  /** Orthogonal polyline: parent bottom → child top. */
  points: StaffEdgePoint[];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Parent bottom-center → child top-center (fromId = manager). */
export function staffEdgeEndpoints(
  from: StaffEdgeBox,
  to: StaffEdgeBox,
): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: from.x + from.width / 2,
    y1: from.y + from.height,
    x2: to.x + to.width / 2,
    y2: to.y,
  };
}

/**
 * Orthogonal elbow (or straight when aligned).
 * Avoids diagonal “crooked” report lines between staggered cards.
 */
export function staffEdgePolyline(from: StaffEdgeBox, to: StaffEdgeBox): StaffEdgePoint[] {
  const { x1, y1, x2, y2 } = staffEdgeEndpoints(from, to);
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
    const points = staffEdgePolyline(from, to);
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
