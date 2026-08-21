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
import { filterContoursForPaint } from './contourPaintFilter.js';
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
} from './contourWorldTransform.js';
import { polishContourRing } from './contourPolish.js';

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

describe('Variant B notch paint (T46)', () => {
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

  it('success: minContourMembers=2 paints only IT; CEO center outside painted wash', async () => {
    const cellW = GRID_CELL_WIDTH;
    const cellH = GRID_CELL_HEIGHT;
    const pitchX = cellW + VARIANT_B_HORIZONTAL_GAP;
    const pitchY = cellH + VARIANT_B_VERTICAL_GAP;
    const all = await computeAllContours(
      VARIANT_B_POSITIONS.map((p) => ({
        id: p.id,
        departmentId: p.departmentId,
        col: p.col,
        row: p.row,
      })),
      {
        cellWidth: cellW,
        cellHeight: cellH,
        paddingCells: 1,
        smoothIterations: 1,
        magnetRadius: VARIANT_B_MAGNET_RADIUS,
        preferNotch: true,
      },
    );
    const counts = new Map<string, number>();
    for (const p of VARIANT_B_POSITIONS) {
      counts.set(p.departmentId, (counts.get(p.departmentId) ?? 0) + 1);
    }
    const painted = filterContoursForPaint(all, counts, 2);
    expect(painted.filter((c) => c.departmentId === 'IT')).toHaveLength(3);
    expect(painted.some((c) => c.departmentId === 'CEO')).toBe(false);

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
    const rings = painted.map((c) => {
      const boxes = nodes
        .filter((n) => n.dept === c.departmentId)
        .map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height }));
      return polishContourRing(mapContourPointsToWorld(c.points, world), boxes, 2);
    });
    const ceo = nodes.find((n) => n.id === 'P4')!;
    expect(
      rings.some((ring) => pointInPoly(ceo.x + ceo.width / 2, ceo.y + ceo.height / 2, ring)),
      'CEO must stay outside painted IT washes',
    ).toBe(false);
    for (const n of nodes.filter((x) => x.dept === 'IT')) {
      expect(
        rings.some((ring) => pointInPoly(n.x + n.width / 2, n.y + n.height / 2, ring)),
        `${n.id} inside some IT group`,
      ).toBe(true);
    }
  });

  it('failure: minContourMembers=2 drops departments with a single position', () => {
    const painted = filterContoursForPaint(
      [{ departmentId: 'CEO' }, { departmentId: 'IT' }],
      new Map([
        ['CEO', 1],
        ['IT', 5],
      ]),
      2,
    );
    expect(painted.some((c) => c.departmentId === 'CEO')).toBe(false);
  });
});
