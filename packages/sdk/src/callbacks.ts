import type { OrgDisplayMode } from './layout/index.js';

export type LayoutPatch =
  | { type: 'position-move'; positionId: string; col: number; row: number }
  | { type: 'matrix-reorder'; orgId: string; newIndex: number }
  | { type: 'block-shift'; positionIds: string[]; deltaLevel: number };

export interface OrgHierarchyCallbacks {
  onNodeClick?(node: { kind: 'organization' | 'person'; id: string }): void;
  onLayoutChange?(patch: LayoutPatch): void;
  onOrgModeChange?(mode: OrgDisplayMode): void;
}
