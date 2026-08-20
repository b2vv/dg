export type OrgDisplayMode = 'matrix' | 'row-tree';

/** auto — розширювана сітка; square/rectangle — фіксована матриця з overflow */
export type MatrixShape = 'auto' | 'square' | 'rectangle';

export interface OrgLayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  margin?: number;
  matrixShape?: MatrixShape;
  matrixRows?: number;
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
  /** false — overflow або foreign-нода поза офіційною матрицею */
  inMatrix?: boolean;
  matrixRow?: number;
  matrixCol?: number;
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
  matrixShape: 'auto',
  matrixRows: 0,
  matrixColumns: 0,
};
