import { describe, expect, it } from 'vitest';
import {
  corridorCellsForFlood,
  corridorPx,
  DEFAULT_CORRIDOR_CELLS,
} from './contourCorridor.js';

/** Magnetic staff tab: 248×44 seat inside a 304×120 cell. */
const geom = { cellWidth: 304, cellHeight: 120, cardWidth: 248, cardHeight: 44 };

describe('corridorPx', () => {
  it('success: clamped to half the free space, never across the gap', () => {
    // 0.5 cell would be 60px, but only 56px of free width exists between cards.
    expect(corridorPx(DEFAULT_CORRIDOR_CELLS, geom)).toBe(28);
  });

  it('success: a small request passes through unclamped', () => {
    expect(corridorPx(0.02, geom)).toBeCloseTo(2.4, 5);
  });

  it('success: the floor keeps the foreign gap at least as wide as the own wash', () => {
    expect(corridorPx(0, geom, 6)).toBe(6);
    expect(corridorPx(DEFAULT_CORRIDOR_CELLS, geom, 6)).toBe(28);
  });

  it('failure: cards filling the cell leave no room to clamp against', () => {
    const tight = { cellWidth: 100, cellHeight: 50, cardWidth: 100, cardHeight: 50 };
    expect(corridorPx(0.5, tight, 4)).toBe(25);
  });

  it('failure: non-finite or negative cells count as none', () => {
    expect(corridorPx(Number.NaN, geom, 6)).toBe(6);
    expect(corridorPx(-3, geom, 6)).toBe(6);
  });
});

describe('corridorCellsForFlood', () => {
  it('success: whole rings only — the foreign cell is already excluded', () => {
    expect(corridorCellsForFlood(DEFAULT_CORRIDOR_CELLS)).toBe(0);
    expect(corridorCellsForFlood(1)).toBe(1);
    expect(corridorCellsForFlood(2.9)).toBe(2);
  });

  it('failure: nonsense input asks for no dilation', () => {
    expect(corridorCellsForFlood(Number.NaN)).toBe(0);
    expect(corridorCellsForFlood(-1)).toBe(0);
  });
});
