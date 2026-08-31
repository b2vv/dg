import type { OrgDisplayMode } from './layout/index.js';
import type { MenuItem, NodeRef } from './interaction/types.js';
import type { ContextMenuRequest } from './interaction/contextMenuPayload.js';
import type { ViewportTransform } from './render/Viewport.js';

export type LayoutPatch =
  | { type: 'position-move'; positionId: string; col: number; row: number }
  | { type: 'matrix-reorder'; orgId: string; newIndex: number }
  | { type: 'matrix-cell'; orgId: string; row: number; col: number; ejectedOrgId?: string }
  | { type: 'block-shift'; positionIds: string[]; deltaLevel: number }
  | { type: 'position-expand'; positionId: string; expanded: boolean };

/** Why the visible area changed. A resize moves no camera (T88). */
export type ViewportChangeReason = 'camera' | 'resize';

export interface ViewportChangeMeta {
  /** True on the one call that follows the camera coming to rest. */
  settled: boolean;
  reason: ViewportChangeReason;
}

export interface OrgHierarchyCallbacks {
  /**
   * The visible area changed: the camera moved, or the surface was resized.
   *
   * Coalesced to one call per frame while moving, then one more with
   * `settled: true` once the camera has been still for `viewportSettleMs`.
   * A host that materializes data for what is on screen wants both: the moving
   * calls to decide whether its reserve is running out, the settled one to
   * rebuild without doing it mid-gesture.
   *
   * `reason` matters because a resize changes how much of the scene fits
   * **without moving the camera** — a host that only watched the transform would
   * leave a bare strip along the new edge and never fill it.
   */
  onViewportChange?(transform: ViewportTransform, meta: ViewportChangeMeta): void;
  onNodeClick?(node: NodeRef): void;
  /** Double-click → host sidebar (T69 / D5). */
  onNodeDoubleClick?(node: NodeRef): void;
  /**
   * Right-click on a node. `request.node` carries Diagram* entities for the host React menu.
   * Return items to replace defaults, `false` to cancel, or void to keep defaults.
   */
  onContextMenu?(request: ContextMenuRequest): MenuItem[] | false | void;
  onLayoutChange?(patch: LayoutPatch): void;
  onOrgModeChange?(mode: OrgDisplayMode): void;
  onSelectionChange?(nodes: NodeRef[]): void;
  /** Fired when a context-menu item is activated (SDK defaults or host menu). */
  onContextMenuAction?(item: MenuItem, request: ContextMenuRequest): void;
  /** Fired after setData / create mapping completes */
  onDataMapped?(stats: { orgs: number; persons: number; positions: number; ms: number }): void;
  /**
   * Search the host's full dataset, beyond the slice the diagram holds.
   *
   * The diagram searches what it has. When the host is windowing a large
   * address space — a few thousand seats materialised out of a million — a
   * person who exists at an index the window does not cover produces no hits,
   * and the user cannot tell «no such person» from «not loaded». This callback
   * is how the diagram asks the side that does have the whole dataset.
   *
   * Called only by {@link OrgHierarchyDiagram.searchAll}; `search()` never
   * reaches for it and keeps returning what is on screen. Not supplying this is
   * a supported state, not a degraded one.
   *
   * Answers are paged: `page` is zero-based and a page holds at most
   * {@link SEARCH_PAGE_SIZE} hits. `total` counts every match in the dataset,
   * not the page — a caller that wants to say «10 000 matches» cannot get that
   * number from an array's length.
   *
   * Throwing, or answering with anything that is not a {@link HostSearchPage},
   * is reported to the caller as *unavailable*. It is never reported as «no
   * matches»: a host that is down and a dataset that is empty are different
   * facts and the user acts on them differently.
   */
  searchBeyondWindow?(query: string, page: number): Promise<HostSearchPage>;
  /**
   * Diagnostics for the last render: soft layout warnings (anchor overlap,
   * skipped expands, etc.), led by a `Renderer: …` line naming the engine.
   * The engine line is present whenever the engine is known — that is, after a
   * successful mount and before `destroy()`; outside that window the list is
   * whatever the renderer had, or empty.
   */
  onLayoutDiagnostics?(messages: readonly string[]): void;
  /**
   * The scene was **not** drawn, and why.
   *
   * A separate channel from {@link onLayoutDiagnostics} on purpose: diagnostics
   * are soft warnings about a scene that *was* drawn — an empty contour layer,
   * a skipped expand — and a host reads them to explain what it sees. This one
   * says there is nothing to explain, because the frame never happened.
   *
   * The failure is reported here **and** rethrown to whoever asked for the
   * render. Reporting without rethrowing would leave every caller that mutated
   * state before rendering to discover on its own whether to roll back, which
   * is how a diagram ends up describing a tree it never drew.
   */
  onRenderFailed?(failure: RenderFailure): void;
  /** T66: after position expand/collapse / expandToDepth batch. */
  onPositionExpandChange?(state: {
    positionId: string;
    expanded: boolean;
    changedIds: readonly string[];
  }): void;
}

/** One hit from the host's dataset. The node need not be materialised. */
export interface HostSearchHit {
  /** Id in the host's full dataset — a position, person or organisation id. */
  id: string;
  label: string;
}

/** One page of host search results. See {@link OrgHierarchyCallbacks.searchBeyondWindow}. */
export interface HostSearchPage {
  hits: readonly HostSearchHit[];
  /** Every match in the dataset, not the page. */
  total: number;
  hasMore: boolean;
}

/**
 * Hits per page, fixed rather than negotiated.
 *
 * Both sides have to agree on it — the host slices its dataset by it, the
 * caller renders a virtualised list against it — and a per-call page size buys
 * nothing but a way for the two to disagree.
 */
export const SEARCH_PAGE_SIZE = 20;

/** Why the last render did not produce a frame. See {@link OrgHierarchyCallbacks.onRenderFailed}. */
export interface RenderFailure {
  /** Message fit to show a person — the thrown error's own text when it had one. */
  reason: string;
  /** The original throw, for hosts that log rather than display. */
  cause: unknown;
}
