export type { MarqueeRect } from './render/marquee.js';
export type { DiagramNode } from './DiagramNode.js';
/**
 * Public surface of the SDK. Implementation lives in the feature folders —
 * this file only re-exports, so «what is public» stays readable in one screen.
 */
export { OrgHierarchyDiagram, type OrgHierarchyConfig, type RevealPathOptions } from './OrgHierarchyDiagram.js';
// Staff transition layer (D3): host types its `animate` config and reads `getTransitionFrame()`.
export type { AnimateOption, AnimatePreset, TransitionFrame, FrameBox } from './render/transition/types.js';

export type {
  DiagramData,
  PositionStatus,
  GridCell,
  Point2D,
  DiagramDataStats,
  ThemedMedia,
} from './data/types.js';
export type { DiagramOrganization, DiagramPerson, DiagramPosition, DiagramGroup } from './data/types.js';
export { emptyDiagramData, computeStats } from './data/types.js';

export type { DataMapper, DiagramMappers, MapperContext } from './mappers/types.js';
export {
  flatRowsToDiagram,
  mergeDiagramData,
  normalizeDiagram,
  type FlatDiagramRow,
} from './mappers/flatToDiagram.js';

export {
  mapInWorker,
  WorkerPool,
  createTransformWorker,
  recommendWorkerPoolSize,
  recommendChunkSize,
  adaptChunkSize,
  createPooledArrayMapper,
  createPooledItemMapper,
  mapArrayInPool,
  mapArrayItems,
  mapFlatRowsInPool,
} from './worker/index.js';
export type { MapperRegistry, WorkerBridgeOptions } from './worker/bridge.js';
export type {
  ChunkSizeOptions,
  PooledArrayMapperConfig,
  PooledItemMapperConfig,
  PooledMapOptions,
  PooledMapResult,
  ItemMapperFn,
} from './worker/index.js';

export { initContourWasm, WasmLoadError } from './contour/bridge.js';
export { VARIANT_B_POSITIONS } from './render/contour/variantBPositions.js';
export type {
  ContourPositionInput,
  ContourMagnetConfig,
  ContourPoint,
} from './render/contour/types.js';

export {
  DepartmentBlobView,
  PersonNodeView,
  OrganizationNodeView,
  DiagramRenderer,
  PixiHost,
  Viewport,
  resolveLodLevel,
  simplifyPolyline,
  defaultLodThresholds,
  motionBlurPx,
  defaultMotionBlurOptions,
  parseSvgPath,
  resampleClosedRing,
  lerpClosedRings,
  runPointMorph,
  defaultNodeTheme,
  darkNodeTheme,
  defaultRenderConfig,
  classifyStaffEdgeRoute,
  polylineHitsBoxInterior,
  mapPositionNodesToStaffEdgeBoxes,
  mapStaffEdgeBoxesForLod,
  PERSON_CARD_WIDTH,
  PERSON_CARD_HEIGHT,
  GRID_CELL_WIDTH,
  GRID_CELL_HEIGHT,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
  VARIANT_B_MAGNET_RADIUS,
  variantBAdjacentEdgeClearance,
  mergeTheme,
  resolveNodeTheme,
  resolveTheme,
  canvasBackgroundForTheme,
  loadNodeTexture,
  configureNodeTextureLoader,
  clearNodeTextureCache,
  evictNodeTextureCache,
  acquireNodeTextureUrl,
  releaseNodeTextureUrl,
  nodeTextureUrlOwnerCount,
  isAllowedNodeMediaUrl,
  worldBoxToScreen,
  resolvePromoteIds,
  nearVisibleGateOpen,
  pickNearestToCenter,
  resolvePromoteCap,
  viewportCatchUpTransform,
  screenRectInView,
  nodeEntityKey,
  parseNodeEntityKey,
  promoteIdMatches,
  promoteVisualForSelection,
  fitContain,
  resolveOrgSymbolLayout,
  isFullBleedIntrinsic,
  orgCardAabb,
  ORG_SYMBOL_PAD,
  ORG_SYMBOL_W,
  ORG_SYMBOL_H,
  formatOrgPeriodLabel,
  formatIsoDateUk,
  formatOrgCountsBadge,
  VACANT_POSITION_LABEL,
  getOrgSymbolUrl,
  getInactiveOrgSymbolUrl,
  clusterPositionsByDepartment,
  computeStaffLiveGeometry,
  worldPointToScreen,
  roundedPathD,
  buildStaffChromeGeometry,
  computeStaffFit,
  DEFAULT_STAFF_CHROME_PAD,
} from './render/index.js';
export {
  MediaService,
  mediaCacheKey,
  mediaCacheKeyMatchesUrl,
  resolveThemedMediaUrl,
  resolveThemedMediaFromOrganization,
  resolveThemedMediaFromPerson,
  resolveThemedMediaFromPosition,
  resolveThemedMediaFromGroup,
  DEFAULT_MEDIA_PLACEHOLDERS,
} from './media/index.js';
export type {
  DiagramMediaFacade,
  MediaPlaceholderKind,
  MediaPlaceholderRegistry,
  MediaPlaceholderSet,
  MediaServiceOptions,
} from './media/index.js';
export type {
  NodeTheme,
  NodeThemeOverrides,
  ThemeMode,
  RenderConfig,
  ContourClearBox,
  ViewportTransform,
  CameraMotionOptions,
  LodLevel,
  LodThresholds,
  MotionBlurOptions,
  NodeTextureLoader,
  PromoteCandidate,
  PromoteMode,
  PromoteSyncReason,
  ScreenRect,
  WorldBox,
  DepartmentPaintStyle,
  DepartmentCardStyle,
  StaffZoneStyle,
  OrgSymbolBox,
  OrgSymbolBoxMode,
  OrgSymbolLayout,
  PersonNodeStyle,
  StaffEdgeBox,
  StaffEdgeLink,
  StaffEdgeRouteVia,
  StaffLiveGeometry,
  StaffLiveGeometryInput,
  StaffFrameBox,
  ScreenPoint,
  WorldPoint,
  StaffChromeGeometry,
  StaffChromePad,
  StaffFitOptions,
  ChromeDeptFrame,
  ChromeLine,
  NodeBox,
} from './render/index.js';
export { SEARCH_PAGE_SIZE } from './callbacks.js';
export type {
  LayoutPatch,
  OrgHierarchyCallbacks,
  OrgExpandChange,
  NodeClickMeta,
  ViewportChangeMeta,
  ViewportChangeReason,
  HostSearchHit,
  HostSearchPage,
  RenderFailure,
  InitialExpandResult,
} from './callbacks.js';

