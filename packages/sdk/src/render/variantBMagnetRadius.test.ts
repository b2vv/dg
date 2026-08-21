import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeAllContours,
  resetContourWasmForTests,
  setContourWasmLoaderForTests,
  VARIANT_B_POSITIONS,
} from '../contour/bridge.js';
import {
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  VARIANT_B_MAGNET_RADIUS,
} from './types.js';

describe('Variant B magnet radius (T47)', () => {
  beforeAll(async () => {
    const wasmPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../wasm/pkg/org_hierarchy_core_bg.wasm',
    );
    const bytes = readFileSync(wasmPath);
    setContourWasmLoaderForTests(async () => {
      const mod = await import('../wasm/pkg/org_hierarchy_core.js');
      await mod.default({ module_or_path: bytes });
      return mod as never;
    });
    resetContourWasmForTests();
  });

  afterEach(() => {
    resetContourWasmForTests();
  });

  it('success: radius 2 (= top↔bottom gap) yields one IT component', async () => {
    expect(VARIANT_B_MAGNET_RADIUS).toBe(2);
    const contours = await computeAllContours(
      VARIANT_B_POSITIONS.map((p) => ({
        id: p.id,
        departmentId: p.departmentId,
        col: p.col,
        row: p.row,
      })),
      {
        cellWidth: GRID_CELL_WIDTH,
        cellHeight: GRID_CELL_HEIGHT,
        paddingCells: 1,
        smoothIterations: 0,
        magnetRadius: VARIANT_B_MAGNET_RADIUS,
      },
    );
    expect(contours.filter((c) => c.departmentId === 'IT')).toHaveLength(1);
  });

  it('failure: default-ish radius 1.5 splits IT (top vs bottom not «поруч»)', async () => {
    const contours = await computeAllContours(
      VARIANT_B_POSITIONS.map((p) => ({
        id: p.id,
        departmentId: p.departmentId,
        col: p.col,
        row: p.row,
      })),
      {
        cellWidth: GRID_CELL_WIDTH,
        cellHeight: GRID_CELL_HEIGHT,
        paddingCells: 1,
        smoothIterations: 0,
        magnetRadius: 1.5,
      },
    );
    expect(contours.filter((c) => c.departmentId === 'IT').length).toBeGreaterThan(1);
  });
});
