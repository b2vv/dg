import { emptyDiagramData, computeStats } from './data/types.js';
import type { DiagramData } from './data/types.js';
import type { DiagramMappers } from './mappers/types.js';
import { configureContourWorker } from './contour/worker-bridge.js';
import { computeAllContoursInWorker, computeDeptContourInWorker } from './contour/worker-bridge.js';
import { computeAllContours as computeAllContoursMain, computeDeptContour as computeDeptContourMain } from './contour/bridge.js';
import { createIncrementalContourComputer, type IncrementalContourComputer } from './contour/incremental.js';
import { PixiHost } from './render/PixiHost.js';
import {
  defaultRenderConfig,
  mergeTheme,
  resolveTheme,
  resolveNodeTheme,
  canvasBackgroundForTheme,
  type NodeTheme,
  type RenderConfig,
  type CameraMotionOptions,
} from './render/index.js';
import { resolveLodLevel, defaultLodThresholds, type LodLevel, type LodThresholds } from './render/lod.js';
import type { PromoteCandidate } from './render/promoteTypes.js';
import {
  collapseAllOrgs,
  collapseOrg,
  detectOrgMode,
  expandOrg,
  swapMatrixOrder,
  placeOrgAtMatrixCell,
  assignMatrixCells,
  assignExpandToDepth,
  adminDescendantIds,
  positionHasAdminChildren,
  type OrgDisplayMode,
  type OrgLayoutOptions,
  type StaffLayoutOptions,
} from './layout/index.js';
import type { OrgHierarchyCallbacks, LayoutPatch } from './callbacks.js';
import { createTransformWorker, WorkerPool } from './worker/index.js';
import {
  buildSearchIndex,
  searchIndex as querySearchIndex,
  buildSearchIndexAsync,
  revealOrgPath,
  resolveOrganizationIdForNode,
  movePositionToCell,
  shiftPositionBlock,
  selectMany as dedupeSelections,
  replaceSelection,
  toggleInSelection,
  sameSelectionSet,
  isSelectionToggleModifier,
  defaultContextMenuItems,
  type SearchIndex,
  type NodeRef,
  type SearchResult,
  type MenuItem,
  InteractionError,
  resolveContextMenuNodeData,
  type ContextMenuRequest,
  type ContextMenuNodeData,
  type ContextMenuPointer,
  resolveTestIdInData,
  orgTestId,
  personTestId,
  positionTestId,
  nodeDomTestId,
  type TestAnchorCandidate,
} from './interaction/index.js';
import {
  buildSearchIndexForScale,
  configureSearchWorker,
} from './interaction/searchWorker.js';
import {
  exportDiagram as runExport,
  printDiagram,
  ExportError,
  type ExportOptions,
} from './export/index.js';

export type {
  DiagramData,
  NodeVisualKind,
  PositionStatus,
  GridCell,
  Point2D,
  DiagramDataStats,
} from './data/types.js';
export type { DiagramOrganization, DiagramPerson, DiagramPosition } from './data/types.js';
export { emptyDiagramData, computeStats } from './data/types.js';

export type { DataMapper, DiagramMappers, MapperContext, MapResult } from './mappers/types.js';
export { runMapper, composeMappers, identityMapper } from './mappers/types.js';
export {
  flatRowsToDiagram,
  mergeDiagramData,
  normalizeDiagram,
  type FlatDiagramRow,
} from './mappers/flatToDiagram.js';

export {
  createWorkerPipeline,
  createContourPipeline,
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
  isAllowedNodeMediaUrl,
  worldBoxToScreen,
  resolvePromoteIds,
  screenRectInView,
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
} from './render/index.js';
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
export interface OrgHierarchyConfig<TRaw = DiagramData> {
  data: TRaw | DiagramData;
  mappers?: DiagramMappers<TRaw>;
  theme?: 'light' | 'dark' | 'auto';
  styles?: Partial<NodeTheme>;
  render?: Partial<RenderConfig>;
  /** Contour + WASM compute у Web Worker (default: true у browser) */
  useWorker?: boolean;
  /** Worker pool для паралельних map chunks (flatRowsToDiagram тощо) */
  workerPoolSize?: number;
  /** Custom worker factory (transform.worker.ts) */
  workerFactory?: () => Worker;
  callbacks?: OrgHierarchyCallbacks;
  /** Staff 3-tier focus organization id */
  staffCurrentOrgId?: string;
  /** Staff layout (node/cell pitch — keep refCell* aligned with render.cell* for contours). */
  staffLayout?: StaffLayoutOptions;
  /** Org matrix / row-tree layout. */
  orgLayout?: OrgLayoutOptions;
  /** Show +/− tree expand/collapse chrome on org cards (default true). Set false for 100k scale tab (T48). */
  orgTreeChrome?: boolean;
  /** Pre-expanded staff tier-3 org cards (e.g. mockup unit drill-in). */
  staffExpandedOrgIds?: readonly string[];
  /** Override LOD zoom bands (default farMax 0.45, midMax 1.2). */
  lodThresholds?: LodThresholds;
  /** Enable DOM test anchors (`data-testid="node-*"`) — use with createTestAnchorOverlay (T55). */
  testAnchors?: boolean;
}

