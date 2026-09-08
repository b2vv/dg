/**
 * Variant B seats: report edges must not cut through card interiors (T38).
 *
 * T80 note: this file used to open with two contour-clearance cases driven by
 * the Rust flood. They went with it. What is left never touched WASM — it is
 * pure staff-edge geometry — and the two clearance helpers those cases also
 * exercised keep their own tests in `contour/contourClearance.test.ts`, so
 * nothing lost coverage on the way out.
 */
import { describe, expect, it } from '@rstest/core';
import { resolvePositionAABB } from '../layout/staff/coords.js';
import {
  buildStaffEdgeSegments,
  polylineHitsBoxInterior,
} from '../layout/staffEdgeGeometry.js';
import {
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
} from './types.js';
import { VARIANT_B_POSITIONS } from './contour/variantBPositions.js';

const REPORTS = [
  { fromId: 'P4', toId: 'P2', kind: 'admin' as const },
  { fromId: 'P2', toId: 'P1', kind: 'admin' as const },
  { fromId: 'P2', toId: 'P3', kind: 'admin' as const },
  { fromId: 'P4', toId: 'P5', kind: 'admin' as const },
  { fromId: 'P4', toId: 'P6', kind: 'admin' as const },
];

describe('Variant B report edges vs cards (T38)', () => {
  const geom = {
    nodeWidth: PERSON_CARD_WIDTH,
    nodeHeight: PERSON_CARD_HEIGHT,
    horizontalGap: VARIANT_B_HORIZONTAL_GAP,
    verticalGap: VARIANT_B_VERTICAL_GAP,
    refCellWidth: GRID_CELL_WIDTH,
    refCellHeight: GRID_CELL_HEIGHT,
    margin: 0,
  };


  it('success: report edges never cut card interiors', async () => {
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
    for (const seg of segs) {
      for (const box of boxes) {
        expect(
          polylineHitsBoxInterior(seg.points, box),
          `${seg.fromId}→${seg.toId} hits ${box.id}`,
        ).toBe(false);
      }
    }
  });
});
