import type { ContourMagnetConfig } from './bridge.js';

/** Map TS config → Rust snake_case (shared main + worker) */
export function toRustConfig(cfg: ContourMagnetConfig = {}) {
  return {
    padding_cells: cfg.paddingCells ?? 0,
    corridor_cells: cfg.corridorCells ?? 0,
    cell_width: cfg.cellWidth ?? 100,
    cell_height: cfg.cellHeight ?? 80,
    smooth_iterations: cfg.smoothIterations ?? 2,
  };
}

export function diagramPositionsToContourInputs(
  positions: Array<{
    id: string;
    departmentId?: string;
    gridCell?: { col: number; row: number };
  }>,
) {
  return positions
    .filter((p) => p.gridCell && p.departmentId)
    .map((p) => ({
      id: p.id,
      departmentId: p.departmentId!,
      col: p.gridCell!.col,
      row: p.gridCell!.row,
    }));
}
