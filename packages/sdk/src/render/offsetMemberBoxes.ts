import type { ContourMemberBox } from './contourClearance.js';

export function cloneMemberBoxes(
  boxesByDept: ReadonlyMap<string, readonly ContourMemberBox[]> | undefined,
): Map<string, ContourMemberBox[]> {
  const out = new Map<string, ContourMemberBox[]>();
  if (!boxesByDept) return out;
  for (const [deptId, boxes] of boxesByDept) {
    out.set(
      deptId,
      boxes.map((b) => ({ ...b })),
    );
  }
  return out;
}

/**
 * Shift one card's world AABB by a grid-cell delta (T78-L6).
 * Drag preview patches col/row on contour inputs; paint still uses member boxes.
 */
export function offsetMemberBoxesForGridMove(
  boxesByDept: ReadonlyMap<string, readonly ContourMemberBox[]>,
  positionId: string,
  dCol: number,
  dRow: number,
  cellWidth: number,
  cellHeight: number,
): Map<string, ContourMemberBox[]> {
  const cloned = cloneMemberBoxes(boxesByDept);
  if (
    !Number.isFinite(dCol) ||
    !Number.isFinite(dRow) ||
    !Number.isFinite(cellWidth) ||
    !Number.isFinite(cellHeight) ||
    (dCol === 0 && dRow === 0)
  ) {
    return cloned;
  }

  const dx = dCol * cellWidth;
  const dy = dRow * cellHeight;
  for (const boxes of cloned.values()) {
    for (let i = 0; i < boxes.length; i += 1) {
      const b = boxes[i]!;
      if (b.positionId !== positionId) continue;
      boxes[i] = { ...b, x: b.x + dx, y: b.y + dy };
    }
  }
  return cloned;
}
