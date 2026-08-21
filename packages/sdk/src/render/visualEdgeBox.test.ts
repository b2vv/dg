import { describe, expect, it } from 'vitest';
import { staffEdgeEndpoints } from './staffEdgeGeometry.js';
import {
  mapStaffEdgeBoxesForLod,
  visualOrgEdgeBox,
  visualPersonEdgeBox,
} from './visualEdgeBox.js';

const full = { id: 'p', x: 10, y: 20, width: 136, height: 156 };

describe('visualPersonEdgeBox', () => {
  it('success: near keeps layout AABB', () => {
    expect(visualPersonEdgeBox(full, 'near')).toEqual(full);
  });

  it('success: mid shortens height and centers in layout AABB', () => {
    const mid = visualPersonEdgeBox(full, 'mid');
    expect(mid.x).toBe(10);
    expect(mid.width).toBe(136);
    expect(mid.height).toBe(Math.min(156, Math.max(56, 156 * 0.48)));
    expect(mid.y).toBeCloseTo(20 + (156 - mid.height) / 2);
  });

  it('success: far docks to centered dot, not full card rim', () => {
    const far = visualPersonEdgeBox(full, 'far');
    const r = Math.max(6, Math.min(136, 156) * 0.18);
    expect(far.width).toBeCloseTo(r * 2);
    expect(far.height).toBeCloseTo(r * 2);
    expect(far.x + far.width / 2).toBeCloseTo(10 + 68);
    expect(far.y + far.height / 2).toBeCloseTo(20 + 78);
  });

  it('success: mid vertical edge ports sit on mid-card bottom/top', () => {
    const mgr = visualPersonEdgeBox(
      { id: 'mgr', x: 0, y: 0, width: 136, height: 156 },
      'mid',
    );
    const rep = visualPersonEdgeBox(
      { id: 'rep', x: 0, y: 200, width: 136, height: 156 },
      'mid',
    );
    const ep = staffEdgeEndpoints(mgr, rep);
    expect(ep.y1).toBe(mgr.y + mgr.height);
    expect(ep.y2).toBe(rep.y);
    expect(mgr.y).toBeGreaterThan(0); // not top-aligned at layout y
    expect(ep.y1).toBeLessThan(156); // not full-card bottom
  });

  it('failure: far ports must not use full-card bottom (layout bug)', () => {
    const a = visualPersonEdgeBox(full, 'far');
    const b = visualPersonEdgeBox(
      { id: 'q', x: 10, y: 200, width: 136, height: 156 },
      'far',
    );
    const ep = staffEdgeEndpoints(a, b);
    expect(ep.y1).toBeLessThan(full.y + full.height - 1);
  });
});

describe('visualOrgEdgeBox / mapStaffEdgeBoxesForLod', () => {
  it('success: far org uses symbol chip', () => {
    const org = { id: 'o', x: 0, y: 0, width: 200, height: 64 };
    const far = visualOrgEdgeBox(org, 'far', 36);
    expect(far.width).toBe(36);
    expect(far.height).toBe(36);
    expect(far.y).toBeCloseTo((64 - 36) / 2);
  });

  it('success: mapper applies person+org for lod', () => {
    const boxes = mapStaffEdgeBoxesForLod(
      [full],
      [{ id: 'o', x: 0, y: 0, width: 200, height: 64 }],
      'mid',
    );
    expect(boxes).toHaveLength(2);
    expect(boxes[0]!.height).toBeLessThan(156);
    expect(boxes[1]!.height).toBe(64);
  });
});
