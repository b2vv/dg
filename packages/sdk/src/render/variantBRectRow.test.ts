import { afterEach, beforeAll, describe, expect, it } from '@rstest/core';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeAllContours,
  resetContourWasmForTests,
  setContourWasmLoaderForTests,
} from '../contour/bridge.js';
import { GRID_CELL_HEIGHT, GRID_CELL_WIDTH } from './types.js';

/** Count direction changes on an orthogonal closed ring (grid-snapped). */
function trueCorners(path: string, cellW: number, cellH: number): number {
  const nums = [...path.matchAll(/(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({
      x: Math.round(nums[i]! / cellW),
      y: Math.round(nums[i + 1]! / cellH),
    });
  }
  if (pts.length < 3) return 0;
  let turns = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length]!;
    const b = pts[i]!;
    const c = pts[(i + 1) % pts.length]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross !== 0) turns += 1;
  }
  return turns;
}

describe('rectangular magnetic row (T50)', () => {
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

  it('success: three adjacent cells + pad1 → rectangle (not hat)', async () => {
    const contours = await computeAllContours(
      [
        { id: 'A', departmentId: 'IT', col: 0, row: 0 },
        { id: 'B', departmentId: 'IT', col: 1, row: 0 },
        { id: 'C', departmentId: 'IT', col: 2, row: 0 },
      ],
      {
        cellWidth: GRID_CELL_WIDTH,
        cellHeight: GRID_CELL_HEIGHT,
        paddingCells: 1,
        smoothIterations: 0,
        magnetRadius: 1.5,
      },
    );
    const itCards = contours.filter((c) => c.departmentId === 'IT');
    expect(itCards).toHaveLength(1);
    expect(trueCorners(itCards[0]!.path, GRID_CELL_WIDTH, GRID_CELL_HEIGHT)).toBe(4);
  });
});
