import { describe, expect, it } from '@rstest/core';
import { mapFloodRingToCards, type FloodCardGeometry } from './floodRingCards.js';

/** Seat 100×40 inside a 140×80 cell: 20px inset left/right, 20px top/bottom. */
const geom: FloodCardGeometry = {
  pitchX: 140,
  pitchY: 80,
  cellWidth: 140,
  cellHeight: 80,
  originX: 0,
  originY: 0,
  cardWidth: 100,
  cardHeight: 40,
  insetX: 20,
  insetY: 20,
  padding: 6,
};

/** Cell-space ring around cells (0,0) and (1,0) — clockwise. */
const twoCellRing = [
  { x: 0, y: 0 },
  { x: 280, y: 0 },
  { x: 280, y: 80 },
  { x: 0, y: 80 },
];

describe('mapFloodRingToCards', () => {
  it('success: outer edges land on the card box plus padding, not on the cell', () => {
    const ring = mapFloodRingToCards(twoCellRing, geom);
    const xs = ring.map((p) => p.x);
    const ys = ring.map((p) => p.y);
    // left  = card left (0 + inset) − padding
    expect(Math.min(...xs)).toBeCloseTo(20 - 6, 5);
    // right = card right of the second column (140 + 20 + 100) + padding
    expect(Math.max(...xs)).toBeCloseTo(260 + 6, 5);
    expect(Math.min(...ys)).toBeCloseTo(20 - 6, 5);
    expect(Math.max(...ys)).toBeCloseTo(60 + 6, 5);
  });

  it('success: the ring shrinks — a cell-lattice ring is always wider', () => {
    const ring = mapFloodRingToCards(twoCellRing, geom);
    const width = Math.max(...ring.map((p) => p.x)) - Math.min(...ring.map((p) => p.x));
    const height = Math.max(...ring.map((p) => p.y)) - Math.min(...ring.map((p) => p.y));
    expect(width).toBeLessThan(280);
    expect(height).toBeLessThan(80);
    // Still covers both seats.
    expect(width).toBeGreaterThan(geom.pitchX + geom.cardWidth);
  });

  it('success: a C-shape keeps its notch on the card lattice', () => {
    // Cells (0,0),(1,0),(2,0),(0,1),(2,1) filled — (1,1) is foreign.
    const cRing = [
      { x: 0, y: 0 },
      { x: 420, y: 0 },
      { x: 420, y: 160 },
      { x: 280, y: 160 },
      { x: 280, y: 80 },
      { x: 140, y: 80 },
      { x: 140, y: 160 },
      { x: 0, y: 160 },
    ];
    const ring = mapFloodRingToCards(cRing, geom);
    expect(ring).toHaveLength(cRing.length);
    // The notch mouth stays between the two lower seats.
    const notchXs = ring.filter((p) => p.y > 100).map((p) => p.x);
    expect(Math.min(...notchXs)).toBeLessThan(Math.max(...notchXs));
    expect(new Set(ring.map((p) => `${p.x},${p.y}`)).size).toBe(ring.length);
  });

  it('failure: a degenerate ring passes through untouched', () => {
    const ring = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(mapFloodRingToCards(ring, geom)).toEqual(ring);
  });
});
