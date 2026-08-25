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
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
  GRID_CELL_WIDTH,
  GRID_CELL_HEIGHT,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
  VARIANT_B_MAGNET_RADIUS,
} from './types.js';
import { resolvePositionAABB } from '../layout/staff/coords.js';
import {
  mapContourPointsToWorld,
  resolveContourWorldTransform,
} from './contour/contourWorldTransform.js';

function pointInPoly(x: number, y: number, pts: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i]!.x;
    const yi = pts[i]!.y;
    const xj = pts[j]!.x;
    const yj = pts[j]!.y;
    const inter =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

describe('Variant B contour coverage (adjacency magnetism)', () => {
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

  it('success: each IT center inside some IT component; CEO outside all', async () => {
    const cellW = GRID_CELL_WIDTH;
    const cellH = GRID_CELL_HEIGHT;
    const pitchX = cellW + VARIANT_B_HORIZONTAL_GAP;
    const pitchY = cellH + VARIANT_B_VERTICAL_GAP;
    const contours = await computeAllContours(
      VARIANT_B_POSITIONS.map((p) => ({
        id: p.id,
        departmentId: p.departmentId,
        col: p.col,
        row: p.row,
      })),
      {
        cellWidth: cellW,
        cellHeight: cellH,
        paddingCells: 0,
        smoothIterations: 0,
        magnetRadius: VARIANT_B_MAGNET_RADIUS,
        preferNotch: true,
      },
    );
    const itParts = contours.filter((c) => c.departmentId === 'IT');
    expect(itParts.length).toBe(3);

    const geom = {
      nodeWidth: PERSON_CARD_WIDTH,
      nodeHeight: PERSON_CARD_HEIGHT,
      horizontalGap: VARIANT_B_HORIZONTAL_GAP,
      verticalGap: VARIANT_B_VERTICAL_GAP,
      refCellWidth: cellW,
      refCellHeight: cellH,
      margin: 0,
    };
    const nodes = VARIANT_B_POSITIONS.map((p) => {
      const box = resolvePositionAABB(
        {
          id: p.id,
          title: p.id,
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
      return { id: p.id, dept: p.departmentId, col: p.col, row: p.row, ...box };
    });
    const posMap = new Map(
      nodes.map((n) => [n.id, { gridCell: { col: n.col, row: n.row } }]),
    );
    const world = resolveContourWorldTransform(nodes, posMap, cellW, cellH, pitchX, pitchY);
    const rings = itParts.map((c) => mapContourPointsToWorld(c.points, world));

    for (const n of nodes.filter((x) => x.dept === 'IT')) {
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      const hit = rings.some((ring) => pointInPoly(cx, cy, ring));
      expect(hit, `${n.id} must be inside some IT magnetic group`).toBe(true);
    }
    const ceo = nodes.find((n) => n.id === 'P4')!;
    const ceoHit = rings.some((ring) =>
      pointInPoly(ceo.x + ceo.width / 2, ceo.y + ceo.height / 2, ring),
    );
    expect(ceoHit, 'CEO must stay outside every IT group').toBe(false);
  });

  it('failure: empty IT positions yields no IT contour', async () => {
    const contours = await computeAllContours(
      [{ id: 'P4', departmentId: 'CEO', col: 1, row: 1 }],
      {
        cellWidth: GRID_CELL_WIDTH,
        cellHeight: GRID_CELL_HEIGHT,
        magnetRadius: VARIANT_B_MAGNET_RADIUS,
      },
    );
    expect(contours.find((c) => c.departmentId === 'IT')).toBeUndefined();
  });
});
