/**
 * Public surface of the SDK. Implementation lives in the feature folders —
 * this file only re-exports, so «what is public» stays readable in one screen.
 */
export { OrgHierarchyDiagram, type OrgHierarchyConfig } from './OrgHierarchyDiagram.js';

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

export {
  computeDeptContour,
  computeAllContours,
  initContourWasm,
  resetContourWasmForTests,
  setContourWasmLoaderForTests,
  WasmLoadError,
  VARIANT_B_POSITIONS,
} from './contour/bridge.js';
export {
  computeDeptContourInWorker,
  computeAllContoursInWorker,
  configureContourWorker,
} from './contour/worker-bridge.js';
export {
  createIncrementalContourComputer,
} from './contour/incremental.js';
export type {
  ContourPositionInput,
  ContourMagnetConfig,
  ContourPoint,
  DeptContourResult,
  ContourWasmLoader,
} from './contour/bridge.js';
export type {
  ContourComputerFn,
  DeptContourComputerFn,
  IncrementalContourComputer,
} from './contour/incremental.js';
export type { ContourWorkerOptions } from './contour/worker-bridge.js';

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
  ThemeMode,
  RenderConfig,
  ContourComputer,
  ContourClearBox,
  ViewportTransform,
  CameraMotionOptions,
  LodLevel,
  LodThresholds,
  NodeTextureLoader,
  PromoteCandidate,
  PromoteMode,
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
} from './render/index.js';
export type { LayoutPatch, OrgHierarchyCallbacks } from './callbacks.js';

export type {
  NodeRef,
  SearchResult,
  MenuItem,
  NodeKind,
  ContextMenuRequest,
  ContextMenuNodeData,
  ContextMenuPointer,
} from './interaction/index.js';
export {
  buildSearchIndex,
  buildSearchIndexAsync,
  searchIndex as runSearchIndex,
  mergeSearchIndexes,
  flattenPositionSearchRows,
  revealOrgPath,
  movePositionToCell,
  shiftPositionBlock,
  InteractionError,
  bulkContextMenuItems,
  defaultContextMenuItems,
  resolveContextMenuNodeData,
  nodeDomTestId,
  normalizeTestIdKey,
  orgTestId,
  personTestId,
  positionTestId,
  resolveTestIdInData,
  selectNode,
  selectMany,
  sameNodeRef,
  replaceSelection,
  toggleInSelection,
  isSelectionToggleModifier,
  type SelectionPointerMods,
  type TestAnchorCandidate,
} from './interaction/index.js';
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
