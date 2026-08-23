import { describe, expect, it } from 'vitest';
import { staffEdgeEndpoints } from './staffEdgeGeometry.js';
import {
  mapPositionNodesToStaffEdgeBoxes,
  mapStaffEdgeBoxesForLod,
  staffEdgeBoxForPosition,
  visualOrgEdgeBox,
  visualPersonEdgeBox,
} from './visualEdgeBox.js';
import type { DiagramPosition } from '../data/types.js';
import type { PersonNodeStyle } from './types.js';

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

  it('success: near Variant B admin ports dock to card borders (T44 A2)', () => {
    const p2 = { id: 'P2', x: 0, y: 0, width: 136, height: 156 };
    const p4 = { id: 'P4', x: 0, y: 200, width: 136, height: 156 };
    const near2 = visualPersonEdgeBox(p2, 'near');
    const near4 = visualPersonEdgeBox(p4, 'near');
    const ep = staffEdgeEndpoints(near2, near4);
    expect(ep.y1).toBe(near2.y + near2.height);
    expect(ep.y2).toBe(near4.y);
    expect(ep.x1).toBeCloseTo(near2.x + near2.width / 2);
  });

  it('success: gojs-row near docks to card stack, not full layout cell', () => {
    const position = {
      id: 'pos-1',
      organizationId: 'org-1',
      periodStart: '2024-01-01',
      childrenCount: 2,
      allDescendantCount: 5,
    } satisfies DiagramPosition;
    const style = {
      width: 200,
      height: 98,
      cardRowHeight: 56,
      personLayout: 'gojs-row',
    } as PersonNodeStyle;
    const layoutBox = { id: 'pos-1', x: 40, y: 80, width: 200, height: 98 };
    const hinted = staffEdgeBoxForPosition(layoutBox, position, style);
    const near = visualPersonEdgeBox(hinted, 'near');
    expect(near.y).toBe(80 + 18); // timeline chip
    expect(near.height).toBe(56 + 24); // card + count bar
    expect(near.y + near.height).toBe(80 + 98); // flush with layout bottom
    const child = visualPersonEdgeBox(
      staffEdgeBoxForPosition(
        { id: 'pos-2', x: 40, y: 220, width: 200, height: 98 },
        { id: 'pos-2', organizationId: 'org-1' },
        style,
      ),
      'near',
    );
    const ep = staffEdgeEndpoints(near, child);
    expect(ep.y1).toBe(near.y + near.height);
    expect(ep.y2).toBe(child.y);
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

describe('mapPositionNodesToStaffEdgeBoxes', () => {
  it('success: gojs-row theme attaches personEdgeHints', () => {
    const positionById = new Map<string, DiagramPosition>([
      [
        'pos-1',
        {
          id: 'pos-1',
          organizationId: 'org-1',
          periodStart: '2024-01-01',
          childrenCount: 1,
          allDescendantCount: 2,
        },
      ],
    ]);
    const boxes = mapPositionNodesToStaffEdgeBoxes(
      [{ id: 'pos-1', x: 0, y: 0, width: 200, height: 98 }],
      positionById,
      { personLayout: 'gojs-row', cardRowHeight: 56 } as PersonNodeStyle,
    );
    expect(boxes[0]?.personEdgeHints?.layout).toBe('gojs-row');
    expect(visualPersonEdgeBox(boxes[0]!, 'near').height).toBe(56 + 24);
  });
});
