import type { DiagramPosition } from '../data/types.js';
import { InteractionError } from '../core/index.js';

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
