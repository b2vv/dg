export type OrgDisplayMode = 'matrix' | 'row-tree';

export interface OrgLayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  margin?: number;
  matrixColumns?: number;
}

export interface OrgLayoutNode {
  id: string;
  orgId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  parentId?: string;
}

export interface OrgLayoutEdge {
  fromId: string;
  toId: string;
  path: string;
  kind?: 'admin' | 'matrix' | 'link';
}

export interface OrgLayoutResult {
  mode: OrgDisplayMode;
  nodes: OrgLayoutNode[];
  edges: OrgLayoutEdge[];
  width: number;
  height: number;
}

export const DEFAULT_ORG_LAYOUT_OPTIONS: Required<OrgLayoutOptions> = {
  nodeWidth: 220,
  nodeHeight: 72,
  horizontalGap: 40,
  verticalGap: 60,
  margin: 24,
  matrixColumns: 0,
};