/** Embed SDK — Pixi render + data/mappers + worker contour */
export class OrgHierarchyDiagram {
  private data: DiagramData = emptyDiagramData();
  private host: PixiHost | null = null;
  private themeMode: 'light' | 'dark' | 'auto' = 'auto';
  private stylesPartial: Partial<NodeTheme> | undefined;
  private nodeTheme = mergeTheme();
  private renderConfig: RenderConfig = { ...defaultRenderConfig };
  private useWorker = true;
  private workerFactory: () => Worker = createTransformWorker;
  private workerPool: WorkerPool | null = null;
  private callbacks: OrgHierarchyCallbacks = {};
  private staffCurrentOrgId: string | undefined;
  private staffLayout: StaffLayoutOptions = {};
  private orgLayout: OrgLayoutOptions = {};
  private orgTreeChrome = true;
  private staffExpandedOrgIds = new Set<string>();
  private staffExpandedPositionIds = new Set<string>();
  private searchIdx: SearchIndex | null = null;
  /** Multi-select set (T67). Primary / first element is also exposed via getSelection(). */
  private selections: NodeRef[] = [];
  private lodLevel: LodLevel = 'near';
  private lodThresholds: LodThresholds = defaultLodThresholds;
  private lodRenderQueued = false;
  private contourComputer: IncrementalContourComputer | null = null;
  private promoteSyncListeners = new Set<() => void>();
  static async create<TRaw>(
    container: HTMLElement,
    config: OrgHierarchyConfig<TRaw>,
  ): Promise<OrgHierarchyDiagram> {
    if (!container) {
      throw new Error('OrgHierarchyDiagram: container is required');
    }
    const instance = new OrgHierarchyDiagram();
    instance.themeMode = config.theme ?? 'auto';
    instance.stylesPartial = config.styles;
    instance.nodeTheme = resolveNodeTheme(
      resolveTheme(instance.themeMode),
      config.styles,
    );
    instance.renderConfig = { ...defaultRenderConfig, ...config.render };
    instance.useWorker = config.useWorker ?? typeof Worker !== 'undefined';
    instance.callbacks = config.callbacks ?? {};
    instance.staffCurrentOrgId = config.staffCurrentOrgId;
    instance.staffLayout = config.staffLayout ?? {};
    instance.orgLayout = config.orgLayout ?? {};
    instance.orgTreeChrome = config.orgTreeChrome ?? true;
    if (config.staffExpandedOrgIds?.length) {
      instance.staffExpandedOrgIds = new Set(config.staffExpandedOrgIds);
    }
    if (config.lodThresholds) {
      instance.lodThresholds = config.lodThresholds;
    }

    const workerFactory = config.workerFactory ?? createTransformWorker;
    instance.workerFactory = workerFactory;
    configureContourWorker({
      workerFactory,
      fallbackToMainThread: true,
    });
    configureSearchWorker({
      workerFactory,
      fallbackToMainThread: true,
    });

    const poolSize = config.workerPoolSize ?? 0;
    if (poolSize > 0) {
      instance.workerPool = new WorkerPool(workerFactory, poolSize);
    }

    await instance.applyConfig(config);
    instance.rebuildSearchIndex();
    instance.host = await PixiHost.create(container);
    instance.host.setOnViewportChange((t) => {
      instance.onViewportTransform(t.scale);
      instance.notifyPromoteSync();
    });
    instance.lodLevel = resolveLodLevel(instance.host.getZoom(), instance.lodThresholds);
    await instance.render();
    return instance;
  }

  private notifyPromoteSync(): void {
    for (const listener of this.promoteSyncListeners) listener();
  }

  /** Subscribe to viewport / selection / render changes for HTML promote overlays. */
  subscribePromoteSync(listener: () => void): () => void {
    this.promoteSyncListeners.add(listener);
    return () => {
      this.promoteSyncListeners.delete(listener);
    };
  }

  private onViewportTransform(scale: number): void {
    const next = resolveLodLevel(scale, this.lodThresholds);
    if (next === this.lodLevel) return;
    this.lodLevel = next;
    if (this.lodRenderQueued) return;
    this.lodRenderQueued = true;
    queueMicrotask(() => {
      this.lodRenderQueued = false;
      void this.render();
    });
  }

  /** Prefer chunked async rebuild once org+position count exceeds this. */
  private static readonly SEARCH_ASYNC_THRESHOLD = 10_000;

  private rebuildSearchIndex(): void {
    this.searchIdx = buildSearchIndex(this.data);
  }

  private async rebuildSearchIndexAsync(): Promise<void> {
    this.searchIdx = await buildSearchIndexAsync(this.data);
  }

