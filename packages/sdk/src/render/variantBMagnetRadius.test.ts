import { describe, expect, it } from 'vitest';
import { VARIANT_B_POSITIONS } from '../contour/bridge.js';
import { clusterPositionsByDepartment } from './contour/contourCluster.js';
import { ContourConfigError, resolveMagnetRadius } from '../contour/magnetRadius.js';
import { paintMagneticGroups } from './contour/paintMagneticGroups.js';
import type { ContourMemberBox } from './contour/contourClearance.js';
import {
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  VARIANT_B_MAGNET_RADIUS,
} from './types.js';

/** T78-T3: assert live paint clustering, not dead Rust flood. */
describe('Variant B magnet radius (T49 adjacency / T78-T3 paint)', () => {
  const inputs = VARIANT_B_POSITIONS.map((p) => ({
    id: p.id,
    departmentId: p.departmentId,
    col: p.col,
    row: p.row,
  }));

  function memberBoxes(): Map<string, ContourMemberBox[]> {
    const map = new Map<string, ContourMemberBox[]>();
    for (const p of VARIANT_B_POSITIONS) {
      const list = map.get(p.departmentId) ?? [];
      list.push({
        positionId: p.id,
        x: p.col * GRID_CELL_WIDTH + 2,
        y: p.row * GRID_CELL_HEIGHT + 2,
        width: PERSON_CARD_WIDTH,
        height: PERSON_CARD_HEIGHT,
      });
      map.set(p.departmentId, list);
    }
    return map;
  }

  it('success: demo radius 1.5 splits IT into 3 magnetic groups (top / P5 / P6)', () => {
    expect(VARIANT_B_MAGNET_RADIUS).toBe(1.5);
    const clusters = clusterPositionsByDepartment(inputs, 'IT', VARIANT_B_MAGNET_RADIUS);
    expect(clusters).toHaveLength(3);

    const counts = new Map<string, number>();
    for (const p of inputs) {
      counts.set(p.departmentId, (counts.get(p.departmentId) ?? 0) + 1);
    }
    const painted = paintMagneticGroups({
      inputs,
      memberBoxesByDept: memberBoxes(),
      departmentIds: ['CEO', 'IT'],
      magnetRadius: VARIANT_B_MAGNET_RADIUS,
      strokeWidth: 2,
      paddingCells: 0,
      smoothIterations: 0,
      personCounts: counts,
      minContourMembers: 1,
    });
    expect(painted.filter((g) => g.departmentId === 'IT')).toHaveLength(3);
  });

  it('failure: radius 2 merges IT into one C-blob (not adjacency magnetism)', () => {
    const clusters = clusterPositionsByDepartment(inputs, 'IT', 2);
    expect(clusters).toHaveLength(1);
  });

  it('failure: NaN magnetRadius rejects (T78-T4)', () => {
    expect(() => resolveMagnetRadius(Number.NaN)).toThrow(ContourConfigError);
    expect(() => clusterPositionsByDepartment(inputs, 'IT', Number.NaN)).toThrow(
      ContourConfigError,
    );
  });
});
