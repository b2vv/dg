export type {
  StaffCoordMode,
  StaffLayoutOptions,
  StaffNodeBox,
  StaffOrgBlockResult,
  StaffOrgCard,
  StaffCanvasResult,
  StaffTierBand,
} from './types.js';
export { DEFAULT_STAFF_LAYOUT_OPTIONS, StaffLayoutError } from './types.js';
export { resolveStaffHead, adminParentMap } from './resolveHead.js';
export {
  positionHasCoords,
  resolvePositionAABB,
  positionSize,
  resolveGeom,
} from './coords.js';
export { layoutStaffOrgBlock } from './orgBlockLayout.js';
export { layoutStaffCanvas } from './canvasLayout.js';
export {
  adminChildrenMap,
  adminDescendantIds,
  assignExpandToDepth,
  expandIdsForDepth,
  isPositionExpanded,
  positionHasAdminChildren,
  visiblePositions,
} from './positionExpand.js';
