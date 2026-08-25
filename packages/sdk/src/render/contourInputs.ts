import { contourDepartmentId } from '../data/types.js';
import type { ContourPositionInput } from '../contour/bridge.js';
import type { ContourMemberBox } from './contourClearance.js';

/** Laid-out card box a contour input is derived from. */
export interface ContourNodeBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContourSceneInputs {
  /** Cell-space inputs — only seats with authored coords can join a grid. */
  inputs: ContourPositionInput[];
  /** World-space cards per department, including the no-department bucket. */
  memberBoxesByDept: Map<string, ContourMemberBox[]>;
}

/**
 * Contour inputs and member boxes for one laid-out scene.
 *
 * The two collections deliberately differ: a seat without `gridCell` cannot
 * join a cell grid, but it still owns a card, so it stays in the member boxes
 * where the painter reads it as foreign mass (M2). Both engines, the matrix
 * path and the SVG export share this, so the rule cannot drift between them.
 */
export function contourSceneInputs(
  nodes: readonly ContourNodeBox[],
  positionById: ReadonlyMap<string, { departmentId?: string; gridCell?: { col: number; row: number } }>,
): ContourSceneInputs {
  const inputs: ContourPositionInput[] = [];
  const memberBoxesByDept = new Map<string, ContourMemberBox[]>();

  for (const node of nodes) {
    const position = positionById.get(node.id);
    if (!position) continue;
    const departmentId = contourDepartmentId(position);

    const list = memberBoxesByDept.get(departmentId) ?? [];
    list.push({
      positionId: node.id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    });
    memberBoxesByDept.set(departmentId, list);

    if (!position.gridCell) continue;
    inputs.push({
      id: node.id,
      departmentId,
      col: position.gridCell.col,
      row: position.gridCell.row,
    });
  }

  return { inputs, memberBoxesByDept };
}

/** Card boxes for a matrix scene, where coords come from the cell grid itself. */
export function matrixNodeBoxes(
  positions: readonly { id: string; gridCell?: { col: number; row: number } }[],
  geometry: { cellWidth: number; cellHeight: number; cardWidth: number; cardHeight: number },
): ContourNodeBox[] {
  const insetX = (geometry.cellWidth - geometry.cardWidth) / 2;
  const insetY = (geometry.cellHeight - geometry.cardHeight) / 2;
  return positions
    .filter((p): p is typeof p & { gridCell: { col: number; row: number } } => !!p.gridCell)
    .map((p) => ({
      id: p.id,
      x: p.gridCell.col * geometry.cellWidth + insetX,
      y: p.gridCell.row * geometry.cellHeight + insetY,
      width: geometry.cardWidth,
      height: geometry.cardHeight,
    }));
}
