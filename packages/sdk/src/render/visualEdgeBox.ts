import type { LodLevel } from './lod.js';
import type { StaffEdgeBox } from './staffEdgeGeometry.js';

/**
 * Edge routing AABB that matches what PersonNode actually paints at this LOD.
 * Layout boxes stay full cell cards; mid/far chrome is smaller — ports must follow.
 */
export function visualPersonEdgeBox(box: StaffEdgeBox, lod: LodLevel): StaffEdgeBox {
  if (lod === 'near') {
    return { id: box.id, x: box.x, y: box.y, width: box.width, height: box.height };
  }
  if (lod === 'mid') {
    const height = Math.min(box.height, Math.max(56, box.height * 0.48));
    // Center in the layout AABB so zoom/LOD does not pin chrome to the top.
    const y = box.y + (box.height - height) / 2;
    return { id: box.id, x: box.x, y, width: box.width, height };
  }
  // far: tight box around the centered avatar dot
  const r = Math.max(6, Math.min(box.width, box.height) * 0.18);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return {
    id: box.id,
    x: cx - r,
    y: cy - r,
    width: r * 2,
    height: r * 2,
  };
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
