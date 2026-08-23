import { describe, expect, it } from 'vitest';
import {
  buildStaffEdgeSegments,
  polylineHitsBoxInterior,
  staffEdgeEndpoints,
  staffEdgePolyline,
} from './staffEdgeGeometry.js';

function pointOnBorder(
  p: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number },
  tol = 1,
): boolean {
  const onLeft = Math.abs(p.x - box.x) <= tol && p.y >= box.y - tol && p.y <= box.y + box.height + tol;
  const onRight =
    Math.abs(p.x - (box.x + box.width)) <= tol &&
    p.y >= box.y - tol &&
    p.y <= box.y + box.height + tol;
  const onTop = Math.abs(p.y - box.y) <= tol && p.x >= box.x - tol && p.x <= box.x + box.width + tol;
  const onBottom =
    Math.abs(p.y - (box.y + box.height)) <= tol &&
    p.x >= box.x - tol &&
    p.x <= box.x + box.width + tol;
  return onLeft || onRight || onTop || onBottom;
}

describe('staffEdgeGeometry', () => {
  it('success: child below → parent bottom to child top', () => {
    const from = { id: 'mgr', x: 0, y: 0, width: 100, height: 40 };
    const to = { id: 'rep', x: 50, y: 100, width: 100, height: 40 };
    expect(staffEdgeEndpoints(from, to)).toEqual({
      x1: 50,
      y1: 40,
      x2: 100,
      y2: 100,
    });
  });

  it('success: child above → parent top to child bottom', () => {
    const from = { id: 'mgr', x: 50, y: 100, width: 100, height: 40 };
    const to = { id: 'rep', x: 0, y: 0, width: 100, height: 40 };
    expect(staffEdgeEndpoints(from, to)).toEqual({
      x1: 100,
      y1: 100,
      x2: 50,
      y2: 40,
    });
  });

  it('success: aligned vertical uses a straight segment', () => {
    const from = { id: 'mgr', x: 0, y: 0, width: 100, height: 40 };
    const to = { id: 'rep', x: 0, y: 100, width: 100, height: 40 };
    expect(staffEdgePolyline(from, to)).toEqual([
      { x: 50, y: 40 },
      { x: 50, y: 100 },
    ]);
  });

  it('success: staggered vertical uses an orthogonal elbow', () => {
    const from = { id: 'mgr', x: 0, y: 0, width: 100, height: 40 };
    const to = { id: 'rep', x: 50, y: 100, width: 100, height: 40 };
    expect(staffEdgePolyline(from, to)).toEqual([
      { x: 50, y: 40 },
      { x: 50, y: 70 },
      { x: 100, y: 70 },
      { x: 100, y: 100 },
    ]);
  });

  it('success: same-row peers with clear gap use side ports', () => {
    const from = { id: 'a', x: 0, y: 0, width: 100, height: 40 };
    const to = { id: 'b', x: 140, y: 0, width: 100, height: 40 };
    const pts = staffEdgePolyline(from, to, 'admin');
    expect(pts[0]).toEqual({ x: 100, y: 20 });
    expect(pts[pts.length - 1]).toEqual({ x: 140, y: 20 });
    expect(polylineHitsBoxInterior(pts, from)).toBe(false);
    expect(polylineHitsBoxInterior(pts, to)).toBe(false);
  });

  it('regression: overlapping cards keep endpoints on borders (no inverted through-cut)', () => {
    const from = { id: 'a', x: 0, y: 0, width: 100, height: 80 };
    const to = { id: 'b', x: 40, y: 20, width: 100, height: 80 };
    const pts = staffEdgePolyline(from, to, 'admin');
    const last = pts[pts.length - 1]!;
    expect(pointOnBorder(pts[0]!, from)).toBe(true);
    expect(pointOnBorder(last, to)).toBe(true);
    const invertedThrough =
      pts.length === 2 && pts[0]!.x > pts[1]!.x && pts[0]!.y === pts[1]!.y;
    expect(invertedThrough).toBe(false);
  });

  it('regression: matrix peers with clear gap stay outside endpoint cards', () => {
    const a = { id: 'a', x: 0, y: 0, width: 80, height: 40 };
    const c = { id: 'c', x: 200, y: 0, width: 80, height: 40 };
    const pts = staffEdgePolyline(a, c, 'matrix');
    expect(polylineHitsBoxInterior(pts, a)).toBe(false);
    expect(polylineHitsBoxInterior(pts, c)).toBe(false);
  });

  it('regression: clear vertical gap admin does not cross card interiors', () => {
    const from = { id: 'mgr', x: 0, y: 0, width: 128, height: 148 };
    const to = { id: 'rep', x: 40, y: 180, width: 128, height: 148 };
    const pts = staffEdgePolyline(from, to, 'admin');
    expect(polylineHitsBoxInterior(pts, from)).toBe(false);
    expect(polylineHitsBoxInterior(pts, to)).toBe(false);
    expect(pts[0]?.y).toBe(148);
    expect(pts[pts.length - 1]?.y).toBe(180);
  });

  it('regression: slightly offset but overlapping staff cards stay border-anchored', () => {
    const from = { id: 'mgr', x: 0, y: 0, width: 128, height: 148 };
    const to = { id: 'rep', x: 40, y: 70, width: 128, height: 148 };
    const pts = staffEdgePolyline(from, to, 'admin');
    expect(pointOnBorder(pts[0]!, from)).toBe(true);
    expect(pointOnBorder(pts[pts.length - 1]!, to)).toBe(true);
  });

  it('cross-tier: head above org card uses vertical bottom→top route', () => {
    const head = { id: 'pos-head', x: 200, y: 0, width: 248, height: 72 };
    const orgCard = { id: 'unit-current', x: 180, y: 320, width: 220, height: 56 };
    const pts = staffEdgePolyline(head, orgCard, 'cross-tier');
    expect(pts[0]).toEqual({ x: 324, y: 72 });
    expect(pts[pts.length - 1]).toEqual({ x: 290, y: 320 });
  });

  it('success: builds segments for known endpoints', () => {
    const segs = buildStaffEdgeSegments(
      [
        { fromId: 'a', toId: 'b', kind: 'admin' },
        { fromId: 'a', toId: 'c', kind: 'matrix' },
      ],
      [
        { id: 'a', x: 0, y: 0, width: 20, height: 10 },
        { id: 'b', x: 0, y: 40, width: 20, height: 10 },
        { id: 'c', x: 40, y: 0, width: 20, height: 10 },
      ],
    );
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ fromId: 'a', toId: 'b', kind: 'admin', x1: 10, y1: 10 });
    expect(segs[1]?.kind).toBe('matrix');
  });

  it('failure: missing endpoint skipped', () => {
    expect(
      buildStaffEdgeSegments([{ fromId: 'a', toId: 'missing', kind: 'admin' }], [
        { id: 'a', x: 0, y: 0, width: 10, height: 10 },
      ]),
    ).toEqual([]);
  });

  it('failure: empty edges → empty', () => {
    expect(buildStaffEdgeSegments([], [{ id: 'a', x: 0, y: 0, width: 1, height: 1 }])).toEqual([]);
  });
});
