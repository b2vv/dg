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
   * Diagnostics for the last render: soft layout warnings (anchor overlap,
   * skipped expands, etc.), led by a `Renderer: …` line naming the engine.
   * The engine line is present whenever the engine is known — that is, after a
   * successful mount and before `destroy()`; outside that window the list is
   * whatever the renderer had, or empty.
   */
  onLayoutDiagnostics?(messages: readonly string[]): void;
  /** T66: after position expand/collapse / expandToDepth batch. */
  onPositionExpandChange?(state: {
    positionId: string;
    expanded: boolean;
    changedIds: readonly string[];
  }): void;
}
