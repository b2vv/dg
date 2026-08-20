import type { OrgDisplayMode } from './layout/index.js';
import type { MenuItem, NodeRef } from './interaction/types.js';
import type { ContextMenuRequest } from './interaction/contextMenuPayload.js';

export type LayoutPatch =
  | { type: 'position-move'; positionId: string; col: number; row: number }
  | { type: 'matrix-reorder'; orgId: string; newIndex: number }
  | { type: 'matrix-cell'; orgId: string; row: number; col: number; ejectedOrgId?: string }
  | { type: 'block-shift'; positionIds: string[]; deltaLevel: number };

export interface OrgHierarchyCallbacks {
  onNodeClick?(node: NodeRef): void;
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
}
