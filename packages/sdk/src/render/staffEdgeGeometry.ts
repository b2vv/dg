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

export interface StaffEdgeSegment {
  fromId: string;
  toId: string;
  kind: StaffEdgeLink['kind'];
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
    out.push({
      fromId: edge.fromId,
      toId: edge.toId,
      kind: edge.kind,
      ...staffEdgeEndpoints(from, to),
    });
  }
  return out;
}
