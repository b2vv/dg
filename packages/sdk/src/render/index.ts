export type { ContourComputer, RenderOptions } from './DiagramRenderer.js';
export { DiagramRenderer } from './DiagramRenderer.js';
export { LayerManager } from './LayerManager.js';
export { PixiHost, resolvePixiResolution } from './PixiHost.js';
export { Viewport } from './Viewport.js';
export type { ViewportTransform, ViewportOptions, CameraMotionOptions } from './Viewport.js';
export { resolveLodLevel, simplifyPolyline, defaultLodThresholds } from './lod.js';
export type { LodLevel, LodThresholds } from './lod.js';
export { DepartmentBlobView } from './contour/DepartmentBlob.js';
export { PersonNodeView } from './PersonNode.js';
export { personInitials, avatarColorFromName } from './personInitials.js';
export { OrganizationNodeView } from './OrganizationNode.js';
export { OrgEdgesView } from './OrgEdgesView.js';
export { StaffEdgesView } from './StaffEdgesView.js';
export { arrowHeadTriangle, shortenPolylineForArrow } from './staffEdgeArrows.js';
export {
  buildStaffEdgeSegments,
  staffEdgeEndpoints,
  classifyStaffEdgeRoute,
  polylineHitsBoxInterior,
} from '../layout/staffEdgeGeometry.js';
export type {
  StaffEdgeBox,
  StaffEdgeLink,
  StaffEdgeSegment,
  StaffEdgeRouteVia,
  StaffEdgeRoute,
} from '../layout/staffEdgeGeometry.js';
export {
  visualPersonEdgeBox,
  visualOrgEdgeBox,
  mapStaffEdgeBoxesForLod,
  mapPositionNodesToStaffEdgeBoxes,
  staffEdgeBoxForPosition,
} from './visualEdgeBox.js';
export type { LayoutPositionNode } from './visualEdgeBox.js';
export {
  personVisualLocalRect,
  personVisualWorldRect,
  personMidBandHeight,
  personFarDotRadius,
} from './personVisualGeometry.js';
export type { PersonVisualRect } from './personVisualGeometry.js';
export {
  nudgeContourClearOfBoxes,
  contourCardClearanceMargin,
  CONTOUR_OWN_PADDING_PX,
} from './contour/contourClearance.js';
export type { ContourClearBox } from './contour/contourClearance.js';
export {
  filletClosedRing,
  maxChordTurn,
  CONTOUR_CORNER_RADIUS,
} from './contour/contourFillet.js';
export { polishContourRings, type PolishContourInput } from './contour/contourPolish.js';
export { notchedRings, type ContourRect } from './contour/contourNotch.js';
export {
  contourSceneInputs,
  matrixNodeBoxes,
  type ContourNodeBox,
} from './contour/contourInputs.js';
export {
  corridorPx,
  corridorCellsForFlood,
  DEFAULT_CORRIDOR_CELLS,
} from './contour/contourCorridor.js';
export {
  buttonGroupRingFromBoxes,
  contourButtonGroupMargin,
  memberBoxesForCluster,
} from './contour/contourButtonGroup.js';
export { clusterPositionIds, clusterPositionsByDepartment } from './contour/contourCluster.js';
export { paintMagneticGroups } from './contour/paintMagneticGroups.js';
export {
  shouldPaintDeptContour,
  filterContoursForPaint,
} from './contour/contourPaintFilter.js';
export { parseSvgPath } from './svgPath.js';
export {
  resampleClosedRing,
  lerpClosedRings,
  runPointMorph,
  easeOutCubic,
} from './contour/contourMorph.js';
export type { MorphPoint } from './contour/contourMorph.js';
export {
  resolveTheme,
  getOrgSymbolUrl,
  getInactiveOrgSymbolUrl,
  resolveNodeTheme,
  canvasBackgroundForTheme,
} from './theme.js';
export {
  loadNodeTexture,
  configureNodeTextureLoader,
  clearNodeTextureCache,
  evictNodeTextureCache,
  acquireNodeTextureUrl,
  releaseNodeTextureUrl,
  nodeTextureUrlOwnerCount,
  isAllowedNodeMediaUrl,
  type NodeTextureLoader,
} from '../media/nodeMedia.js';
export {
  worldBoxToScreen,
  resolvePromoteIds,
  nearVisibleGateOpen,
  screenRectInView,
  nodeEntityKey,
  parseNodeEntityKey,
  promoteIdMatches,
  promoteVisualForSelection,
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
  VARIANT_B_MAGNET_RADIUS,
  variantBAdjacentEdgeClearance,
  mergeTheme,
  type NodeTheme,
  type ThemeMode,
  type RenderConfig,
  type DepartmentPaintStyle,
  type DepartmentBlobStyle,
  type DepartmentCardStyle,
  type StaffZoneStyle,
  type PersonNodeStyle,
  type OrganizationNodeStyle,
} from './types.js';
export { StaffZonesView } from './StaffZonesView.js';
export { DepartmentCardView } from './DepartmentCardView.js';
export { paintDashedFrame } from './dashedStroke.js';
export {
  enrichStaffTierBands,
  worldBoundsForTier,
  unionBoxes,
  type WorldRect,
} from './staffZoneBounds.js';
export { fitContain } from './fitContain.js';
export {
  resolveOrgSymbolLayout,
  isFullBleedIntrinsic,
  orgCardAabb,
  ORG_SYMBOL_PAD,
  GOJS_SYMBOL_W,
  GOJS_SYMBOL_H,
  GOJS_NO_CAPTION_W,
  GOJS_NO_CAPTION_H,
} from './orgSymbolBox.js';
/** @deprecated Use GOJS_SYMBOL_W */
export { GOJS_SYMBOL_W as ORG_SYMBOL_W } from './orgSymbolBox.js';
/** @deprecated Use GOJS_SYMBOL_H */
export { GOJS_SYMBOL_H as ORG_SYMBOL_H } from './orgSymbolBox.js';
export type {
  OrgSymbolBox,
  OrgSymbolBoxMode,
  OrgSymbolLayout,
} from './orgSymbolBox.js';
export { formatOrgPeriodLabel, formatIsoDateUk } from './formatPeriodLabel.js';
export type { PeriodFields } from './formatPeriodLabel.js';
export { formatOrgCountsBadge, VACANT_POSITION_LABEL } from './orgCardChrome.js';
