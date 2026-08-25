/**
 * Map a Rust flood ring (cell space) onto **card** bounds instead of cell
 * bounds.
 *
 * `contour.rs` walks whole cells, so a straight affine map draws the contour on
 * the cell lattice: it hugs the card on the left/top and hangs a full gap away
 * on the right/bottom. Layout cells are wider than the seats they hold, so the
 * wash has to be snapped back onto the card rectangle plus the same padding the
 * button-group painter uses.
 */

export interface FloodCardGeometry {
  /** World distance between two neighbouring cells. */
  pitchX: number;
  pitchY: number;
  /** Cell size the flood ran on (ring coordinates are multiples of these). */
  cellWidth: number;
  cellHeight: number;
  /** World origin of cell (0,0). */
  originX: number;
  originY: number;
  /** Card box inside a cell. */
  cardWidth: number;
  cardHeight: number;
  insetX: number;
  insetY: number;
  /** Extra margin around the cards, matching the button-group wash. */
  padding: number;
}

export interface FloodPoint {
  x: number;
  y: number;
}

import { mergeCollinearRing } from './contourNotch.js';

const EPS = 1e-6;

/** Even-odd test — the ring is orthogonal and closed. */
function isInsideRing(ring: readonly FloodPoint[], p: FloodPoint): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > p.y !== b.y > p.y) {
      const x = ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
      if (p.x < x) inside = !inside;
    }
  }
  return inside;
}

/** Cell-space boundary index for a coordinate that sits on the cell lattice. */
function boundaryIndex(value: number, cellSize: number): number {
  return Math.round(value / cellSize);
}

function edgeIsLeftBoundary(
  ring: readonly FloodPoint[],
  x: number,
  y: number,
  cellWidth: number,
): boolean {
  const probe = Math.max(cellWidth * 0.25, 1);
  return isInsideRing(ring, { x: x + probe, y });
}

function edgeIsTopBoundary(
  ring: readonly FloodPoint[],
  x: number,
  y: number,
  cellHeight: number,
): boolean {
  const probe = Math.max(cellHeight * 0.25, 1);
  return isInsideRing(ring, { x, y: y + probe });
}

/**
 * Snap every ring vertex from the cell lattice onto the card rectangle it
 * bounds. A vertical run that has fill to its right is the left side of a card
 * column; one with fill to its left is the right side of the previous column.
 */
export function mapFloodRingToCards(
  raw: readonly FloodPoint[],
  geom: FloodCardGeometry,
): FloodPoint[] {
  if (raw.length < 3) return raw.map((p) => ({ x: p.x, y: p.y }));
  // The flood emits a vertex per cell step; a point in the middle of a straight
  // run has no vertical/horizontal edge pair to read the fill side from.
  const ring = mergeCollinearRing(raw);
  if (ring.length < 3) return raw.map((p) => ({ x: p.x, y: p.y }));

  const leftX = (col: number) => geom.originX + col * geom.pitchX + geom.insetX - geom.padding;
  const rightX = (col: number) =>
    geom.originX + (col - 1) * geom.pitchX + geom.insetX + geom.cardWidth + geom.padding;
  const topY = (row: number) => geom.originY + row * geom.pitchY + geom.insetY - geom.padding;
  const bottomY = (row: number) =>
    geom.originY + (row - 1) * geom.pitchY + geom.insetY + geom.cardHeight + geom.padding;

  return ring.map((point, i) => {
    const prev = ring[(i - 1 + ring.length) % ring.length]!;
    const next = ring[(i + 1) % ring.length]!;
    const col = boundaryIndex(point.x, geom.cellWidth);
    const row = boundaryIndex(point.y, geom.cellHeight);

    // A corner belongs to one vertical run and one horizontal run; each run
    // decides its own side from the fill next to it.
    const verticalNeighbour = Math.abs(prev.x - point.x) < EPS ? prev : next;
    const horizontalNeighbour = Math.abs(prev.y - point.y) < EPS ? prev : next;
    const midY = (point.y + verticalNeighbour.y) / 2;
    const midX = (point.x + horizontalNeighbour.x) / 2;

    return {
      x: edgeIsLeftBoundary(ring, point.x, midY, geom.cellWidth) ? leftX(col) : rightX(col),
      y: edgeIsTopBoundary(ring, midX, point.y, geom.cellHeight) ? topY(row) : bottomY(row),
    };
  });
}