export type { SearchAllResult } from './OrgHierarchyDiagram.js';
export { applyInitialExpand, initialExpandedOrgIds } from './data/initialExpand.js';
export type {
  NodeRef,
  SearchResult,
  MenuItem,
  NodeKind,
  TestAnchorCandidate,
} from './core/index.js';
export type {
  TransferChildrenSummary,
  DeleteSubtreeSummary,
  TransferOrgsSummary,
  DeleteOrgSubtreeSummary,
  ContextMenuRequest,
  ContextMenuNodeData,
  ContextMenuPointer,
} from './interaction/index.js';
export {
  transferChildren,
  deleteSubtree,
  transferChildOrgs,
  deleteOrgSubtree,
  buildSearchIndex,
  buildSearchIndexAsync,
  searchIndex as runSearchIndex,
  mergeSearchIndexes,
  flattenPositionSearchRows,
  revealOrgPath,
  shiftPositionBlock,
  bulkContextMenuItems,
  defaultContextMenuItems,
  resolveContextMenuNodeData,
  selectNode,
  selectMany,
  sameNodeRef,
  replaceSelection,
  toggleInSelection,
  isSelectionToggleModifier,
  type SelectionPointerMods,
} from './interaction/index.js';
export {
  movePositionToCell,
  InteractionError,
  nodeDomTestId,
  normalizeTestIdKey,
  orgTestId,
  personTestId,
  positionTestId,
  resolveTestIdInData,
} from './core/index.js';
export {
  buildSearchIndexInWorker,
  buildSearchIndexInPool,
  buildSearchIndexForScale,
  configureSearchWorker,
  searchHandlerKeys,
} from './interaction/searchWorker.js';

export {
  exportDiagram as runExportDiagram,
  printDiagram,
  buildDiagramSvg,
  filterDiagramSubtree,
  ExportError,
} from './export/index.js';
export type { ExportOptions, ExportFormat, ExportScope } from './export/index.js';

export {
  detectOrgMode,
  computeOrgLayout,
  computeOrgRowTreeLayout,
  computeMatrixLayout,
  collapseAllOrgs,
  expandOrg,
  collapseOrg,
  swapMatrixOrder,
  placeOrgAtMatrixCell,
  findExpandedRootId,
  layoutStaffCanvas,
  layoutStaffOrgBlock,
  resolveStaffHead,
  StaffLayoutError,
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  assignExpandToDepth,
  visiblePositions,
  expandIdsForDepth,
  buildSpineBusPaths,
  buildSpineBusEdgesForForest,
  assertOrgLayoutMetrics,
  OrgHierarchyError,
} from './layout/index.js';
export type {
  OrgDisplayMode,
  OrgLayoutResult,
  MatrixShape,
  OrgLayoutNode,
  OrgLayoutEdge,
  OrgLayoutOptions,
  StaffCoordMode,
  StaffLayoutOptions,
  StaffCanvasResult,
  StaffOrgBlockResult,
  OrgEdgeStyle,
} from './layout/index.js';

export type { InteractionState } from './interaction/interactionState.js';
// D1: related/dimming selectors (hosts + demo compute hover-related highlight from interaction state).
export { relatedStaffIds, staffDimmedIds } from './render/staffRelated.js';
