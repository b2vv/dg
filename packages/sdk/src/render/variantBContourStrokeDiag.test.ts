/**
 * Variant B: after Chaikin, contour path must stay clear of IT cards (T38).
 */
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
  contourCardClearanceMargin,
  nudgeContourClearOfBoxes,
} from './contour/contourClearance.js';
import {
  mapContourPointsToWorld,
  resolveContourWorldTransform,
} from './contour/contourWorldTransform.js';
import {
  buildStaffEdgeSegments,
  polylineHitsBoxInterior,
} from '../layout/staffEdgeGeometry.js';
import {
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
  defaultNodeTheme,
} from './types.js';

const REPORTS = [
  { fromId: 'P4', toId: 'P2', kind: 'admin' as const },
  { fromId: 'P2', toId: 'P1', kind: 'admin' as const },
  { fromId: 'P2', toId: 'P3', kind: 'admin' as const },
  { fromId: 'P4', toId: 'P5', kind: 'admin' as const },
  { fromId: 'P4', toId: 'P6', kind: 'admin' as const },
];

function segmentClearanceToBox(
  a: { x: number; y: number },
  b: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number },
): number {
  const samples = 16;
  let min = Infinity;
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const dx = Math.max(box.x - x, 0, x - (box.x + box.width));
    const dy = Math.max(box.y - y, 0, y - (box.y + box.height));
    min = Math.min(min, Math.hypot(dx, dy));
  }
  return min;
}

function ringClearance(
  mapped: { x: number; y: number }[],
  cards: { x: number; y: number; width: number; height: number }[],
): number {
  let minClear = Infinity;
  for (let i = 0; i < mapped.length; i += 1) {
    const a = mapped[i]!;
    const b = mapped[(i + 1) % mapped.length]!;
    for (const card of cards) {
      minClear = Math.min(minClear, segmentClearanceToBox(a, b, card));
    }
  }
  return minClear;
}

describe('Variant B contour stroke vs cards (T38)', () => {
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

  const geom = {
    nodeWidth: PERSON_CARD_WIDTH,
    nodeHeight: PERSON_CARD_HEIGHT,
    horizontalGap: VARIANT_B_HORIZONTAL_GAP,
    verticalGap: VARIANT_B_VERTICAL_GAP,
    refCellWidth: GRID_CELL_WIDTH,
    refCellHeight: GRID_CELL_HEIGHT,
    margin: 0,
  };

  async function worldContour(pad: number, smooth: number) {
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
        paddingCells: pad,
        smoothIterations: smooth,
        magnetRadius: 2,
        preferNotch: true,
      },
    );
    const itCards = contours.find((c) => c.departmentId === 'IT')!;
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
    const mapped = mapContourPointsToWorld(itCards.points, world);
    return { mapped, nodes, itCards };
  }

  it('failure: raw Chaikin (pad1/smooth2) dips into IT cards', async () => {
    const { mapped, nodes } = await worldContour(1, 2);
    const itCards = nodes.filter((n) => n.dept === 'IT');
    expect(ringClearance(mapped, itCards)).toBe(0);
  });

  it('success: nudged contour clears IT cards by ≥ stroke/2 + inset', async () => {
    const margin = contourCardClearanceMargin(defaultNodeTheme.department.strokeWidth);
    const { mapped, nodes } = await worldContour(1, 2);
    const itCards = nodes.filter((n) => n.dept === 'IT');
    const nudged = nudgeContourClearOfBoxes(mapped, itCards, margin);
    expect(ringClearance(nudged, itCards)).toBeGreaterThanOrEqual(margin - 1e-9);

    // Inflate/nudge must not swallow the CEO notch (foreign).
    const ceo = nodes.find((n) => n.id === 'P4')!;
    const cx = ceo.x + ceo.width / 2;
    const cy = ceo.y + ceo.height / 2;
    let inside = false;
    for (let i = 0, j = nudged.length - 1; i < nudged.length; j = i++) {
      const xi = nudged[i]!.x;
      const yi = nudged[i]!.y;
      const xj = nudged[j]!.x;
      const yj = nudged[j]!.y;
      const inter =
        yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi + 1e-9) + xi;
      if (inter) inside = !inside;
    }
    expect(inside).toBe(false);
  });

  it('success: report edges never cut card interiors', async () => {
    const boxes = VARIANT_B_POSITIONS.map((p) => {
      const box = resolvePositionAABB(
        {
          id: p.id,
          title: p.id,
          organizationId: 'o',
          groupIds: [],
          status: 'filled',
          isTemporary: false,
          gridCell: { col: p.col, row: p.row },
        },
        geom,
      );
      return { id: p.id, ...box };
    });
    const segs = buildStaffEdgeSegments(REPORTS, boxes);
    for (const seg of segs) {
      for (const box of boxes) {
        expect(
          polylineHitsBoxInterior(seg.points, box),
          `${seg.fromId}→${seg.toId} hits ${box.id}`,
        ).toBe(false);
      }
    }
  });
});