  private async rebuildSearchIndexForScale(): Promise<void> {
    const n = this.data.organizations.length + this.data.positions.length;
    if (n < OrgHierarchyDiagram.SEARCH_ASYNC_THRESHOLD) {
      this.rebuildSearchIndex();
      return;
    }
    this.searchIdx = await buildSearchIndexForScale(this.data, {
      useWorker: this.useWorker,
      pool: this.workerPool,
      workerFactory: this.workerFactory,
    });
  }

  private getContourComputer(): IncrementalContourComputer {
    if (!this.contourComputer) {
      const computeAll = this.useWorker ? computeAllContoursInWorker : computeAllContoursMain;
      const computeDept = this.useWorker ? computeDeptContourInWorker : computeDeptContourMain;
      this.contourComputer = createIncrementalContourComputer(computeAll, computeDept);
    }
    return this.contourComputer;
  }

  private applySelection(next: NodeRef | null): void {
    const result = replaceSelection(this.selections, next);
    if (!result.changed) return;
    this.selections = result.selections;
    this.callbacks.onSelectionChange?.(this.selections);
    this.notifyPromoteSync();
  }

  private applyToggleSelection(node: NodeRef): void {
    const result = toggleInSelection(this.selections, node);
    if (!result.changed) return;
    this.selections = result.selections;
    this.callbacks.onSelectionChange?.(this.selections);
    this.notifyPromoteSync();
  }

  private applySelections(next: readonly NodeRef[]): void {
    const selections = dedupeSelections(next);
    if (sameSelectionSet(this.selections, selections)) return;
    this.selections = selections;
    this.callbacks.onSelectionChange?.(this.selections);
    this.notifyPromoteSync();
  }

  private handleNodeSelect(
    node: NodeRef,
    mods?: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  ): void {
    if (mods && isSelectionToggleModifier(mods)) {
      this.applyToggleSelection(node);
    } else {
      this.applySelection(node);
    }
  }

  private personNodeRef(personId: string, positionId: string): NodeRef {
    const position = this.data.positions.find((p) => p.id === positionId);
    return {
      kind: 'person',
      id: personId,
      organizationId: position?.organizationId,
      departmentId: position?.departmentId,
      positionId,
      personId,
    };
  }

  private orgNodeRef(orgId: string): NodeRef {
    return { kind: 'organization', id: orgId, organizationId: orgId };
  }

  private positionNodeRef(positionId: string): NodeRef {
    const position = this.data.positions.find((p) => p.id === positionId);
    return {
      kind: 'position',
      id: positionId,
      organizationId: position?.organizationId,
      departmentId: position?.departmentId,
      positionId,
      personId: position?.personId,
    };
  }

  private emitContextMenu(
    node: NodeRef,
    pointer: { clientX: number; clientY: number; canvasX?: number; canvasY?: number },
  ): void {
    const defaults = defaultContextMenuItems(node);
    const request: ContextMenuRequest = {
      node: resolveContextMenuNodeData(this.data, node),
      items: defaults,
      pointer: {
        clientX: pointer.clientX,
        clientY: pointer.clientY,
        canvasX: pointer.canvasX,
        canvasY: pointer.canvasY,
      },
    };
    const result = this.callbacks.onContextMenu?.(request);
    if (result === false) return;
    if (Array.isArray(result)) {
      request.items = result;
    }
    this.lastContextMenu = request;
  }

  /** Last context-menu request (for hosts that render async React menus). */
  private lastContextMenu: ContextMenuRequest | null = null;

  getLastContextMenu(): ContextMenuRequest | null {
    return this.lastContextMenu;
  }

