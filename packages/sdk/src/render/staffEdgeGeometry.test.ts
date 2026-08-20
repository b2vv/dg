import { describe, expect, it } from 'vitest';
import {
  buildStaffEdgeSegments,
  staffEdgeEndpoints,
  staffEdgePolyline,
} from './staffEdgeGeometry.js';

describe('staffEdgeGeometry', () => {
  it('success: parent bottom-center to child top-center', () => {
    const from = { id: 'mgr', x: 0, y: 0, width: 100, height: 40 };
    const to = { id: 'rep', x: 50, y: 100, width: 100, height: 40 };
    expect(staffEdgeEndpoints(from, to)).toEqual({
      x1: 50,
      y1: 40,
      x2: 100,
      y2: 100,
    });
  });

  it('success: aligned nodes use a straight segment', () => {
    const from = { id: 'mgr', x: 0, y: 0, width: 100, height: 40 };
    const to = { id: 'rep', x: 0, y: 100, width: 100, height: 40 };
    expect(staffEdgePolyline(from, to)).toEqual([
      { x: 50, y: 40 },
      { x: 50, y: 100 },
    ]);
  });

  it('success: staggered nodes use an orthogonal elbow', () => {
    const from = { id: 'mgr', x: 0, y: 0, width: 100, height: 40 };
    const to = { id: 'rep', x: 50, y: 100, width: 100, height: 40 };
    expect(staffEdgePolyline(from, to)).toEqual([
      { x: 50, y: 40 },
      { x: 50, y: 70 },
      { x: 100, y: 70 },
      { x: 100, y: 100 },
    ]);
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
        { id: 'c', x: 40, y: 40, width: 20, height: 10 },
      ],
    );
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ fromId: 'a', toId: 'b', kind: 'admin', x1: 10, y1: 10 });
    expect(segs[0]?.points).toHaveLength(2);
    expect(segs[1]?.kind).toBe('matrix');
    expect(segs[1]?.points.length).toBeGreaterThan(2);
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
