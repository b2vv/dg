import type { LodLevel } from './lod.js';
import type { ViewportTransform } from './Viewport.js';
import type { NodeRef } from '../interaction/types.js';

export type { PromoteCandidate } from './promoteTypes.js';

export interface WorldBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Map a world-space node AABB through the Pixi camera. */
export function worldBoxToScreen(box: WorldBox, viewport: ViewportTransform): ScreenRect {
  return {
    left: box.x * viewport.scale + viewport.x,
    top: box.y * viewport.scale + viewport.y,
    width: box.width * viewport.scale,
    height: box.height * viewport.scale,
  };
}

export type PromoteMode = 'off' | 'selection' | 'near-selection';

export interface ResolvePromoteIdsArgs {
  mode: PromoteMode;
  lod: LodLevel;
  selection: NodeRef | null;
  /** Cap simultaneous HTML cards (default 8). */
  maxCount?: number;
}

/**
 * Decide which node ids should be promoted to HTML.
 * `near-selection`: only when LOD is near and something is selected.
 * `selection`: any LOD with a selection.
 */
export function resolvePromoteIds(args: ResolvePromoteIdsArgs): string[] {
  const { mode, lod, selection, maxCount = 8 } = args;
  if (mode === 'off' || !selection) return [];
  if (mode === 'near-selection' && lod !== 'near') return [];

  const ids: string[] = [];
  const push = (id: string | undefined): void => {
    if (!id || ids.includes(id)) return;
    ids.push(id);
  };
  push(selection.id);
  push(selection.positionId);
  push(selection.personId);
  push(selection.organizationId);
  return ids.slice(0, Math.max(0, maxCount));
}

/** True when a screen rect intersects the viewport (with padding). */
export function screenRectInView(
  rect: ScreenRect,
  screen: { width: number; height: number },
  pad = 32,
): boolean {
  return (
    rect.left + rect.width > -pad &&
    rect.top + rect.height > -pad &&
    rect.left < screen.width + pad &&
    rect.top < screen.height + pad
  );
}
