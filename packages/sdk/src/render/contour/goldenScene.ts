import type { ContourPositionInput } from '../../contour/bridge.js';
import type { ContourMemberBox } from './contourClearance.js';
import type { PaintMagneticGroupsArgs } from './paintMagneticGroups.js';

/**
 * Three interleaved departments plus an undepartmented seat: every cluster has
 * foreign mass close enough to bite into its ring, and IT is split into two
 * clusters. The scene has to exercise clustering, the foreign filter and the
 * notch at once — otherwise a refactor could pass it while changing what is
 * actually drawn.
 */
export function goldenScene(): PaintMagneticGroupsArgs {
  const CELL = 100;
  const inputs: ContourPositionInput[] = [];
  const memberBoxesByDept = new Map<string, ContourMemberBox[]>();
  const personCounts = new Map<string, number>();
  const departmentIds = ['IT', 'HR', 'OPS'];

  const put = (dept: string, id: string, col: number, row: number) => {
    inputs.push({ id, departmentId: dept, col, row });
    const list = memberBoxesByDept.get(dept) ?? [];
    list.push({ positionId: id, x: col * CELL, y: row * CELL, width: 80, height: 60 });
    memberBoxesByDept.set(dept, list);
  };

  // IT: a contiguous row plus a detached pair → two clusters.
  put('IT', 'it-1', 0, 0);
  put('IT', 'it-2', 1, 0);
  put('IT', 'it-3', 2, 0);
  put('IT', 'it-4', 6, 3);
  put('IT', 'it-5', 7, 3);
  // HR: directly under IT, so each is foreign mass for the other.
  put('HR', 'hr-1', 1, 1);
  put('HR', 'hr-2', 2, 1);
  put('HR', 'hr-3', 3, 1);
  // OPS: an L whose empty corner IT can reach into.
  put('OPS', 'ops-1', 4, 0);
  put('OPS', 'ops-2', 4, 1);
  put('OPS', 'ops-3', 5, 1);
  // A seat with no department: foreign to everyone, contour of its own to none.
  put('__none__', 'x-1', 3, 0);

  for (const [dept, boxes] of memberBoxesByDept) personCounts.set(dept, boxes.length);

  return {
    inputs,
    memberBoxesByDept,
    departmentIds,
    personCounts,
    magnetRadius: 1.5,
    strokeWidth: 2,
    paddingCells: 1,
    smoothIterations: 1,
    minContourMembers: 1,
  };
}
