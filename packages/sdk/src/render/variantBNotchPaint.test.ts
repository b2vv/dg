import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resetContourWasmForTests,
  setContourWasmLoaderForTests,
  VARIANT_B_POSITIONS,
} from '../contour/bridge.js';
import { filterContoursForPaint } from './contourPaintFilter.js';
import { paintMagneticGroups } from './paintMagneticGroups.js';
import type { ContourMemberBox } from './contourClearance.js';
import {
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_MAGNET_RADIUS,
  VARIANT_B_VERTICAL_GAP,
} from './types.js';
import { resolvePositionAABB } from '../layout/staff/coords.js';

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

  it('success: minContourMembers=2 paints only IT; CEO center outside painted wash', () => {
    const cellW = GRID_CELL_WIDTH;
    const cellH = GRID_CELL_HEIGHT;
    const inputs = VARIANT_B_POSITIONS.map((p) => ({
      id: p.id,
      departmentId: p.departmentId,
      col: p.col,
      row: p.row,
    }));
    const counts = new Map<string, number>();
    for (const p of VARIANT_B_POSITIONS) {
      counts.set(p.departmentId, (counts.get(p.departmentId) ?? 0) + 1);
    }

    const geom = {
      nodeWidth: PERSON_CARD_WIDTH,
      nodeHeight: PERSON_CARD_HEIGHT,
      horizontalGap: VARIANT_B_HORIZONTAL_GAP,
      verticalGap: VARIANT_B_VERTICAL_GAP,
      refCellWidth: cellW,
      refCellHeight: cellH,
      margin: 0,
    };
    const memberBoxesByDept = new Map<string, ContourMemberBox[]>();
    for (const p of VARIANT_B_POSITIONS) {
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
      const list = memberBoxesByDept.get(p.departmentId) ?? [];
      list.push({ positionId: p.id, ...box });
      memberBoxesByDept.set(p.departmentId, list);
    }

    const painted = paintMagneticGroups({
      inputs,
      memberBoxesByDept,
      departmentIds: ['CEO', 'IT'],
      magnetRadius: VARIANT_B_MAGNET_RADIUS,
      strokeWidth: 0.9,
      paddingCells: 1,
      smoothIterations: 1,
      personCounts: counts,
      minContourMembers: 2,
    });
    expect(painted.filter((g) => g.departmentId === 'IT')).toHaveLength(3);
    expect(painted.some((g) => g.departmentId === 'CEO')).toBe(false);

    const rings = painted.map((g) => g.ring);
    const nodes = VARIANT_B_POSITIONS.map((p) => {
      const m = memberBoxesByDept.get(p.departmentId)!.find((b) => b.positionId === p.id)!;
      return { id: p.id, dept: p.departmentId, ...m };
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
