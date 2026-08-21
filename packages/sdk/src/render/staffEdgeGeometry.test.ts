import { describe, expect, it } from 'vitest';
import {
  buildStaffEdgeSegments,
  staffEdgeEndpoints,
  staffEdgePolyline,
} from './staffEdgeGeometry.js';

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

  it('success: same-row peers use side ports (no mid-card rung)', () => {
    const from = { id: 'a', x: 0, y: 0, width: 100, height: 40 };
    const to = { id: 'b', x: 140, y: 0, width: 100, height: 40 };
    const pts = staffEdgePolyline(from, to, 'admin');
    expect(pts[0]).toEqual({ x: 100, y: 20 });
    expect(pts[pts.length - 1]).toEqual({ x: 140, y: 20 });
    expect(pts.every((p) => p.y === 20 || Math.abs(p.y - 20) < 0.1)).toBe(true);
  });

  it('success: matrix kind forces side routing even if staggered', () => {
    const from = { id: 'a', x: 0, y: 0, width: 80, height: 40 };
    const to = { id: 'b', x: 120, y: 30, width: 80, height: 40 };
    const pts = staffEdgePolyline(from, to, 'matrix');
    expect(pts[0]?.x).toBe(80);
    expect(pts[pts.length - 1]?.x).toBe(120);
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
    expect(segs[0]?.points).toHaveLength(2);
    expect(segs[1]?.kind).toBe('matrix');
    expect(segs[1]?.points[0]?.x).toBe(20);
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
