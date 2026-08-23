import type { LodLevel } from './lod.js';

/** Local visual rect inside a person node's layout AABB (T44 A4). */
export interface PersonVisualRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Mid LOD band height — matches PersonNode + edge ports. */
export function personMidBandHeight(layoutHeight: number): number {
  return Math.min(layoutHeight, Math.max(56, layoutHeight * 0.48));
}

/** Far LOD avatar dot radius. */
export function personFarDotRadius(width: number, height: number): number {
  return Math.max(6, Math.min(width, height) * 0.18);
}

/**
 * Visible person chrome in **local** node coordinates (0…layoutW/H).
 * Shared by PersonNode paint, hit-test, and `visualPersonEdgeBox`.
 */
export function personVisualLocalRect(
  layoutWidth: number,
  layoutHeight: number,
  lod: LodLevel,
): PersonVisualRect {
  if (lod === 'near') {
    return { x: 0, y: 0, width: layoutWidth, height: layoutHeight };
  }
  if (lod === 'mid') {
    const height = personMidBandHeight(layoutHeight);
    return {
      x: 0,
      y: (layoutHeight - height) / 2,
      width: layoutWidth,
      height,
    };
  }
  const r = personFarDotRadius(layoutWidth, layoutHeight);
  const cx = layoutWidth / 2;
  const cy = layoutHeight / 2;
  return {
    x: cx - r,
    y: cy - r,
    width: r * 2,
    height: r * 2,
  };
}

/** Offset local visual rect into world/staff edge space. */
export function personVisualWorldRect(
  box: { id: string; x: number; y: number; width: number; height: number },
  lod: LodLevel,
): PersonVisualRect & { id: string } {
  const local = personVisualLocalRect(box.width, box.height, lod);
  return {
    id: box.id,
    x: box.x + local.x,
    y: box.y + local.y,
    width: local.width,
    height: local.height,
  };
}
