/**
 * Reserved department id for staff positions that carry no `departmentId`.
 *
 * Such a seat belongs to no contour, but it is still a card on the canvas: both
 * engines must treat it as **foreign** (M2) instead of ignoring it, or a
 * department wash swallows it. Bucketing it under this id makes it foreign for
 * every real department for free, and paint skips the bucket itself.
 */
export const NO_DEPARTMENT_ID = '\u0000no-department';

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
