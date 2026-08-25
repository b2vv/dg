import { contourDepartmentId } from '../data/types.js';
import type { ContourMagnetConfig } from './bridge.js';
import { resolveMagnetRadius } from '../render/magnetRadius.js';

/** Chaikin cap (A9). Values above this are clamped; 18+ iterations OOM. */
export const MAX_SMOOTH_ITERATIONS = 8;

/** Map TS config → Rust snake_case (shared main + worker) */
export function toRustConfig(cfg: ContourMagnetConfig = {}) {
  return {
    magnet_radius: resolveMagnetRadius(cfg.magnetRadius),
    padding_cells: cfg.paddingCells ?? 0,
    corridor_cells: cfg.corridorCells ?? 0,
    cell_width: cfg.cellWidth ?? 100,
    cell_height: cfg.cellHeight ?? 80,
    smooth_iterations: Math.min(cfg.smoothIterations ?? 2, MAX_SMOOTH_ITERATIONS),
    prefer_notch: cfg.preferNotch ?? true,
  };
}

/**
 * Every seat with authored coords becomes a contour input. Seats without a
 * department go under `NO_DEPARTMENT_ID`: they own no contour, but the
 * flood and the notch have to see them as foreign cards (M2) rather than as
 * empty grid space that a wash may cover.
 */
export function diagramPositionsToContourInputs(
  positions: Array<{
    id: string;
    departmentId?: string;
    gridCell?: { col: number; row: number };
  }>,
) {
  return positions
    .filter((p) => p.gridCell)
    .map((p) => ({
      id: p.id,
      departmentId: contourDepartmentId(p),
      col: p.gridCell!.col,
      row: p.gridCell!.row,
    }));
}
