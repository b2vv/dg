/**
 * G2 corridor — the minimum gap a contour keeps from a foreign card
 * (`docs/REQUIREMENTS.md` §4.6.1: «contour огинає foreign bbox з
 * `gap ≥ corridorMin`, за замовч. 0.5 cell»).
 *
 * The two engines measure it differently, which is why the knob is in cells:
 *
 * - **button-group** works in world space, so cells convert to px — clamped to
 *   half the free space between two neighbouring cards, otherwise a corridor
 *   would reach across the gap and cut the neighbour out of its own wash.
 * - **cell-flood** works in cell space and always excludes the whole foreign
 *   cell; that exclusion *is* the half cell of G2. Its dilation counts extra
 *   whole cell rings, so the fraction is floored.
 */

/** Default from REQUIREMENTS §4.6.1 E (`corridorMin`). */
export const DEFAULT_CORRIDOR_CELLS = 0.5;

export interface CorridorGeometry {
  /** Layout cell the contour grid is built on. */
  cellWidth: number;
  cellHeight: number;
  /** Card inside that cell. */
  cardWidth: number;
  cardHeight: number;
}

function freeSpace(cell: number, card: number): number {
  return Math.max(0, cell - card);
}

/**
 * World-space corridor in px. `floorPx` keeps the wash from hugging a foreign
 * card tighter than it hugs its own (the button-group margin).
 */
export function corridorPx(
  corridorCells: number,
  geom: CorridorGeometry,
  floorPx = 0,
): number {
  const cells = Number.isFinite(corridorCells) ? Math.max(0, corridorCells) : 0;
  const wanted = cells * Math.min(geom.cellWidth, geom.cellHeight);
  const room = Math.min(
    freeSpace(geom.cellWidth, geom.cardWidth),
    freeSpace(geom.cellHeight, geom.cardHeight),
  );
  const capped = room > 0 ? Math.min(wanted, room / 2) : wanted;
  return Math.max(floorPx, capped);
}

/**
 * Cell-space dilation for the Rust flood. The flood already keeps the whole
 * foreign cell out, so anything below one cell adds nothing; larger values add
 * whole rings.
 */
export function corridorCellsForFlood(corridorCells: number): number {
  const cells = Number.isFinite(corridorCells) ? Math.max(0, corridorCells) : 0;
  return Math.floor(cells);
}
