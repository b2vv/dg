import { contourDepartmentId } from '../data/types.js';

/**
 * How many positions the department establishes, **not** how many are on screen.
 *
 * The distinction is the whole point of the function. A department card is drawn
 * around the member boxes that the layout produced, and a collapsed head
 * contributes no boxes for its reports — so `members.length` falls as the user
 * collapses, while the establishment it is meant to state does not. The count
 * therefore comes from the data (`data.positions`), never from the laid-out
 * boxes the frame is fitted to.
 */
export function countDepartmentPositions(
  positions: readonly { departmentId?: string }[],
  departmentId: string,
): number {
  let count = 0;
  for (const position of positions) {
    if (contourDepartmentId(position) === departmentId) count += 1;
  }
  return count;
}

/**
 * Department header badge, in the mockup's copy — `«N поз.»`.
 *
 * Returns `undefined` for zero rather than `«0 поз.»`, following the other card
 * badges here ({@link formatOrgCountsBadge}): a badge that states nothing is
 * noise on the frame, and the caller omits the `Text` entirely.
 */
export function formatDepartmentPositionsBadge(count: number): string | undefined {
  if (count <= 0) return undefined;
  return `${count} поз.`;
}
