export type { ContourComputer, RenderOptions } from './DiagramRenderer.js';
export { DiagramRenderer, LayerManager } from './DiagramRenderer.js';
export { PixiHost, resolvePixiResolution } from './PixiHost.js';
export { Viewport } from './Viewport.js';
export type { ViewportTransform, ViewportOptions, CameraMotionOptions } from './Viewport.js';
export { resolveLodLevel, simplifyPolyline, defaultLodThresholds } from './lod.js';
export type { LodLevel, LodThresholds } from './lod.js';
export { DepartmentBlobView } from './DepartmentBlob.js';
export { PersonNodeView } from './PersonNode.js';
export { personInitials, avatarColorFromName } from './personInitials.js';
export { OrganizationNodeView } from './OrganizationNode.js';
export { OrgEdgesView } from './OrgEdgesView.js';
export { StaffEdgesView } from './StaffEdgesView.js';
export {
  buildStaffEdgeSegments,
  staffEdgeEndpoints,
} from './staffEdgeGeometry.js';
export type {
  StaffEdgeBox,
  StaffEdgeLink,
  StaffEdgeSegment,
} from './staffEdgeGeometry.js';
export { parseSvgPath } from './svgPath.js';
export {
  resampleClosedRing,
  lerpClosedRings,
  runPointMorph,
  easeOutCubic,
} from './contourMorph.js';
export type { MorphPoint } from './contourMorph.js';
export {
  resolveTheme,
  getOrgSymbolUrl,
  resolveNodeTheme,
  canvasBackgroundForTheme,
} from './theme.js';
export {
  loadNodeTexture,
  configureNodeTextureLoader,
  clearNodeTextureCache,
  type NodeTextureLoader,
} from './nodeMedia.js';
export {
  worldBoxToScreen,
  resolvePromoteIds,
  screenRectInView,
  type WorldBox,
  type ScreenRect,
  type PromoteMode,
} from './promoteMath.js';
export type { PromoteCandidate } from './promoteTypes.js';
export {
  defaultNodeTheme,
  darkNodeTheme,
  defaultRenderConfig,
  PERSON_CARD_WIDTH,
  PERSON_CARD_HEIGHT,
  GRID_CELL_WIDTH,
  GRID_CELL_HEIGHT,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
  variantBAdjacentEdgeClearance,
  mergeTheme,
  type NodeTheme,
  type ThemeMode,
  type RenderConfig,
  type DepartmentBlobStyle,
  type PersonNodeStyle,
  type OrganizationNodeStyle,
} from './types.js';
