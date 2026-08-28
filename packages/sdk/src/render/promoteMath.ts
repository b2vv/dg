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

/**
 * What a `maxPromoted` value actually means, decided in one place.
 *
 * `null` is "no ceiling". Out-of-range values land there rather than on zero,
 * because a host that mistypes the cap should get a working feature it can see
 * rather than an empty layer that looks like the feature is broken.
 *
 * Every caller that applies a ceiling asks here. Two expressions of the same
 * rule is how one rule quietly becomes two.
 */
export function resolvePromoteCap(max?: number): number | null {
  if (max == null || !Number.isFinite(max) || max < 0) return null;
  return Math.floor(max);
}

/**
 * Trim a set of on-screen cards to `max`, keeping those nearest the middle of
 * the screen — where the user is looking.
 *
 * Lives here, next to the geometry, rather than in {@link resolvePromoteIds},
 * which has neither rectangles nor a screen to measure against.
 *
 * The cap is a host lever, not the rule: **the rule is zoom**, and the default
 * is no ceiling. Out-of-range values fall back to that default rather than to
 * zero, because a host that mistypes the cap should get a working feature it can
 * see, not an empty layer that looks like the feature is broken.
 *
 * - not a finite number, or negative -> no ceiling
 * - `0` -> nothing is promoted (every node stays on the canvas; no holes, since
 *   the same empty list is what gets hidden in Pixi)
 * - fractional -> rounded down
 */
export function pickNearestToCenter<T extends { screenRect: ScreenRect }>(
  items: readonly T[],
  screen: { width: number; height: number },
  max?: number,
): T[] {
  const cap = resolvePromoteCap(max);
  if (cap === null) return [...items];
  if (cap === 0) return [];
  if (items.length <= cap) return [...items];

  const cx = screen.width / 2;
  const cy = screen.height / 2;
  const distance = (r: ScreenRect): number => {
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;
    return dx * dx + dy * dy; // squared: same ordering, no square root
  };
  // Array.prototype.sort is stable, so cards at equal distance keep their input
  // order and the layer does not reshuffle between two identical syncs.
  return [...items]
    .map((item, index) => ({ item, index, d: distance(item.screenRect) }))
    .sort((a, b) => a.d - b.d || a.index - b.index)
    .slice(0, cap)
    .map((entry) => entry.item);
}

/**
 * The correction that makes cards drawn for one camera look right under another,
 * without touching a single card.
 *
 * Positions in the promote layer are computed for a specific viewport and then
 * left alone while the camera moves — recomputing dozens of them per frame is
 * the cost this whole design avoids. Applying this transform to the layer keeps
 * those stale positions correct until the camera settles and they are rebuilt.
 *
 * Returns `null` when the previous camera had zero scale, which carries no
 * information about where anything was: the caller must rebuild instead.
 */
export function viewportCatchUpTransform(
  from: ViewportTransform,
  to: ViewportTransform,
): ViewportTransform | null {
  if (!from.scale) return null;
  const scale = to.scale / from.scale;
  return { x: to.x - from.x * scale, y: to.y - from.y * scale, scale };
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
