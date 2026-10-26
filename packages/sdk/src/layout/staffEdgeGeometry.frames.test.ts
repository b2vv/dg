import { describe, expect, it } from '@rstest/core';
import {
  buildStaffEdgeSegments,
  classifyStaffEdgeRoute,
  edgeIntrudesForeignFrame,
  polylineHitsBoxInterior,
  staffEdgePolyline,
} from './staffEdgeGeometry.js';
import type { StaffEdgeFrame, StaffEdgeLink } from './staffEdgeGeometry.js';

const from = { id: 'a', x: 0, y: 0, width: 40, height: 40 };
const to = { id: 'b', x: 200, y: 0, width: 40, height: 40 };
const direct = [{ x: 40, y: 20 }, { x: 200, y: 20 }];
const around = [
  { x: 20, y: 0 },
  { x: 20, y: -16 },
  { x: 220, y: -16 },
  { x: 220, y: 0 },
];

function foreignFrame(): StaffEdgeFrame {
  return {
    deptId: 'foreign',
    rect: { x: 80, y: 0, width: 80, height: 40 },
    memberIds: new Set(['other']),
  };
}

describe('staff edge department frames', () => {
  it('routes a non-member around a foreign frame that the legacy route crosses', () => {
    const frame = foreignFrame();
    const legacy = classifyStaffEdgeRoute(from, to, 'admin', []);
    expect(legacy).toEqual({ via: 'direct', points: direct });
    expect(polylineHitsBoxInterior(legacy.points, frame.rect)).toBe(true);

    const route = classifyStaffEdgeRoute(from, to, 'admin', [], [frame]);
    expect(route).toEqual({ via: 'around', points: around });
    expect(polylineHitsBoxInterior(route.points, frame.rect)).toBe(false);
  });

  it.each(['a', 'b'])('skips the native frame when endpoint %s is a member', (memberId) => {
    const frame: StaffEdgeFrame = {
      deptId: 'native',
      rect: { x: -20, y: -20, width: 280, height: 80 },
      memberIds: new Set([memberId]),
    };
    expect(polylineHitsBoxInterior(direct, frame.rect)).toBe(true);
    expect(classifyStaffEdgeRoute(from, to, 'admin', [], [frame])).toEqual({
      via: 'direct', points: direct,
    });
    expect(edgeIntrudesForeignFrame(direct, from, to, [frame])).toBe(false);
  });

  it('forwards frames through polyline and segment builders without mutating inputs', () => {
    const frames = [foreignFrame()];
    const boxes = [from, to];
    const edges: StaffEdgeLink[] = [{ fromId: 'a', toId: 'b', kind: 'admin' }];
    const before = structuredClone({ frames, boxes, edges });
    expect(staffEdgePolyline(from, to, 'admin', boxes, frames)).toEqual(around);
    expect(buildStaffEdgeSegments(edges, boxes, frames)).toEqual([{
      fromId: 'a', toId: 'b', kind: 'admin', points: around,
      x1: 20, y1: 0, x2: 220, y2: 0,
    }]);
    expect({ frames, boxes, edges }).toEqual(before);
  });

  it('keeps loose positions and existing card obstacles unchanged with no frames', () => {
    const boxes = [from, to, { id: 'card', x: 80, y: 0, width: 80, height: 40 }];
    const edges: StaffEdgeLink[] = [{ fromId: 'a', toId: 'b', kind: 'admin' }];
    expect(classifyStaffEdgeRoute(from, to, 'admin', [], [])).toEqual({
      via: 'direct', points: direct,
    });
    expect(classifyStaffEdgeRoute(from, to, 'admin', boxes, [])).toEqual(
      classifyStaffEdgeRoute(from, to, 'admin', boxes),
    );
    expect(staffEdgePolyline(from, to, 'admin', boxes, [])).toEqual(around);
    expect(buildStaffEdgeSegments(edges, boxes, [])).toEqual(buildStaffEdgeSegments(edges, boxes));
    expect(edgeIntrudesForeignFrame(direct, from, to, [])).toBe(false);
  });

  it('detects foreign frame intrusion but accepts an around route', () => {
    const frames = [foreignFrame()];
    expect(edgeIntrudesForeignFrame(direct, from, to, frames)).toBe(true);
    expect(edgeIntrudesForeignFrame(around, from, to, frames)).toBe(false);
  });

  it('detects intrusion in the unchanged unchecked forced fallback', () => {
    const frame: StaffEdgeFrame = {
      deptId: 'enclosing',
      rect: { x: -100, y: -100, width: 440, height: 240 },
      memberIds: new Set(['other']),
    };
    const route = classifyStaffEdgeRoute(from, to, 'admin', [], [frame]);
    expect(route.via).toBe('forced');
    expect(edgeIntrudesForeignFrame(route.points, from, to, [frame])).toBe(true);
  });
});
