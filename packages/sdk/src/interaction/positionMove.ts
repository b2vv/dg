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

function assertNever(x: never): never {
  throw new Error(`Unexpected SeatDrop kind: ${String(x)}`);
}

/**
 * Apply a resolved `SeatDrop` to `positions`. Pure — no data changes until the
 * caller commits the result. `ask` carries no mutation of its own (the caller
 * must resolve the question first, or refuse), so it is excluded at the type
 * level rather than handled here.
 *
 * `push` and `swap` both move **two** seats, but as one returned array — the
 * caller commits it in a single `commitDataChange` (plan §4), so there is
 * never a frame where only one of the two has moved (spec A3).
 */
export function applySeatDrop(
  positions: DiagramPosition[],
  positionId: string,
  target: GridCell,
  drop: Exclude<SeatDrop, { kind: 'ask' }>,
): DiagramPosition[] {
  switch (drop.kind) {
    case 'free':
      return movePositionToCell(positions, positionId, target.col, target.row);
    case 'push': {
      // The occupant vacates first, into a cell `resolveSeatDrop` already
      // proved free, so the mover's target cell is empty by the time it moves
      // — both calls go through the same occupancy guard as any other move.
      const vacated = movePositionToCell(positions, drop.occupantId, drop.to.col, drop.to.row);
      return movePositionToCell(vacated, positionId, target.col, target.row);
    }
    case 'swap': {
      // A true exchange: both cells are occupied at once, so neither move can
      // go through `movePositionToCell`'s guard one at a time — it is built
      // as one array instead.
      const mover = positions.find((p) => p.id === positionId);
      const occupant = positions.find((p) => p.id === drop.occupantId);
      if (!mover) {
        throw new InteractionError(`Unknown position ${positionId}`);
      }
      if (!occupant) {
        throw new InteractionError(`Unknown position ${drop.occupantId}`);
      }
      const moverFrom = mover.gridCell;
      if (!moverFrom) {
        throw new InteractionError(`Position ${positionId} has no cell to swap from`);
      }
      return positions.map((p) => {
        if (p.id === positionId) {
          return {
            ...p,
            gridCell: target,
            layoutX: undefined,
            layoutY: undefined,
            layoutCoords: undefined,
          };
        }
        if (p.id === drop.occupantId) {
          return {
            ...p,
            gridCell: moverFrom,
            layoutX: undefined,
            layoutY: undefined,
            layoutCoords: undefined,
          };
        }
        return p;
      });
    }
    default:
      return assertNever(drop);
  }
}

/**
 * Apply grid move; rejects invalid cells.
 *
 * ⚠️ T111-K2: rejects **any** target cell already held by another seat of the
 * same org block. This guard stays in place after K3: `applySeatDrop` reuses
 * it for `free` and `push` (defence in depth against a direct call with an
 * arbitrary `col`/`row` that never went through `resolveSeatDrop`), and
 * `swap` builds its own array precisely because two seats *are* meant to
 * cross paths through occupied cells here.
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
