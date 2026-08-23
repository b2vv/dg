import type { LodLevel } from './lod.js';
import type { StaffEdgeBox } from './staffEdgeGeometry.js';
import { personVisualWorldRect } from './personVisualGeometry.js';

/**
 * Edge routing AABB that matches what PersonNode actually paints at this LOD.
 * Layout boxes stay full cell cards; mid/far chrome is smaller — ports must follow.
 */
export function visualPersonEdgeBox(box: StaffEdgeBox, lod: LodLevel): StaffEdgeBox {
  return personVisualWorldRect(box, lod);
}

/** Org card visual bounds (far = symbol chip, vertically centered). */
export function visualOrgEdgeBox(
  box: StaffEdgeBox,
  lod: LodLevel,
  symbolSize = 36,
): StaffEdgeBox {
  if (lod !== 'far') {
    return { id: box.id, x: box.x, y: box.y, width: box.width, height: box.height };
  }
  const size = Math.min(symbolSize, 36, box.width, box.height);
  return {
    id: box.id,
    x: box.x,
    y: box.y + (box.height - size) / 2,
    width: size,
    height: size,
  };
}

export function mapStaffEdgeBoxesForLod(
  positionNodes: readonly StaffEdgeBox[],
  orgCards: readonly StaffEdgeBox[],
  lod: LodLevel,
): StaffEdgeBox[] {
  return [
    ...positionNodes.map((n) => visualPersonEdgeBox(n, lod)),
    ...orgCards.map((c) => visualOrgEdgeBox(c, lod)),
  ];
}
