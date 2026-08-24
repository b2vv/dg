import type { ContourPositionInput } from '../contour/bridge.js';
import type { ContourMemberBox } from './contourClearance.js';
import { clusterPositionsByDepartment } from './contourCluster.js';
import { memberBoxesForCluster } from './contourButtonGroup.js';
import { polishContourRing } from './contourPolish.js';
import { shouldPaintDeptContour } from './contourPaintFilter.js';
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
}

export interface PaintedMagneticGroup {
  departmentId: string;
  ring: { x: number; y: number }[];
}

/** One rounded button-group ring per magnetic cluster (paint only). */
export function paintMagneticGroups(args: PaintMagneticGroupsArgs): PaintedMagneticGroup[] {
  const magnetRadius = resolveMagnetRadius(args.magnetRadius);
  const out: PaintedMagneticGroup[] = [];
  for (const deptId of args.departmentIds) {
    if (!shouldPaintDeptContour(args.personCounts.get(deptId), args.minContourMembers)) {
      continue;
    }
    const members = args.memberBoxesByDept.get(deptId) ?? [];
    const clusters = clusterPositionsByDepartment(args.inputs, deptId, magnetRadius);
    for (const clusterIds of clusters) {
      const boxes = memberBoxesForCluster(clusterIds, members);
      const ring = polishContourRing(
        boxes,
        args.strokeWidth,
        args.paddingCells,
        args.smoothIterations,
      );
      if (ring.length >= 2) out.push({ departmentId: deptId, ring });
    }
  }
  return out;
}
