import { emptyDiagramData, computeStats } from './data/types.js';
import type { DiagramData } from './data/types.js';
import type { DiagramMappers } from './mappers/types.js';
import { configureContourWorker } from './contour/worker-bridge.js';
import { computeAllContoursInWorker } from './contour/worker-bridge.js';
import { computeAllContours as computeAllContoursMain } from './contour/bridge.js';
import { PixiHost } from './render/PixiHost.js';
import {
  defaultRenderConfig,
  mergeTheme,
  resolveTheme,
  type NodeTheme,
  type RenderConfig,
} from './render/index.js';
import {
  collapseAllOrgs,
  collapseOrg,
  detectOrgMode,
  expandOrg,
  swapMatrixOrder,
  placeOrgAtMatrixCell,
  assignMatrixCells,
  type OrgDisplayMode,
} from './layout/index.js';
import type { OrgHierarchyCallbacks, LayoutPatch } from './callbacks.js';
import { createTransformWorker, WorkerPool } from './worker/index.js';
import {
  buildSearchIndex,
  searchIndex as querySearchIndex,
  revealOrgPath,
  resolveOrganizationIdForNode,
  movePositionToCell,
  shiftPositionBlock,
  selectNode,
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
} from './interaction/index.js';
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
} from './worker/index.js';
export type { MapperRegistry, WorkerBridgeOptions } from './worker/bridge.js';

export {
  computeDeptContour,
  computeAllContours,
  initContourWasm,
  VARIANT_B_POSITIONS,
} from './contour/bridge.js';
export {
  computeDeptContourInWorker,
  computeAllContoursInWorker,
  configureContourWorker,
} from './contour/worker-bridge.js';
export type {
  ContourPositionInput,
  ContourMagnetConfig,
  ContourPoint,
  DeptContourResult,
} from './contour/bridge.js';
export type { ContourWorkerOptions } from './contour/worker-bridge.js';

export {
  DepartmentBlobView,
  PersonNodeView,
  OrganizationNodeView,
  DiagramRenderer,
  PixiHost,
  parseSvgPath,
  defaultNodeTheme,
  mergeTheme,
} from './render/index.js';
export type { NodeTheme, ThemeMode, RenderConfig, ContourComputer } from './render/index.js';
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
  searchIndex as runSearchIndex,
  revealOrgPath,
  movePositionToCell,
  shiftPositionBlock,
  InteractionError,
  defaultContextMenuItems,
  resolveContextMenuNodeData,
} from './interaction/index.js';

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
}

/** Embed SDK — Pixi render + data/mappers + worker contour */
export class OrgHierarchyDiagram {
  private data: DiagramData = emptyDiagramData();
  private host: PixiHost | null = null;
  private themeMode: 'light' | 'dark' | 'auto' = 'auto';
  private nodeTheme = mergeTheme();
  private renderConfig: RenderConfig = { ...defaultRenderConfig };
  private useWorker = true;
  private workerPool: WorkerPool | null = null;
  private callbacks: OrgHierarchyCallbacks = {};
  private staffCurrentOrgId: string | undefined;
  private searchIdx: SearchIndex | null = null;
  private selection: NodeRef | null = null;
  static async create<TRaw>(
    container: HTMLElement,
    config: OrgHierarchyConfig<TRaw>,
  ): Promise<OrgHierarchyDiagram> {
    if (!container) {
      throw new Error('OrgHierarchyDiagram: container is required');
    }
    const instance = new OrgHierarchyDiagram();
    instance.themeMode = config.theme ?? 'auto';
    instance.nodeTheme = mergeTheme(config.styles);
    instance.renderConfig = { ...defaultRenderConfig, ...config.render };
    instance.useWorker = config.useWorker ?? typeof Worker !== 'undefined';
    instance.callbacks = config.callbacks ?? {};
    instance.staffCurrentOrgId = config.staffCurrentOrgId;

    const workerFactory = config.workerFactory ?? createTransformWorker;
    configureContourWorker({
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
    await instance.render();
    return instance;
  }

  private rebuildSearchIndex(): void {
    this.searchIdx = buildSearchIndex(this.data);
  }

  private applySelection(next: NodeRef | null): void {
    const result = selectNode(this.selection, next);
    if (!result.changed) return;
    this.selection = result.selection;
    this.callbacks.onSelectionChange?.(result.selection ? [result.selection] : []);
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
  }

  private async render(): Promise<void> {
    if (!this.host) return;
    const resolved = resolveTheme(this.themeMode);
    const computeContours = this.useWorker ? computeAllContoursInWorker : computeAllContoursMain;
    await this.host.renderer.render(this.data, this.nodeTheme, resolved, this.renderConfig, {
      computeContours,
      staff: this.staffCurrentOrgId
        ? { currentOrgId: this.staffCurrentOrgId }
        : undefined,
      selected: this.selection,
      onCanvasClick: () => {
        this.applySelection(null);
        void this.render();
      },
      onOrgClick: (orgId) => {
        const node = this.orgNodeRef(orgId);
        this.applySelection(node);
        this.callbacks.onNodeClick?.(node);
        void this.render();
      },
      onStaffOrgDrill: (orgId) => {
        void this.focusStaffOrg(orgId);
      },
      onPersonClick: (personId, positionId) => {
        const node = this.personNodeRef(personId, positionId);
        this.applySelection(node);
        this.callbacks.onNodeClick?.(node);
        void this.render();
      },
      onPersonContextMenu: (personId, positionId, pointer) => {
        this.emitContextMenu(this.personNodeRef(personId, positionId), pointer);
      },
      onOrgContextMenu: (orgId, pointer) => {
        this.emitContextMenu(this.orgNodeRef(orgId), pointer);
      },
      onPersonDragEnd: (positionId, col, row) => {
        void this.movePersonToCell(positionId, col, row);
      },
    });
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
  }

  async collapseOrg(orgId: string): Promise<void> {
    this.data = {
      ...this.data,
      organizations: collapseOrg(this.data.organizations, orgId),
    };
    this.callbacks.onOrgModeChange?.(this.getOrgMode());
    await this.render();
  }

  async collapseAllOrgs(): Promise<void> {
    this.data = {
      ...this.data,
      organizations: collapseAllOrgs(this.data.organizations),
    };
    this.callbacks.onOrgModeChange?.(this.getOrgMode());
    await this.render();
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
    this.rebuildSearchIndex();
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
    this.rebuildSearchIndex();
    await this.render();
  }

  /** Staff focus org (Tier-2). Pass `null` to clear and use auto-inference. */
  setStaffFocus(orgId: string | null): void {
    this.staffCurrentOrgId = orgId ?? undefined;
  }

  getStaffFocus(): string | undefined {
    return this.staffCurrentOrgId;
  }

  /** Apply staff focus and re-render (drill into Tier-3 org card). */
  async focusStaffOrg(orgId: string | null): Promise<void> {
    this.setStaffFocus(orgId);
    await this.render();
  }

  async search(query: string): Promise<SearchResult[]> {
    return querySearchIndex(this.searchIdx, query);
  }

  getSelection(): NodeRef | null {
    return this.selection;
  }

  async select(node: NodeRef | null): Promise<void> {
    this.applySelection(node);
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
      this.host?.panTo(box.x + box.width / 2, box.y + box.height / 2);
    }
    return true;
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

  destroy(): void {
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
