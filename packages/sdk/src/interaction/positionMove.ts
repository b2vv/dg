import type { DiagramPosition, GridCell } from '../data/types.js';
import { InteractionError } from './types.js';

export interface GridSnap {
  col: number;
  row: number;
}

export function snapToGrid(
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number,
): GridSnap {
  const col = Math.round(x / cellWidth);
  const row = Math.round(y / cellHeight);
  return { col, row };
}

/** Snap card top-left in world space to grid cell (staff pitch + origin + inset). */
export function snapWorldToCell(
  x: number,
  y: number,
  opts: {
    pitchX: number;
    pitchY: number;
    originX?: number;
    originY?: number;
    insetX?: number;
    insetY?: number;
  },
): GridSnap {
  const originX = opts.originX ?? 0;
  const originY = opts.originY ?? 0;
  const insetX = opts.insetX ?? 0;
  const insetY = opts.insetY ?? 0;
  const pitchX = opts.pitchX > 0 ? opts.pitchX : 1;
  const pitchY = opts.pitchY > 0 ? opts.pitchY : 1;
  return {
    col: Math.round((x - originX - insetX) / pitchX),
    row: Math.round((y - originY - insetY) / pitchY),
  };
}

export function isValidGridCell(col: number, row: number): boolean {
  return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0;
}

/**
 * What a drop on a cell means once the seat already sitting there is counted.
 *
 * One shape, two consumers — the drag preview and the commit — so «what the
 * user sees» and «what is written» cannot drift apart (plan §1). `ask` is the
 * only outcome the SDK cannot settle on its own.
 */
export type SeatDrop =
  | { kind: 'free' }
  | { kind: 'push'; occupantId: string; to: GridCell }
  | { kind: 'swap'; occupantId: string }
  | { kind: 'ask'; occupantId: string; pushTargets: GridCell[] };

function sameCell(a: GridCell, b: GridCell): boolean {
  return a.col === b.col && a.row === b.row;
}

/**
 * Decide what dropping `positionId` on `target` does. Pure: no data is changed.
 *
 * `from` is the seat's **authored** cell, not where the gesture started: the
 * only thing crossing the render boundary is the target cell
 * (`onPersonDragEnd(positionId, col, row)`), so a preview that measured the
 * gesture and a commit that measured the data would answer differently on the
 * first L-shaped drag (plan §2).
 *
 * The direction is `sign(target − from)` per axis. Exactly one non-zero axis is
 * an answer the SDK can act on; two (a diagonal) is not, and neither is a cell
 * that already holds two seats — those ask. There is no chain: when the cell
 * behind the occupant is taken or outside the grid, the two seats swap.
 *
 * Occupancy is counted **inside one org block**, matching the layout that
 * reports the overlap (`layout/staff/orgBlockLayout.ts`).
 */
export function resolveSeatDrop(input: {
  positions: DiagramPosition[];
  positionId: string;
  target: GridCell;
  from: GridCell | undefined;
}): SeatDrop {
  const { positions, positionId, target, from } = input;
  const mover = positions.find((p) => p.id === positionId);
  if (!mover) {
    throw new InteractionError(`Unknown position ${positionId}`);
  }
  // Dropped where it was picked up: nothing moves, and nothing is asked.
  if (from && sameCell(from, target)) return { kind: 'free' };

  const block = positions.filter(
    (p) => p.id !== positionId && p.organizationId === mover.organizationId,
  );
  const occupants = block.filter((p) => p.gridCell && sameCell(p.gridCell, target));
  if (occupants.length === 0) return { kind: 'free' };

  // The mover is not in `block`, so the cell it vacates counts as free.
  const isFree = (cell: GridCell): boolean =>
    isValidGridCell(cell.col, cell.row) &&
    !block.some((p) => p.gridCell && sameCell(p.gridCell, cell));

  const stepCol = from ? Math.sign(target.col - from.col) : 0;
  const stepRow = from ? Math.sign(target.row - from.row) : 0;
  const candidates: GridCell[] = [
    ...(stepCol === 0 ? [] : [{ col: target.col + stepCol, row: target.row }]),
    ...(stepRow === 0 ? [] : [{ col: target.col, row: target.row + stepRow }]),
  ];
  const pushTargets = candidates.filter((cell) => isFree(cell));
  const occupantId = occupants[0]!.id;

  // Two seats in one cell (legacy overlap) or an ambiguous direction: the SDK
  // is not entitled to pick, so it asks.
  if (occupants.length > 1 || candidates.length !== 1) {
    return { kind: 'ask', occupantId, pushTargets };
  }
  const to = pushTargets[0];
  return to ? { kind: 'push', occupantId, to } : { kind: 'swap', occupantId };
}

/**
 * Apply grid move; rejects invalid cells.
 *
 * ⚠️ T111-K2: rejects **any** target cell already held by another seat of the
 * same org block — `push`/`swap` are not committed yet (plan §6, K2). Until K3
 * lands, a collision is a plain refusal: the caller (`movePersonToCell` /
 * the drag drop) is expected to make that refusal visible, not swallow it.
 */
export function movePositionToCell(
  positions: DiagramPosition[],
  positionId: string,
  col: number,
  row: number,
): DiagramPosition[] {
  if (!isValidGridCell(col, row)) {
    throw new InteractionError(`Invalid grid cell (${col}, ${row})`);
  }
  const idx = positions.findIndex((p) => p.id === positionId);
  if (idx < 0) {
    throw new InteractionError(`Unknown position ${positionId}`);
  }
  const mover = positions[idx]!;
  const occupant = positions.find(
    (p) =>
      p.id !== positionId &&
      p.organizationId === mover.organizationId &&
      p.gridCell &&
      p.gridCell.col === col &&
      p.gridCell.row === row,
  );
  if (occupant) {
    throw new InteractionError(`Cell (${col}, ${row}) already taken by ${occupant.id}`);
  }
  const next = positions.slice();
  const cur = next[idx]!;
  next[idx] = {
    ...cur,
    gridCell: { col, row },
    layoutX: undefined,
    layoutY: undefined,
    layoutCoords: undefined,
  };
  return next;
}

/**
 * Shift positions in the same department sharing `hierarchyLevel` by `delta` rows.
 * Only positions with `gridCell` move; `positionIds` lists those actually shifted.
 */
export function shiftPositionBlock(
  positions: DiagramPosition[],
  seedPositionId: string,
  deltaLevel: number,
): { positions: DiagramPosition[]; positionIds: string[] } {
  const seed = positions.find((p) => p.id === seedPositionId);
  if (!seed) {
    throw new InteractionError(`Unknown position ${seedPositionId}`);
  }
  const level = seed.hierarchyLevel;
  const dept = seed.departmentId;
  const sameBlock = (p: DiagramPosition): boolean =>
    p.departmentId === dept &&
    (level == null ? p.hierarchyLevel == null : p.hierarchyLevel === level) &&
    p.organizationId === seed.organizationId;

  const positionIds: string[] = [];
  const next = positions.map((p) => {
    if (!sameBlock(p) || !p.gridCell) return p;
    const row = p.gridCell.row + deltaLevel;
    if (row < 0) {
      throw new InteractionError(`Block shift would produce negative row for ${p.id}`);
    }
    positionIds.push(p.id);
    return {
      ...p,
      hierarchyLevel:
        p.hierarchyLevel == null ? p.hierarchyLevel : p.hierarchyLevel + deltaLevel,
      gridCell: { ...p.gridCell, row },
    };
  });
  return { positions: next, positionIds };
}
