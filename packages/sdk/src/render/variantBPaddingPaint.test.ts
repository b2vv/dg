/**
 * T80: this file used to assert padding against **both** engines at once — that
 * the Rust path changes with `paddingCells` while the paint margin grows. The
 * Rust half went with the engine; the paint half is about the one that stays,
 * so it kept its assertions and lost only the comparison it no longer has a
 * second party for.
 */
import { describe, expect, it } from '@rstest/core';
import { VARIANT_B_POSITIONS } from './contour/variantBPositions.js';
import { resolvePositionAABB } from '../layout/staff/coords.js';
import {
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
} from './types.js';
import { polishContourRings } from './contour/contourPolish.js';

function ringBounds(ring: readonly { x: number; y: number }[]): {
  minX: number;
  maxX: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of ring) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }
  return { minX, maxX };
}

describe('Variant B padding (paint-only button-group)', () => {
  it('success: padding grows the painted margin around the same cards', () => {
    const geom = {
      nodeWidth: PERSON_CARD_WIDTH,
      nodeHeight: PERSON_CARD_HEIGHT,
      horizontalGap: VARIANT_B_HORIZONTAL_GAP,
      verticalGap: VARIANT_B_VERTICAL_GAP,
      refCellWidth: GRID_CELL_WIDTH,
      refCellHeight: GRID_CELL_HEIGHT,
      margin: 0,
    };
    const rowIds = ['P1', 'P2', 'P3'];
    const boxes = rowIds.map((id) => {
      const p = VARIANT_B_POSITIONS.find((x) => x.id === id)!;
      const box = resolvePositionAABB(
        {
          id,
          title: id,
          organizationId: 'o',
          groupIds: [],
          status: 'filled',
          isTemporary: false,
          gridCell: { col: p.col, row: p.row },
          width: PERSON_CARD_WIDTH,
          height: PERSON_CARD_HEIGHT,
        },
        geom,
      );
      return box;
    });

    const pad0 = (polishContourRings({ memberBoxes: boxes, strokeWidth: 0.9, paddingCells: 0 })[0] ?? []);
    const pad2 = (polishContourRings({ memberBoxes: boxes, strokeWidth: 0.9, paddingCells: 2 })[0] ?? []);
    const w0 = ringBounds(pad0).maxX - ringBounds(pad0).minX;
    const w2 = ringBounds(pad2).maxX - ringBounds(pad2).minX;
    expect(w2).toBeGreaterThan(w0 + 10);
  });

  it('failure: padding without member boxes paints nothing', () => {
    expect((polishContourRings({ memberBoxes: [], strokeWidth: 0.9, paddingCells: 2 })[0] ?? [])).toEqual([]);
  });
});
