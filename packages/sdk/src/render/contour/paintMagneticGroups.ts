import type { ContourPositionInput } from '../../contour/bridge.js';
import type { ContourMemberBox } from './contourClearance.js';
import { clusterPositionsByDepartment } from './contourCluster.js';
import { memberBoxesForCluster } from './contourButtonGroup.js';
import { polishContourRings } from './contourPolish.js';
import { isPaintableDepartment, shouldPaintDeptContour } from './contourPaintFilter.js';
import { resolveMagnetRadius } from './magnetRadius.js';

export interface PaintMagneticGroupsArgs {
  inputs: readonly ContourPositionInput[];
  memberBoxesByDept: ReadonlyMap<string, readonly ContourMemberBox[]>;
  departmentIds: readonly string[];
  magnetRadius: number;
  strokeWidth: number;
  paddingCells: number;
  smoothIterations: number;
  personCounts: ReadonlyMap<string, number>;
  minContourMembers: number;
  /** G2 corridor in px; falls back to the wash margin when omitted. */
  corridorPx?: number;
}

export interface PaintedMagneticGroup {
  departmentId: string;
  ring: { x: number; y: number }[];
}

/** One rounded button-group ring per magnetic cluster (paint only). */
export function paintMagneticGroups(args: PaintMagneticGroupsArgs): PaintedMagneticGroup[] {
  const magnetRadius = resolveMagnetRadius(args.magnetRadius);
  const out: PaintedMagneticGroup[] = [];
  const allBoxes = [...args.memberBoxesByDept.values()].flat();
  for (const deptId of args.departmentIds) {
    // Seats without a department are foreign to every wash — they are in
    // `allBoxes` above, but they never get a contour of their own.
    if (!isPaintableDepartment(deptId)) continue;
    if (!shouldPaintDeptContour(args.personCounts.get(deptId), args.minContourMembers)) {
      continue;
    }
    const members = args.memberBoxesByDept.get(deptId) ?? [];
    const clusters = clusterPositionsByDepartment(args.inputs, deptId, magnetRadius);
    for (const clusterIds of clusters) {
      const boxes = memberBoxesForCluster(clusterIds, members);
      const own = new Set(boxes.map((b) => b.positionId));
      const rings = polishContourRings({
        memberBoxes: boxes,
        foreignBoxes: allBoxes.filter((b) => !own.has(b.positionId)),
        strokeWidth: args.strokeWidth,
        paddingCells: args.paddingCells,
        smoothIterations: args.smoothIterations,
        corridorPx: args.corridorPx,
      });
      for (const ring of rings) out.push({ departmentId: deptId, ring });
    }
  }
  return out;
}
