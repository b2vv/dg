export type {
  OrgDisplayMode,
  OrgLayoutOptions,
  OrgLayoutNode,
  OrgLayoutEdge,
  OrgLayoutResult,
} from './types.js';
export { DEFAULT_ORG_LAYOUT_OPTIONS, assertOrgLayoutMetrics } from './types.js';

export {
  detectOrgMode,
  isOrgCollapsed,
  collapseAllOrgs,
  expandOrg,
  collapseOrg,
  findExpandedRootId,
  findExpandedRootIds,
} from './orgMode.js';

export { computeMatrixLayout, swapMatrixOrder, placeOrgAtMatrixCell } from './matrixLayout.js';
export { assignMatrixCells, resolveMatrixDimensions } from './matrixGrid.js';
export type { MatrixDimensions, MatrixCellAssignment } from './matrixGrid.js';
export type { MatrixShape, OrgEdgeStyle } from './types.js';
export {
  buildSpineBusPaths,
  buildSpineBusEdgesForForest,
  spineBusToOrgEdges,
} from './spineBusEdges.js';
export type { WorldBox, SpineBusOptions, SpineBusPolyline } from './spineBusEdges.js';
export { siblingOrgGroupBounds } from './siblingOrgGroups.js';

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

export {
  layoutStaffCanvas,
  layoutStaffOrgBlock,
  resolveStaffHead,
  positionHasCoords,
  StaffLayoutError,
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  adminChildrenMap,
  adminDescendantIds,
  assignExpandToDepth,
  expandIdsForDepth,
  isPositionExpanded,
  positionHasAdminChildren,
  visiblePositions,
} from './staff/index.js';
export type {
  StaffCoordMode,
  StaffLayoutOptions,
  StaffCanvasResult,
  StaffOrgBlockResult,
} from './staff/index.js';
