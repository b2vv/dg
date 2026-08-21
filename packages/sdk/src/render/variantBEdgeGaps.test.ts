import { describe, expect, it } from 'vitest';
import { VARIANT_B_POSITIONS } from '../contour/bridge.js';
import { resolvePositionAABB } from '../layout/staff/coords.js';
import { buildStaffEdgeSegments } from './staffEdgeGeometry.js';
import {
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
  variantBAdjacentEdgeClearance,
} from './types.js';

const REPORTS = [
  { fromId: 'P4', toId: 'P2', kind: 'admin' as const },
  { fromId: 'P2', toId: 'P1', kind: 'admin' as const },
  { fromId: 'P2', toId: 'P3', kind: 'admin' as const },
  { fromId: 'P4', toId: 'P5', kind: 'admin' as const },
  { fromId: 'P4', toId: 'P6', kind: 'admin' as const },
];

function polylineLength(pts: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

describe('Variant B edge corridors (T37)', () => {
  const geom = {
    nodeWidth: PERSON_CARD_WIDTH,
    nodeHeight: PERSON_CARD_HEIGHT,
    horizontalGap: VARIANT_B_HORIZONTAL_GAP,
    verticalGap: VARIANT_B_VERTICAL_GAP,
    refCellWidth: GRID_CELL_WIDTH,
    refCellHeight: GRID_CELL_HEIGHT,
    margin: 0,
  };

  it('success: adjacent cards leave a readable border gap', () => {
    const clear = variantBAdjacentEdgeClearance();
    expect(clear.horizontal).toBeGreaterThanOrEqual(24);
    expect(clear.vertical).toBeGreaterThanOrEqual(28);

    const p2 = resolvePositionAABB(
      {
        id: 'P2',
        title: 't',
        organizationId: 'o',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 1, row: 0 },
      },
      geom,
    );
    const p4 = resolvePositionAABB(
      {
        id: 'P4',
        title: 't',
        organizationId: 'o',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 1, row: 1 },
      },
      geom,
    );
    expect(p4.y - (p2.y + p2.height)).toBeCloseTo(clear.vertical);
  });

  it('success: every Variant B report edge is longer than the old 4px stub', () => {
    const boxes = VARIANT_B_POSITIONS.map((p) => {
      const box = resolvePositionAABB(
        {
          id: p.id,
          title: p.id,
          organizationId: 'o',
          groupIds: [],
          status: 'filled',
          isTemporary: false,
          gridCell: { col: p.col, row: p.row },
        },
        geom,
      );
      return { id: p.id, ...box };
    });
    const segs = buildStaffEdgeSegments(REPORTS, boxes);
    expect(segs).toHaveLength(REPORTS.length);
    const minClear = Math.min(
      variantBAdjacentEdgeClearance().horizontal,
      variantBAdjacentEdgeClearance().vertical,
    );
    for (const seg of segs) {
      expect(polylineLength(seg.points), `${seg.fromId}→${seg.toId}`).toBeGreaterThanOrEqual(
        minClear - 0.5,
      );
    }
  });

  it('failure: gap-0 layout still produces only ~4px stubs (documents the bug)', () => {
    const tight = { ...geom, horizontalGap: 0, verticalGap: 0 };
    const p2 = resolvePositionAABB(
      {
        id: 'P2',
        title: 't',
        organizationId: 'o',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 1, row: 0 },
      },
      tight,
    );
    const p4 = resolvePositionAABB(
      {
        id: 'P4',
        title: 't',
        organizationId: 'o',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 1, row: 1 },
      },
      tight,
    );
    expect(p4.y - (p2.y + p2.height)).toBeLessThan(8);
  });
});
