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
import { resolvePositionAABB } from '../layout/staff/coords.js';
import {
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_MAGNET_RADIUS,
  VARIANT_B_VERTICAL_GAP,
} from './types.js';
import { polishContourRings } from './contour/contourPolish.js';

function ringBounds(ring: readonly { x: number; y: number }[]): {
  minX: number;
  maxX: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of ring) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }
  return { minX, maxX };
}

describe('Variant B padding (paint-only button-group)', () => {
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

  it('success: padding grows paint margin but Rust path area stays unchanged', async () => {
    const rust0 = await computeAllContours(
      VARIANT_B_POSITIONS.map((p) => ({
        id: p.id,
        departmentId: p.departmentId,
        col: p.col,
        row: p.row,
      })),
      {
        cellWidth: GRID_CELL_WIDTH,
        cellHeight: GRID_CELL_HEIGHT,
        paddingCells: 0,
        smoothIterations: 0,
        magnetRadius: VARIANT_B_MAGNET_RADIUS,
      },
    );
    const rust2 = await computeAllContours(
      VARIANT_B_POSITIONS.map((p) => ({
        id: p.id,
        departmentId: p.departmentId,
        col: p.col,
        row: p.row,
      })),
      {
        cellWidth: GRID_CELL_WIDTH,
        cellHeight: GRID_CELL_HEIGHT,
        paddingCells: 2,
        smoothIterations: 0,
        magnetRadius: VARIANT_B_MAGNET_RADIUS,
      },
    );
    const paths0 = rust0.filter((c) => c.departmentId === 'IT').map((c) => c.path).sort();
    const paths2 = rust2.filter((c) => c.departmentId === 'IT').map((c) => c.path).sort();
    expect(paths0).not.toEqual(paths2);

    const geom = {
      nodeWidth: PERSON_CARD_WIDTH,
      nodeHeight: PERSON_CARD_HEIGHT,
      horizontalGap: VARIANT_B_HORIZONTAL_GAP,
      verticalGap: VARIANT_B_VERTICAL_GAP,
      refCellWidth: GRID_CELL_WIDTH,
      refCellHeight: GRID_CELL_HEIGHT,
      margin: 0,
    };
    const rowIds = ['P1', 'P2', 'P3'];
    const boxes = rowIds.map((id) => {
      const p = VARIANT_B_POSITIONS.find((x) => x.id === id)!;
      const box = resolvePositionAABB(
        {
          id,
          title: id,
          organizationId: 'o',
          groupIds: [],
          status: 'filled',
          isTemporary: false,
          gridCell: { col: p.col, row: p.row },
          width: PERSON_CARD_WIDTH,
          height: PERSON_CARD_HEIGHT,
        },
        geom,
      );
      return box;
    });

    const pad0 = (polishContourRings({ memberBoxes: boxes, strokeWidth: 0.9, paddingCells: 0 })[0] ?? []);
    const pad2 = (polishContourRings({ memberBoxes: boxes, strokeWidth: 0.9, paddingCells: 2 })[0] ?? []);
    const w0 = ringBounds(pad0).maxX - ringBounds(pad0).minX;
    const w2 = ringBounds(pad2).maxX - ringBounds(pad2).minX;
    expect(w2).toBeGreaterThan(w0 + 10);
  });

  it('failure: padding without member boxes paints nothing', () => {
    expect((polishContourRings({ memberBoxes: [], strokeWidth: 0.9, paddingCells: 2 })[0] ?? [])).toEqual([]);
  });
});
