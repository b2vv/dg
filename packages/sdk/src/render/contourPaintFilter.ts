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
  return contours.filter((c) =>
    shouldPaintDeptContour(personCounts.get(c.departmentId), minContourMembers),
  );
}
