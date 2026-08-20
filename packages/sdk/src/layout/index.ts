export type {
  OrgDisplayMode,
  OrgLayoutOptions,
  OrgLayoutNode,
  OrgLayoutEdge,
  OrgLayoutResult,
} from './types.js';
export { DEFAULT_ORG_LAYOUT_OPTIONS } from './types.js';

export {
  detectOrgMode,
  isOrgCollapsed,
  collapseAllOrgs,
  expandOrg,
  collapseOrg,
  findExpandedRootId,
} from './orgMode.js';

export { computeMatrixLayout, swapMatrixOrder, placeOrgAtMatrixCell } from './matrixLayout.js';
export { assignMatrixCells, resolveMatrixDimensions } from './matrixGrid.js';
export type { MatrixDimensions, MatrixCellAssignment } from './matrixGrid.js';
export type { MatrixShape } from './types.js';

export {
  computeOrgLayout,
  computeOrgRowTreeLayout,
  computeOrgRowTreeLayoutInWorker,
  handleComputeOrgRowTreeLayout,
} from './rowTreeLayout.js';

export {
  validateOrgHierarchy,
  extractSubtree,
  OrgHierarchyError,
  orgsToSingleRootTree,
} from './orgTree.js';
