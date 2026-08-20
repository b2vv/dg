import type { OrgDisplayMode } from './layout/index.js';
import type { MenuItem, NodeRef } from './interaction/types.js';

export type LayoutPatch =
  | { type: 'position-move'; positionId: string; col: number; row: number }
  | { type: 'matrix-reorder'; orgId: string; newIndex: number }
  | { type: 'matrix-cell'; orgId: string; row: number; col: number; ejectedOrgId?: string }
  | { type: 'block-shift'; positionIds: string[]; deltaLevel: number };

export interface OrgHierarchyCallbacks {
  onNodeClick?(node: NodeRef): void;
  onContextMenu?(node: NodeRef, defaultItems: MenuItem[]): MenuItem[] | void;
  onLayoutChange?(patch: LayoutPatch): void;
  onOrgModeChange?(mode: OrgDisplayMode): void;
  onSelectionChange?(nodes: NodeRef[]): void;
}
