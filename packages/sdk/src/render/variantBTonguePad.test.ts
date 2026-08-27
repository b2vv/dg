import { afterEach, beforeAll, describe, expect, it } from '@rstest/core';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeAllContours,
  resetContourWasmForTests,
  setContourWasmLoaderForTests,
  VARIANT_B_POSITIONS,
} from '../contour/bridge.js';
import { GRID_CELL_HEIGHT, GRID_CELL_WIDTH } from './types.js';

function ringArea(pts: { x: number; y: number }[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

describe('Variant B vacant padding tongues (T40)', () => {
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

  async function itContourArea(paddingCells: number): Promise<number> {
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
        paddingCells,
        smoothIterations: 1,
        // C-blob radius — tongue peel is about pad, not adjacency split.
        magnetRadius: 2,
        preferNotch: true,
      },
    );
    const it = contours.find((c) => c.departmentId === 'IT');
    expect(it?.points.length).toBeGreaterThan(2);
    return ringArea(it!.points);
  }

  it('success: paddingCells=0 yields a smaller IT ring than paddingCells=1', async () => {
    const a0 = await itContourArea(0);
    const a1 = await itContourArea(1);
    expect(a0).toBeLessThan(a1 * 0.92);
  });

  it('failure: negative padding is treated as zero-ish (not larger than pad=1)', async () => {
    const aNeg = await itContourArea(-1);
    const a1 = await itContourArea(1);
    expect(aNeg).toBeLessThan(a1);
  });
});
