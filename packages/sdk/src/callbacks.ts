import type { OrgDisplayMode } from './layout/index.js';
import type { MenuItem, NodeRef } from './interaction/types.js';
import type { ContextMenuRequest } from './interaction/contextMenuPayload.js';

export type LayoutPatch =
  | { type: 'position-move'; positionId: string; col: number; row: number }
  | { type: 'matrix-reorder'; orgId: string; newIndex: number }
  | { type: 'matrix-cell'; orgId: string; row: number; col: number; ejectedOrgId?: string }
  | { type: 'block-shift'; positionIds: string[]; deltaLevel: number }
  | { type: 'position-expand'; positionId: string; expanded: boolean };

export interface OrgHierarchyCallbacks {
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
   * Soft layout warnings from the last render (anchor overlap, skipped expands, etc.).
   * Empty array when layout is clean.
   */
  onLayoutDiagnostics?(messages: readonly string[]): void;
  /** T66: after position expand/collapse / expandToDepth batch. */
  onPositionExpandChange?(state: {
    positionId: string;
    expanded: boolean;
    changedIds: readonly string[];
  }): void;
}
