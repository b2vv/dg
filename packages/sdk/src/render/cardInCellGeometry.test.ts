import { describe, expect, it } from 'vitest';
import { resolvePositionAABB } from '../layout/staff/coords.js';
import {
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
} from './types.js';

describe('option A card-in-cell geometry', () => {
  it('success: card fills cell with ≤4px inset per side', () => {
    const insetX = (GRID_CELL_WIDTH - PERSON_CARD_WIDTH) / 2;
    const insetY = (GRID_CELL_HEIGHT - PERSON_CARD_HEIGHT) / 2;
    expect(insetX).toBeLessThanOrEqual(4);
    expect(insetY).toBeLessThanOrEqual(4);
    expect(PERSON_CARD_WIDTH / GRID_CELL_WIDTH).toBeGreaterThanOrEqual(0.95);
    expect(PERSON_CARD_HEIGHT / GRID_CELL_HEIGHT).toBeGreaterThanOrEqual(0.95);
  });

  it('success: gridCell AABB is centered in the cell pitch', () => {
    const box = resolvePositionAABB(
      {
        id: 'p',
        title: 't',
        organizationId: 'o',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 1, row: 2 },
      },
      {
        nodeWidth: PERSON_CARD_WIDTH,
        nodeHeight: PERSON_CARD_HEIGHT,
        horizontalGap: 0,
        verticalGap: 0,
        refCellWidth: GRID_CELL_WIDTH,
        refCellHeight: GRID_CELL_HEIGHT,
        margin: 0,
      },
    );
    const insetX = (GRID_CELL_WIDTH - PERSON_CARD_WIDTH) / 2;
    const insetY = (GRID_CELL_HEIGHT - PERSON_CARD_HEIGHT) / 2;
    expect(box).toEqual({
      x: 1 * GRID_CELL_WIDTH + insetX,
      y: 2 * GRID_CELL_HEIGHT + insetY,
      width: PERSON_CARD_WIDTH,
      height: PERSON_CARD_HEIGHT,
    });
  });

  it('failure: oversized card relative to cell is rejected by invariants', () => {
    expect(PERSON_CARD_WIDTH).toBeLessThanOrEqual(GRID_CELL_WIDTH);
    expect(PERSON_CARD_HEIGHT).toBeLessThanOrEqual(GRID_CELL_HEIGHT);
  });
});
