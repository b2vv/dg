import { OrgHierarchyError } from './orgTree.js';

export type OrgDisplayMode = 'matrix' | 'row-tree';

/** auto — розширювана сітка; square/rectangle — фіксована матриця з overflow */
export type MatrixShape = 'auto' | 'square' | 'rectangle';

/** Matrix admin edge paint (T63). Row-tree ignores this. */
export type OrgEdgeStyle = 'per-link' | 'spine-bus';

export interface OrgLayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  margin?: number;
  matrixShape?: MatrixShape;
  matrixRows?: number;
  matrixColumns?: number;
  /**
   * Matrix admin edges: shared spine + row bus + risers (T63),
   * or classic per-link orthogonal routes.
   * Default `spine-bus`. Row-tree mode ignores this (keeps tree paths).
   */
  orgEdgeStyle?: OrgEdgeStyle;
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

/** Reject NaN/Inf/non-positive node size so layout cannot emit silent empty paths. */
export function assertOrgLayoutMetrics(opts: {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  margin: number;
}): void {
  const positive = (name: string, value: number): void => {
    if (!Number.isFinite(value) || value <= 0) {
      throw new OrgHierarchyError(`${name} must be a finite number greater than 0`);
    }
  };
  const nonNegative = (name: string, value: number): void => {
    if (!Number.isFinite(value) || value < 0) {
      throw new OrgHierarchyError(`${name} must be a finite number ≥ 0`);
    }
  };
  positive('nodeWidth', opts.nodeWidth);
  positive('nodeHeight', opts.nodeHeight);
  nonNegative('horizontalGap', opts.horizontalGap);
  nonNegative('verticalGap', opts.verticalGap);
  nonNegative('margin', opts.margin);
}

export const DEFAULT_ORG_LAYOUT_OPTIONS: Required<
  Omit<OrgLayoutOptions, 'orgEdgeStyle'>
> & {
  orgEdgeStyle: OrgEdgeStyle;
} = {
  nodeWidth: 200,
  nodeHeight: 64,
  horizontalGap: 28,
  verticalGap: 36,
  margin: 32,
  matrixShape: 'auto',
  matrixRows: 0,
  matrixColumns: 0,
  orgEdgeStyle: 'spine-bus',
};
