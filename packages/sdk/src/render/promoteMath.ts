import type { LodLevel } from './lod.js';
import type { ViewportTransform } from './Viewport.js';
import type { NodeKind, NodeRef } from '../interaction/types.js';
import { nodeEntityKey, parseNodeEntityKey } from '../interaction/nodeKey.js';

// The key format is entity identity, not render geometry — it lives in
// `interaction/nodeKey.ts` and is re-exported here for existing callers.
export { nodeEntityKey, parseNodeEntityKey };

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

/** True when `wanted` names this box — typed `kind:id` or a raw entity id. */
export function promoteIdMatches(
  wanted: ReadonlySet<string>,
  boxId: string,
  kind?: NodeKind,
): boolean {
  if (wanted.has(boxId)) return true;
  const parsed = parseNodeEntityKey(boxId);
  if (parsed) {
    if (wanted.has(parsed.id) || wanted.has(nodeEntityKey(parsed.kind, parsed.id))) {
      return true;
    }
  }
  if (kind && wanted.has(nodeEntityKey(kind, boxId))) return true;
  for (const w of wanted) {
    const wp = parseNodeEntityKey(w);
    if (!wp) continue;
    if (wp.id === boxId) return true;
    if (parsed && wp.kind === parsed.kind && wp.id === parsed.id) return true;
  }
  return false;
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

/**
 * `off` — nothing is promoted.
 * `selection` — the selected node, at any zoom.
 * `near-selection` — the selected node, only in the `near` band.
 * `near-visible` — every visible card in the `near` band, not just the selection.
 */
export type PromoteMode = 'off' | 'selection' | 'near-selection' | 'near-visible';

/**
 * The `near-visible` gate. It answers only "is this a zoom band where cards
 * deserve real chrome", because the band is the whole rule: the limit is zoom,
 * never a card count. A bigger screen shows more cards at the same zoom, and
 * that is the intended behaviour rather than something to cap.
 *
 * `near` is deliberately the same threshold Pixi's LOD already uses — one
 * boundary for "close enough to be worth detail", not two that can drift apart.
 */
export function nearVisibleGateOpen(lod: LodLevel): boolean {
  return lod === 'near';
}

export interface ResolvePromoteIdsArgs {
  mode: PromoteMode;
  lod: LodLevel;
  selection: NodeRef | null;
  /** Cap simultaneous HTML cards (default 8). */
  maxCount?: number;
}

/**
 * One visual per selection. Person/position share the position card;
 * organizationId on a person ref is not promoted (that hid the org chrome).
 */
export function promoteVisualForSelection(
  selection: NodeRef,
): { kind: NodeKind; id: string } | null {
  if (selection.kind === 'organization') {
    const id = selection.organizationId ?? selection.id;
    return id ? { kind: 'organization', id } : null;
  }
  const positionId =
    selection.positionId ?? (selection.kind === 'position' ? selection.id : undefined);
  if (positionId) return { kind: 'position', id: positionId };
  if (selection.kind === 'person') {
    const id = selection.personId ?? selection.id;
    return id ? { kind: 'person', id } : null;
  }
  return selection.id ? { kind: selection.kind, id: selection.id } : null;
}

/**
 * Decide which node ids should be promoted to HTML **from the selection**.
 * `near-selection`: only when LOD is near and something is selected.
 * `selection`: any LOD with a selection.
 * Returns typed `kind:id` keys (at most one visual per selection).
 *
 * `near-visible` is not answerable here and returns nothing: which cards are
 * visible depends on scene geometry and screen size, neither of which is on this
 * function's input. Promoting the selection instead would look like it worked —
 * one card would appear — and that is the harder failure to notice, so the
 * empty answer is the deliberate one. {@link nearVisibleGateOpen} is that
 * mode's half of the decision; the overlay owns the other half.
 */
export function resolvePromoteIds(args: ResolvePromoteIdsArgs): string[] {
  const { mode, lod, selection, maxCount = 8 } = args;
  if (mode === 'off' || mode === 'near-visible' || !selection) return [];
  if (mode === 'near-selection' && lod !== 'near') return [];

  const visual = promoteVisualForSelection(selection);
  if (!visual) return [];
  return [nodeEntityKey(visual.kind, visual.id)].slice(0, Math.max(0, maxCount));
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
