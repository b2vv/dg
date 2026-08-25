import { NO_DEPARTMENT_ID } from '../../data/types.js';

/** Seats with no department own no contour, so their bucket is never painted. */
export function isPaintableDepartment(departmentId: string): boolean {
  return departmentId !== NO_DEPARTMENT_ID;
}

/**
 * Paint filter for department contours (T46).
 * Membership / magnetism still compute for every dept; this only decides
 * which results become visible blobs so singleton foreign heads do not
 * refill an IT notch with the same wash color.
 */
export function shouldPaintDeptContour(
  positionCount: number | undefined,
  minContourMembers: number,
): boolean {
  const min = Number.isFinite(minContourMembers) ? Math.max(1, Math.floor(minContourMembers)) : 1;
  const count = positionCount ?? 0;
  return count >= min;
}

export function filterContoursForPaint<T extends { departmentId: string }>(
  contours: readonly T[],
  personCounts: ReadonlyMap<string, number>,
  minContourMembers: number,
): T[] {
  return contours.filter(
    (c) =>
      isPaintableDepartment(c.departmentId) &&
      shouldPaintDeptContour(personCounts.get(c.departmentId), minContourMembers),
  );
}
