import type { DiagramPosition } from '../data/types.js';
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

export function isValidGridCell(col: number, row: number): boolean {
  return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0;
}

/** Apply grid move; rejects invalid cells. */
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
 * Shift all positions in the same department sharing `hierarchyLevel` by `delta` rows.
 * v1: uses gridCell.row when present; otherwise no-op for that position.
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
  const ids = positions
    .filter(
      (p) =>
        p.departmentId === dept &&
        (level == null ? p.hierarchyLevel == null : p.hierarchyLevel === level) &&
        p.organizationId === seed.organizationId,
    )
    .map((p) => p.id);
  const idSet = new Set(ids);
  const next = positions.map((p) => {
    if (!idSet.has(p.id) || !p.gridCell) return p;
    const row = p.gridCell.row + deltaLevel;
    if (row < 0) {
      throw new InteractionError(`Block shift would produce negative row for ${p.id}`);
    }
    return {
      ...p,
      hierarchyLevel:
        p.hierarchyLevel != null ? p.hierarchyLevel + deltaLevel : p.hierarchyLevel,
      gridCell: { ...p.gridCell, row },
    };
  });
  return { positions: next, positionIds: ids };
}