  /** Invoke a menu action (from React menu item click). */
  async runContextMenuAction(itemId: string, request?: ContextMenuRequest): Promise<void> {
    const req = request ?? this.lastContextMenu;
    if (!req) return;
    const item = req.items.find((i) => i.id === itemId);
    if (!item || item.disabled) return;
    this.callbacks.onContextMenuAction?.(item, req);

    const ref = req.node.ref;
    switch (item.id) {
      case 'expand':
        if (ref.organizationId) await this.expandOrg(ref.organizationId);
        break;
      case 'collapse':
        if (ref.organizationId) await this.collapseOrg(ref.organizationId);
        break;
      case 'focus':
      case 'focus-subtree':
        await this.focusNode(ref.positionId ?? ref.personId ?? ref.id);
        break;
      case 'copy-id':
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(ref.id);
        }
        break;
      default:
        break;
    }
    this.lastContextMenu = null;
  }

  private async applyConfig<TRaw>(config: OrgHierarchyConfig<TRaw>): Promise<void> {
    const { mappers, data } = config;

    if (mappers?.toDiagram && !isDiagramData(data)) {
      const mapped = await mappers.toDiagram(data as TRaw);
      this.data = mappers.normalize ? await mappers.normalize(mapped) : mapped;
    } else if (isDiagramData(data)) {
      this.data = mappers?.normalize ? await mappers.normalize(data) : data;
    } else {
      throw new Error('Provide DiagramData or data + mappers.toDiagram');
    }
    this.seedExpandedPositionsFromData();
  }

  /** Sync interactive expand set from mapper/`position.expanded` flags. */
  private seedExpandedPositionsFromData(): void {
    this.staffExpandedPositionIds.clear();
    for (const p of this.data.positions) {
      if (p.expanded === true) this.staffExpandedPositionIds.add(p.id);
    }
  }

  private setPositionExpandedFlag(positionId: string, expanded: boolean): void {
    this.data = {
      ...this.data,
      positions: this.data.positions.map((p) =>
        p.id === positionId && p.expanded !== expanded ? { ...p, expanded } : p,
      ),
    };
    if (expanded) this.staffExpandedPositionIds.add(positionId);
    else this.staffExpandedPositionIds.delete(positionId);
  }

  private async render(): Promise<void> {
    if (!this.host) return;
    const resolved = resolveTheme(this.themeMode);
    this.nodeTheme = resolveNodeTheme(resolved, this.stylesPartial);
    this.host.setBackground(canvasBackgroundForTheme(resolved));
    const computeContours = this.getContourComputer();
    await this.host.renderer.render(this.data, this.nodeTheme, resolved, this.renderConfig, {
      computeContours,
      lod: this.lodLevel,
      orgLayout: this.orgLayout,
      staff: this.staffCurrentOrgId
        ? {
            currentOrgId: this.staffCurrentOrgId,
            layout: {
              ...this.staffLayout,
              expandedPositionIds: [...this.staffExpandedPositionIds],
            },
            expandedOrgIds: [...this.staffExpandedOrgIds],
          }
        : undefined,
      selected: this.selections,
      onCanvasClick: () => {
        this.applySelection(null);
        void this.render();
      },
      onOrgClick: (orgId, mods) => {
        const node = this.orgNodeRef(orgId);
        this.handleNodeSelect(node, mods);
        this.callbacks.onNodeClick?.(node);
        void this.render();
      },
      onOrgDoubleClick: (orgId) => {
        this.callbacks.onNodeDoubleClick?.(this.orgNodeRef(orgId));
      },
      onStaffOrgExpandToggle: (orgId) => {
        void this.toggleStaffOrgExpand(orgId);
      },
      onStaffOrgDrill: (orgId) => {
        void this.focusStaffOrg(orgId);
      },
      onPositionExpandToggle: (positionId) => {
        void this.togglePositionExpand(positionId);
      },
      onPersonClick: (personId, positionId, mods) => {
        const node = this.personNodeRef(personId, positionId);
        this.handleNodeSelect(node, mods);
        this.callbacks.onNodeClick?.(node);
        void this.render();
      },
      onPersonDoubleClick: (personId, positionId) => {
        this.callbacks.onNodeDoubleClick?.(this.personNodeRef(personId, positionId));
      },
      onPersonContextMenu: (personId, positionId, pointer) => {
        const ref = personId
          ? this.personNodeRef(personId, positionId)
          : this.positionNodeRef(positionId);
        this.emitContextMenu(ref, pointer);
      },
      onOrgContextMenu: (orgId, pointer) => {
        this.emitContextMenu(this.orgNodeRef(orgId), pointer);
      },
      onOrgExpand: this.orgTreeChrome
        ? (orgId) => {
            void this.expandOrg(orgId);
          }
        : undefined,
      onOrgCollapse: this.orgTreeChrome
        ? (orgId) => {
            void this.collapseOrg(orgId);
          }
        : undefined,
      onPersonDragEnd: (positionId, col, row) => {
        void this.movePersonToCell(positionId, col, row);
      },
    });
    this.callbacks.onLayoutDiagnostics?.(this.getLayoutDiagnostics());
    this.notifyPromoteSync();
  }

  getOrgMode(): OrgDisplayMode {
    return detectOrgMode(this.data.organizations);
  }

  async expandOrg(orgId: string): Promise<void> {
    this.data = {
      ...this.data,
      organizations: expandOrg(this.data.organizations, orgId),
    };
    this.callbacks.onOrgModeChange?.(this.getOrgMode());
    await this.render();
    this.panToOrg(orgId, { animate: true });
  }

  async collapseOrg(orgId: string): Promise<void> {
    this.data = {
      ...this.data,
      organizations: collapseOrg(this.data.organizations, orgId),
    };
    this.callbacks.onOrgModeChange?.(this.getOrgMode());
    await this.render();
    this.panToOrg(orgId, { animate: true });
  }

  async collapseAllOrgs(): Promise<void> {
    this.data = {
      ...this.data,
      organizations: collapseAllOrgs(this.data.organizations),
    };
    this.callbacks.onOrgModeChange?.(this.getOrgMode());
    await this.render();
    this.host?.fitView(48, { animate: true });
  }

  /** Pan camera to an org card after matrix↔row-tree transitions (T53). */
  private panToOrg(orgId: string, motion?: import('./render/Viewport.js').CameraMotionOptions): void {
    const box = this.host?.renderer.getNodeBox(orgId);
    if (!box) return;
    this.host?.panTo(box.x + box.width / 2, box.y + box.height / 2, motion);
  }

  async reorderOrg(orgId: string, newIndex: number): Promise<void> {
    this.data = {
      ...this.data,
      organizations: swapMatrixOrder(this.data.organizations, orgId, newIndex),
    };
    const patch: LayoutPatch = { type: 'matrix-reorder', orgId, newIndex };
    this.callbacks.onLayoutChange?.(patch);
    await this.render();
  }

  /** Foreign/outside-matrix org at (row,col) ejects current occupant to overflow */
  async placeOrgAtMatrixCell(
    orgId: string,
    row: number,
    col: number,
    grid?: { rows: number; cols: number },
  ): Promise<void> {
    const n = this.data.organizations.length;
    const side = Math.max(1, Math.ceil(Math.sqrt(n)));
    const dims = grid ?? { rows: side, cols: side };
    const before = assignMatrixCells(this.data.organizations, { ...dims, bounded: true });
    let ejectedOrgId: string | undefined;
    for (const [id, cell] of before) {
      if (id !== orgId && cell.row === row && cell.col === col) {
        ejectedOrgId = id;
        break;
      }
    }
    this.data = {
      ...this.data,
      organizations: placeOrgAtMatrixCell(this.data.organizations, orgId, row, col, dims),
    };
    const patch: LayoutPatch = { type: 'matrix-cell', orgId, row, col, ejectedOrgId };
    this.callbacks.onLayoutChange?.(patch);
    await this.render();
  }

  getData(): DiagramData {
    return this.data;
  }

  /**
   * Replace diagram data (host fetch → map → setData).
   * Rebuilds search index and re-renders. Clears selection.
   */
  async setData<TRaw>(
    data: TRaw | DiagramData,
    mappers?: DiagramMappers<TRaw>,
  ): Promise<void> {
    const t0 =
      typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    await this.applyConfig({ data, mappers } as OrgHierarchyConfig<TRaw>);
    this.contourComputer?.invalidate();
    await this.rebuildSearchIndexForScale();
    this.applySelection(null);
    const ms =
      (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - t0;
    this.callbacks.onDataMapped?.({
      orgs: this.data.organizations.length,
      persons: this.data.persons.length,
      positions: this.data.positions.length,
      ms: Math.round(ms),
    });
    this.callbacks.onOrgModeChange?.(this.getOrgMode());
    await this.render();
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.host?.getCanvas() ?? null;
  }

  getWorkerPool(): WorkerPool | null {
    return this.workerPool;
  }

  async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    this.themeMode = theme;
    await this.render();
  }

  async appendData<TRaw>(chunk: TRaw, mappers?: DiagramMappers<TRaw>): Promise<void> {
    if (mappers?.append) {
      const patch = await mappers.append(chunk);
      this.data = mergePartial(this.data, patch);
    } else if (mappers?.toDiagram) {
      const mapped = await mappers.toDiagram(chunk);
      this.data = mergePartial(this.data, mapped);
    } else {
      throw new InteractionError('appendData requires mappers.append or mappers.toDiagram');
    }
    await this.rebuildSearchIndexForScale();
    await this.render();
  }

  /** Staff focus org (Tier-2). Pass `null` to clear and use auto-inference. */
  setStaffFocus(orgId: string | null): void {
    this.staffCurrentOrgId = orgId ?? undefined;
  }

  getStaffFocus(): string | undefined {
    return this.staffCurrentOrgId;
  }

  getStaffExpandedOrgIds(): string[] {
    return [...this.staffExpandedOrgIds];
  }

  getStaffExpandedPositionIds(): string[] {
    return [...this.staffExpandedPositionIds];
  }

  /**
   * Toggle expand-in-place for a tier-3 org card (staff under the card).
   * Caps at one expanded card by default (clears others).
   */
  async toggleStaffOrgExpand(orgId: string): Promise<boolean> {
    if (this.staffExpandedOrgIds.has(orgId)) {
      this.staffExpandedOrgIds.delete(orgId);
    } else {
      this.staffExpandedOrgIds.clear();
      this.staffExpandedOrgIds.add(orgId);
    }
    await this.render();
    return this.staffExpandedOrgIds.has(orgId);
  }

  /**
   * Toggle admin-subtree visibility for a position (T66 / C2).
   * No-op when id unknown or position has no admin children.
   * Honors `staffLayout.maxExpandedPositions` (expandToDepth bypasses the cap).
   */
  async togglePositionExpand(positionId: string): Promise<boolean> {
    const position = this.data.positions.find((p) => p.id === positionId);
    if (!position) return false;
    if (!positionHasAdminChildren(positionId, this.data.positions, this.data.reportLines)) {
      return false;
    }

    const wasExpanded = this.staffExpandedPositionIds.has(positionId) || position.expanded === true;
    if (wasExpanded) {
      this.setPositionExpandedFlag(positionId, false);
      this.callbacks.onLayoutChange?.({
        type: 'position-expand',
        positionId,
        expanded: false,
      });
      this.callbacks.onPositionExpandChange?.({
        positionId,
        expanded: false,
        changedIds: [positionId],
      });
      await this.render();
      this.panToPosition(positionId, { animate: true });
      return false;
    }

    const max = this.staffLayout.maxExpandedPositions ?? Number.POSITIVE_INFINITY;
    const evicted: string[] = [];
    if (Number.isFinite(max)) {
      while (this.staffExpandedPositionIds.size >= max) {
        const victim = this.staffExpandedPositionIds.values().next().value as string | undefined;
        if (victim === undefined) break;
        this.setPositionExpandedFlag(victim, false);
        evicted.push(victim);
      }
    }

    this.setPositionExpandedFlag(positionId, true);
    for (const id of evicted) {
      this.callbacks.onLayoutChange?.({
        type: 'position-expand',
        positionId: id,
        expanded: false,
      });
      this.callbacks.onPositionExpandChange?.({
        positionId: id,
        expanded: false,
        changedIds: [id],
      });
    }
    this.callbacks.onLayoutChange?.({
      type: 'position-expand',
      positionId,
      expanded: true,
    });
    this.callbacks.onPositionExpandChange?.({
      positionId,
      expanded: true,
      changedIds: [positionId, ...evicted],
    });
    await this.render();
    this.panToPosition(positionId, { animate: true });
    return true;
  }

  /**
   * Expand ancestors so nodes at depth ≤ `depth` are visible (T66 / C3).
   * Depth 0 = head only. Bypasses `maxExpandedPositions`.
   */
  async expandToDepth(options: {
    organizationId?: string;
    depth: number;
  }): Promise<void> {
    const organizationId = options.organizationId ?? this.staffCurrentOrgId;
    if (!organizationId) return;

    const { expandedIds, positions } = assignExpandToDepth(
      this.data.positions,
      this.data.reportLines,
      organizationId,
      options.depth,
    );

    const expandSet = new Set(expandedIds);
    // Drop prior expands for this org, then apply depth set (bypass cap).
    for (const p of this.data.positions) {
      if (p.organizationId !== organizationId) continue;
      this.staffExpandedPositionIds.delete(p.id);
    }
    for (const id of expandSet) this.staffExpandedPositionIds.add(id);
    this.data = { ...this.data, positions };

    const changedIds = [...expandSet];
    this.callbacks.onPositionExpandChange?.({
      positionId: changedIds[0] ?? '',
      expanded: changedIds.length > 0,
      changedIds,
    });
    await this.render();
    const head = this.data.positions.find(
      (p) => p.organizationId === organizationId && p.isHead,
    );
    if (head) this.panToPosition(head.id, { animate: true });
  }

  /** Collapse a position and clear expand flags on its admin descendants. */
  async collapsePositionSubtree(positionId: string): Promise<void> {
    const ids = adminDescendantIds(
      positionId,
      this.data.positions,
      this.data.reportLines,
    );
    if (ids.length === 0) return;
    for (const id of ids) this.setPositionExpandedFlag(id, false);
    this.callbacks.onPositionExpandChange?.({
      positionId,
      expanded: false,
      changedIds: ids,
    });
    await this.render();
    this.panToPosition(positionId, { animate: true });
  }

  /** Apply staff focus and re-render (drill into Tier-3 org card). Clears expands. */
  async focusStaffOrg(orgId: string | null): Promise<void> {
    this.staffExpandedOrgIds.clear();
    this.setStaffFocus(orgId);
    await this.render();
  }

  /** Pan camera to a position card after expand/collapse (T53 lesson). */
  private panToPosition(
    positionId: string,
    motion?: import('./render/Viewport.js').CameraMotionOptions,
  ): void {
    const box = this.host?.renderer.getNodeBox(positionId);
    if (!box) return;
    this.host?.panTo(box.x + box.width / 2, box.y + box.height / 2, motion);
  }

  async search(query: string): Promise<SearchResult[]> {
    return querySearchIndex(this.searchIdx, query);
  }

  /** Primary / first selected node (compat). Prefer {@link getSelections}. */
  getSelection(): NodeRef | null {
    return this.selections[0] ?? null;
  }

  /** Full multi-select set (T67 Phase 1). Order = selection order. */
  getSelections(): readonly NodeRef[] {
    return this.selections;
  }

  /** Soft layout warnings from the last render (anchor overlap, skipped expands, …). */
  getLayoutDiagnostics(): readonly string[] {
    return this.host?.renderer.getLayoutDiagnostics() ?? [];
  }

  /** Replace selection with one node (or clear). */
  async select(node: NodeRef | null): Promise<void> {
    this.applySelection(node);
    await this.render();
  }

  /** Replace selection with many nodes (deduped). */
  async selectMany(nodes: readonly NodeRef[]): Promise<void> {
    this.applySelections(nodes);
    await this.render();
  }

  /** Toggle membership of one node in the selection set. */
  async toggleSelection(node: NodeRef): Promise<void> {
    this.applyToggleSelection(node);
    await this.render();
  }

  /** Clear the selection set. */
  async clearSelection(): Promise<void> {
    this.applySelection(null);
    await this.render();
  }

  /**
   * Expand org path to root for a person/position/org id, then focus.
   * Unknown id → no-op (returns false).
   */
  async revealPath(nodeId: string): Promise<boolean> {
    const orgId = resolveOrganizationIdForNode(this.data, nodeId);
    if (!orgId) return false;
    this.data = {
      ...this.data,
      organizations: revealOrgPath(this.data.organizations, orgId),
    };
    this.callbacks.onOrgModeChange?.(this.getOrgMode());
    await this.focusNode(nodeId);
    return true;
  }

  /**
   * Resolve stable testId → node ref (first match). Accepts `node-` prefix.
   */
  resolveTestId(raw: string): NodeRef | null {
    return resolveTestIdInData(this.data, raw);
  }

  /**
   * Expand collapsed org (if applicable), reveal path, select + pan.
   * Unknown testId → false.
   */
  async focusByTestId(raw: string): Promise<boolean> {
    const ref = resolveTestIdInData(this.data, raw);
    if (!ref) return false;
    if (ref.kind === 'organization') {
      const org = this.data.organizations.find((o) => o.id === ref.id);
      if (org?.collapsed) {
        await this.expandOrg(ref.id);
      }
    }
    return this.revealPath(ref.id);
  }

  /** DOM anchor candidates synced to rendered node bounds (T55). */
  listTestAnchors(): TestAnchorCandidate[] {
    const boxes = this.host?.renderer.listNodeBoxes() ?? [];
    const out: TestAnchorCandidate[] = [];
    const seen = new Set<string>();
    for (const box of boxes) {
      const ref = this.resolveNodeRef(box.id);
      if (!ref) continue;
      const testId = this.testIdForRef(ref);
      if (!testId) continue;
      const dedupe = `${ref.kind}:${testId}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push({
        testId,
        kind: ref.kind,
        ref,
        world: { x: box.x, y: box.y, width: box.width, height: box.height },
      });
    }
    return out;
  }

  /** Open context menu for a node (e2e / programmatic). */
  openContextMenu(ref: NodeRef, pointer?: Partial<ContextMenuPointer>): void {
    this.emitContextMenu(ref, {
      clientX: pointer?.clientX ?? 0,
      clientY: pointer?.clientY ?? 0,
      canvasX: pointer?.canvasX,
      canvasY: pointer?.canvasY,
    });
  }

  /**
   * Select + pan to node. Unknown id → no-op, returns false.
   */
  async focusNode(nodeId: string): Promise<boolean> {
    const ref = this.resolveNodeRef(nodeId);
    if (!ref) return false;
    this.applySelection(ref);
    await this.render();
    const box =
      this.host?.renderer.getNodeBox(nodeId) ??
      (ref.positionId ? this.host?.renderer.getNodeBox(ref.positionId) : undefined);
    if (box) {
      this.host?.panTo(box.x + box.width / 2, box.y + box.height / 2, { animate: true });
    }
    return true;
  }

  getViewport(): { x: number; y: number; scale: number } {
    return this.host?.getViewport() ?? { x: 0, y: 0, scale: 1 };
  }

  setViewport(next: Partial<{ x: number; y: number; scale: number }>): void {
    this.host?.setViewport(next);
  }

  getZoom(): number {
    return this.host?.getZoom() ?? 1;
  }

  getLodLevel(): LodLevel {
    return this.lodLevel;
  }

  /**
   * World boxes + resolved node payloads for promote overlay.
   * When `ids` omitted, returns all remembered boxes that resolve to a node.
   */
  listPromoteCandidates(ids?: readonly string[]): PromoteCandidate[] {
    const boxes = this.host?.renderer.listNodeBoxes() ?? [];
    const wanted = ids ? new Set(ids) : null;
    const out: PromoteCandidate[] = [];
    const seen = new Set<string>();
    for (const box of boxes) {
      if (wanted && !wanted.has(box.id)) continue;
      if (seen.has(box.id)) continue;
      const ref = this.resolveNodeRef(box.id);
      if (!ref) continue;
      seen.add(box.id);
      out.push({
        id: box.id,
        kind: box.kind,
        world: { x: box.x, y: box.y, width: box.width, height: box.height },
        node: resolveContextMenuNodeData(this.data, ref),
      });
    }
    return out;
  }

  /** Hide Pixi views for promoted ids (HTML overlay owns the chrome). */
  setPromotedNodeIds(ids: readonly string[]): void {
    this.host?.renderer.setPromotedNodeIds(ids);
  }

  setZoom(scale: number): void {
    this.host?.setZoom(scale);
  }

  /** Multiply zoom around viewport center (toolbar +/-). */
  zoomBy(factor: number): void {
    this.host?.zoomBy(factor);
  }

  panTo(worldX: number, worldY: number, motion: CameraMotionOptions = { animate: true }): void {
    this.host?.panTo(worldX, worldY, motion);
  }

  /** Fit all rendered nodes into the viewport. Returns false if empty. */
  fitView(
    padding = 48,
    motion: CameraMotionOptions & { minScale?: number } = { animate: true },
  ): boolean {
    const ok = this.host?.fitView(padding, motion) ?? false;
    if (ok && motion.animate !== true) {
      this.onViewportTransform(this.host?.getZoom() ?? 1);
    }
    return ok;
  }

  /** Reset camera to identity (scale 1, origin). */
  resetView(motion: CameraMotionOptions = { animate: true }): void {
    this.host?.resetView(motion);
    if (motion.animate !== true) {
      this.onViewportTransform(1);
    }
  }

  async movePersonToCell(positionId: string, col: number, row: number): Promise<void> {
    try {
      this.data = {
        ...this.data,
        positions: movePositionToCell(this.data.positions, positionId, col, row),
      };
    } catch (err) {
      if (err instanceof InteractionError) {
        await this.render();
        return;
      }
      throw err;
    }
    const patch: LayoutPatch = { type: 'position-move', positionId, col, row };
    this.callbacks.onLayoutChange?.(patch);
    await this.render();
  }

  async shiftBlock(seedPositionId: string, deltaLevel: number): Promise<void> {
    const { positions, positionIds } = shiftPositionBlock(
      this.data.positions,
      seedPositionId,
      deltaLevel,
    );
    this.data = { ...this.data, positions };
    this.callbacks.onLayoutChange?.({ type: 'block-shift', positionIds, deltaLevel });
    await this.render();
  }

  async export(options: ExportOptions): Promise<Blob | string> {
    if (!this.host) {
      throw new ExportError('Cannot export before the diagram is mounted');
    }
    return runExport(
      {
        data: this.data,
        mounted: true,
        app: this.host.getApplication(),
        renderConfig: this.renderConfig,
        currentOrgId: this.staffCurrentOrgId,
        expandedOrgIds: [...this.staffExpandedOrgIds],
        staffLayout: {
          ...this.staffLayout,
          expandedPositionIds: [...this.staffExpandedPositionIds],
        },
      },
      options,
    );
  }

  async print(
    options?: Pick<ExportOptions, 'scope' | 'subtreeRootId' | 'background' | 'includeLabels'>,
  ): Promise<void> {
    const svg = (await this.export({
      format: 'svg',
      scope: options?.scope ?? 'full',
      subtreeRootId: options?.subtreeRootId,
      background: options?.background ?? '#ffffff',
      includeLabels: options?.includeLabels,
    })) as string;
    printDiagram(svg);
  }

  private resolveNodeRef(nodeId: string): NodeRef | null {
    const org = this.data.organizations.find((o) => o.id === nodeId);
    if (org) return this.orgNodeRef(org.id);
    const position = this.data.positions.find((p) => p.id === nodeId);
    if (position?.personId) return this.personNodeRef(position.personId, position.id);
    if (position) {
      return {
        kind: 'position',
        id: position.id,
        organizationId: position.organizationId,
        departmentId: position.departmentId,
        positionId: position.id,
      };
    }
    const byPerson = this.data.positions.find((p) => p.personId === nodeId);
    if (byPerson?.personId) return this.personNodeRef(byPerson.personId, byPerson.id);
    return null;
  }

  private testIdForRef(ref: NodeRef): string | null {
    if (ref.kind === 'organization') {
      const org = this.data.organizations.find((o) => o.id === ref.id);
      return org ? orgTestId(org) : null;
    }
    if (ref.kind === 'person') {
      const position = ref.positionId
        ? this.data.positions.find((p) => p.id === ref.positionId)
        : this.data.positions.find((p) => p.personId === (ref.personId ?? ref.id));
      const person = ref.personId
        ? this.data.persons.find((p) => p.id === ref.personId)
        : position?.personId
          ? this.data.persons.find((p) => p.id === position.personId)
          : undefined;
      if (position) return positionTestId(position, person);
      if (person) return personTestId(person);
      return null;
    }
    const position = this.data.positions.find((p) => p.id === (ref.positionId ?? ref.id));
    if (!position) return null;
    const person = position.personId
      ? this.data.persons.find((p) => p.id === position.personId)
      : undefined;
    return positionTestId(position, person);
  }

  destroy(): void {
    this.promoteSyncListeners.clear();
    this.contourComputer?.invalidate();
    this.contourComputer = null;
    this.workerPool?.dispose();
    this.workerPool = null;
    this.host?.destroy();
    this.host = null;
  }
}

function isDiagramData(v: unknown): v is DiagramData {
  return (
    typeof v === 'object' &&
    v !== null &&
    'organizations' in v &&
    'persons' in v &&
    'positions' in v
  );
}

function mergePartial(base: DiagramData, patch: Partial<DiagramData>): DiagramData {
  return {
    organizations: [...base.organizations, ...(patch.organizations ?? [])],
    groups: [...base.groups, ...(patch.groups ?? [])],
    departments: [...base.departments, ...(patch.departments ?? [])],
    persons: [...base.persons, ...(patch.persons ?? [])],
    positions: [...base.positions, ...(patch.positions ?? [])],
    reportLines: [...base.reportLines, ...(patch.reportLines ?? [])],
    orgLinks: [...(base.orgLinks ?? []), ...(patch.orgLinks ?? [])],
  };
}
