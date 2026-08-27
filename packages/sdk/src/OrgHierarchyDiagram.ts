import type { DiagramData } from './data/types.js';
import { isDiagramData, mergePartial } from './data/mergeData.js';
import type { DiagramMappers } from './mappers/types.js';
import {
  PixiHost,
  resolveRendererPreference,
  type RendererKindPreference,
} from './render/PixiHost.js';
import type { DiagramRenderer } from './render/DiagramRenderer.js';
import { MediaService, type DiagramMediaFacade, type MediaPlaceholderRegistry } from './media/index.js';
import {
  resolveThemedMediaFromOrganization,
  resolveThemedMediaFromPerson,
  DEFAULT_MEDIA_PLACEHOLDERS,
} from './media/index.js';
import {
  defaultRenderConfig,
  mergeTheme,
  resolveTheme,
  resolveNodeTheme,
  canvasBackgroundForTheme,
  getOrgSymbolUrl,
  type NodeTheme,
  type RenderConfig,
  type CameraMotionOptions,
} from './render/index.js';
import { resolvePersonPhotoUrl } from './render/PersonNode.js';
import { inferStaffCurrentOrgId } from './render/inferStaffCurrentOrgId.js';
import { resolveLodLevel, type LodLevel, type LodThresholds } from './render/lod.js';
import { createRenderCoalesce } from './render/renderCoalesce.js';
import { SelectionStore } from './state/SelectionStore.js';
import { ViewStateStore } from './state/ViewStateStore.js';
import { DataStore } from './state/DataStore.js';
import type { PromoteCandidate } from './render/promoteTypes.js';
import { promoteIdMatches } from './render/promoteMath.js';
import type { SelectionPointerMods } from './interaction/selection.js';
import { resolveContextMenuNodeData } from './interaction/contextMenuPayload.js';
import {
  collapseAllOrgs,
  collapseOrg,
  detectOrgMode,
  swapMatrixOrder,
  applyMatrixPlacement,
  assignExpandToDepth,
  adminDescendantIds,
  positionHasAdminChildren,
  victimsForExpand,
  type OrgDisplayMode,
  type OrgLayoutOptions,
  type StaffLayoutOptions,
} from './layout/index.js';
import type { OrgHierarchyCallbacks, LayoutPatch } from './callbacks.js';
import { createTransformWorker, WorkerPool } from './worker/index.js';
import {
  revealOrgPath,
  resolveOrganizationIdForNode,
  movePositionToCell,
  shiftPositionBlock,
  type NodeRef,
  type SearchResult,
  InteractionError,
  type ContextMenuRequest,
  type ContextMenuPointer,
  resolveTestIdInData,
  type TestAnchorCandidate,
} from './interaction/index.js';
import {
  SearchIndexService,
  knownSearchIds,
} from './interaction/SearchIndexService.js';
import { ContextMenuController } from './interaction/ContextMenuController.js';
import {
  orgNodeRef,
  personNodeRef,
  resolveNodeRefInData,
  seatNodeRef,
  testIdForRef,
} from './interaction/nodeRefs.js';
import {
  exportDiagram as runExport,
  printDiagram,
  ExportError,
  type ExportOptions,
} from './export/index.js';

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
  /** Per-diagram media placeholders keyed by host `entityType` (T74). */
  mediaPlaceholders?: MediaPlaceholderRegistry;
  /** Theme keys to prefetch besides active (T74 M4). */
  prefetchMediaThemeKeys?: readonly string[];
  /**
   * Which engine draws the scene (T83). Default `'auto'`: the browser refuses a
   * WebGL context it would emulate in software, and Pixi falls to Canvas2D.
   * `'canvas'` is the only guarantee; `'auto'` is best-effort.
   */
  renderer?: RendererKindPreference;
}

/** Embed SDK — Pixi render + data/mappers + worker contour */
export class OrgHierarchyDiagram {
  private readonly dataStore = new DataStore();
  private host: PixiHost | null = null;
  /** What the host asked for, kept verbatim for the diagnostic line. */
  private rendererPreference: RendererKindPreference = 'auto';
  /** Set only when the host asked for an engine we do not know (T83). */
  private rendererDiagnostic: string | null = null;
  private stylesPartial: Partial<NodeTheme> | undefined;
  private nodeTheme = mergeTheme();
  private renderConfig: RenderConfig = { ...defaultRenderConfig };
  private useWorker = true;
  private workerFactory: () => Worker = createTransformWorker;
  private workerPool: WorkerPool | null = null;
  private callbacks: OrgHierarchyCallbacks = {};
  private readonly searchService = new SearchIndexService(() => ({
    useWorker: this.useWorker,
    pool: this.workerPool,
    workerFactory: this.workerFactory,
  }));
  /** Multi-select set (T67 / T76 SelectionStore). */
  private readonly selectionStore = new SelectionStore((selections) => {
    this.callbacks.onSelectionChange?.([...selections]);
    this.notifyPromoteSync();
  });
  /** Theme / LOD / staff focus / expand sets (T76 ViewStateStore). */
  private readonly viewState = new ViewStateStore();
  private lodRenderQueued = false;
  /** T75 D2: coalesce overlapping render() so layers.clear never races. */
  private readonly renderCoalesce = createRenderCoalesce(() => this.renderNow());
  private destroyed = false;
  private promoteSyncListeners = new Set<() => void>();
  private mediaService: MediaService | null = null;
  /** Menu build + dispatch (was an inline switch on this class). */
  private readonly contextMenu = new ContextMenuController({
    data: () => this.data,
    selection: () => this.selectionStore.list,
    hooks: () => this.callbacks,
    commands: {
      expandOrg: (orgId) => this.expandOrg(orgId),
      collapseOrg: (orgId) => this.collapseOrg(orgId),
      focusNode: async (nodeId) => {
        await this.focusNode(nodeId);
      },
      setOrgsCollapsed: (orgIds, collapsed) => this.setOrgsCollapsed(orgIds, collapsed),
      clearSelection: () => this.clearSelection(),
    },
  });

  /** Backing diagram data (T76 DataStore). */
  private get data(): DiagramData {
    return this.dataStore.snapshot;
  }
  private set data(next: DiagramData) {
    this.dataStore.replace(next);
  }

  static async create<TRaw>(
    container: HTMLElement,
    config: OrgHierarchyConfig<TRaw>,
  ): Promise<OrgHierarchyDiagram> {
    if (!container) {
      throw new Error('OrgHierarchyDiagram: container is required');
    }
    const instance = new OrgHierarchyDiagram();
    instance.viewState.themeMode = config.theme ?? 'auto';
    instance.stylesPartial = config.styles;
    instance.nodeTheme = resolveNodeTheme(
      resolveTheme(instance.viewState.themeMode),
      config.styles,
    );
    instance.renderConfig = { ...defaultRenderConfig, ...config.render };
    instance.useWorker = config.useWorker ?? typeof Worker !== 'undefined';
    instance.callbacks = config.callbacks ?? {};
    instance.viewState.staffCurrentOrgId = config.staffCurrentOrgId;
    instance.viewState.staffLayout = config.staffLayout ?? {};
    instance.viewState.orgLayout = config.orgLayout ?? {};
    instance.viewState.orgTreeChrome = config.orgTreeChrome ?? true;
    if (config.staffExpandedOrgIds?.length) {
      instance.viewState.staffExpandedOrgIds.clear();
      for (const id of config.staffExpandedOrgIds) {
        instance.viewState.staffExpandedOrgIds.add(id);
      }
    }
    if (config.lodThresholds) {
      instance.viewState.lodThresholds = config.lodThresholds;
    }

    // No module-level `configure*` here on purpose: it is process-wide, so a
    // second diagram used to terminate the first one's worker and take over its
    // factory. Each diagram now owns its workers — the search one through
    // `SearchIndexService`, the pool below, and the contour path through
    // `createContourWorkerClient` when a host opts into it.
    const workerFactory = config.workerFactory ?? createTransformWorker;
    instance.workerFactory = workerFactory;

    const poolSize = config.workerPoolSize ?? 0;
    if (poolSize > 0) {
      instance.workerPool = new WorkerPool(workerFactory, poolSize);
    }

    await instance.applyConfig(config);
    // Same builder as setData: a 100k mount used to block the main thread here
    // while the worker path sat unused until the first setData.
    await instance.searchService.rebuildForScale(instance.data);
    instance.rendererPreference = config.renderer ?? 'auto';
    instance.rendererDiagnostic = resolveRendererPreference(config.renderer).diagnostic ?? null;
    try {
      instance.host = await PixiHost.create(container, { renderer: config.renderer });
    } catch (cause) {
      // The workers and the search index are already alive by now, and the
      // caller never receives the instance — so nobody else can release them.
      instance.destroy();
      throw new Error(
        `OrgHierarchyDiagram: could not mount with renderer '${instance.rendererPreference}'. ` +
          `${cause instanceof Error ? cause.message : String(cause)}`,
        { cause },
      );
    }
    instance.host.setOnViewportChange((t) => {
      instance.onViewportTransform(t.scale);
      instance.notifyPromoteSync();
    });
    instance.viewState.lodLevel = resolveLodLevel(
      instance.host.getZoom(),
      instance.viewState.lodThresholds,
    );
    const resolvedTheme = resolveTheme(instance.viewState.themeMode);
    const hostPlaceholders = config.mediaPlaceholders;
    instance.mediaService = new MediaService(
      resolvedTheme,
      {
        ...DEFAULT_MEDIA_PLACEHOLDERS,
        ...hostPlaceholders,
        default: {
          ...DEFAULT_MEDIA_PLACEHOLDERS.default,
          ...hostPlaceholders?.default,
        },
      },
      {
        prefetchThemeKeys: config.prefetchMediaThemeKeys,
        onInvalidateViews: async (urls) => {
          await instance.renderer?.refreshMediaUrls(urls);
        },
        resolveNodeUrls: (ref) => instance.resolveMediaUrlsForRef(ref),
      },
    );
    await instance.render();
    return instance;
  }

  /** Per-diagram media loader / invalidation (T74). */
  get media(): DiagramMediaFacade {
    if (!this.mediaService) {
      throw new Error('OrgHierarchyDiagram: media service not initialized');
    }
    return this.mediaService;
  }

  /** The renderer of the mounted host, or null before mount / after destroy. */
  private get renderer(): DiagramRenderer | null {
    return this.host?.renderer ?? null;
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
    const next = resolveLodLevel(scale, this.viewState.lodThresholds);
    if (next === this.viewState.lodLevel) return;
    this.viewState.lodLevel = next;
    if (this.lodRenderQueued) return;
    this.lodRenderQueued = true;
    queueMicrotask(() => {
      this.lodRenderQueued = false;
      void this.render();
    });
  }

  private applySelection(next: NodeRef | null): void {
    this.selectionStore.replace(next);
  }

  private applyToggleSelection(node: NodeRef): void {
    this.selectionStore.toggle(node);
  }

  private applySelections(next: readonly NodeRef[]): void {
    this.selectionStore.replaceMany(next);
  }

  private handleNodeSelect(
    node: NodeRef,
    mods?: SelectionPointerMods,
  ): void {
    this.selectionStore.handlePointerSelect(node, mods);
  }

  getLastContextMenu(): ContextMenuRequest | null {
    return this.contextMenu.lastRequest;
  }

  /** Invoke a menu action (from React menu item click). */
  async runContextMenuAction(itemId: string, request?: ContextMenuRequest): Promise<void> {
    await this.contextMenu.run(itemId, request);
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
    this.viewState.staffExpandedPositionIds.clear();
    for (const p of this.data.positions) {
      if (p.expanded === true) this.viewState.staffExpandedPositionIds.add(p.id);
    }
  }

  private setPositionExpandedFlag(positionId: string, expanded: boolean): void {
    this.data = {
      ...this.data,
      positions: this.data.positions.map((p) =>
        p.id === positionId && p.expanded !== expanded ? { ...p, expanded } : p,
      ),
    };
    if (expanded) this.viewState.staffExpandedPositionIds.add(positionId);
    else this.viewState.staffExpandedPositionIds.delete(positionId);
  }

  /**
   * Coalesce concurrent renders (T75 D2). Overlapping callers share one promise;
   * a dirty flag schedules exactly one follow-up pass after the in-flight work.
   */
  private async render(): Promise<void> {
    if (!this.host || this.destroyed) return;
    await this.renderCoalesce.schedule();
  }

  private async renderNow(): Promise<void> {
    if (!this.host || this.destroyed) return;
    const host = this.host;
    const resolved = resolveTheme(this.viewState.themeMode);
    this.nodeTheme = resolveNodeTheme(resolved, this.stylesPartial);
    host.setBackground(
      this.nodeTheme.canvasBackground ?? canvasBackgroundForTheme(resolved),
    );
    await host.renderer.render(this.data, this.nodeTheme, resolved, this.renderConfig, {
      lod: this.viewState.lodLevel,
      orgLayout: this.viewState.orgLayout,
      staff: this.viewState.staffCurrentOrgId
        ? {
            currentOrgId: this.viewState.staffCurrentOrgId,
            layout: {
              ...this.viewState.staffLayout,
              expandedPositionIds: [...this.viewState.staffExpandedPositionIds],
            },
            expandedOrgIds: [...this.viewState.staffExpandedOrgIds],
          }
        : undefined,
      selected: this.selectionStore.list,
      loadTexture: (url, revision) =>
        this.mediaService
          ? this.mediaService.loadTexture(url, revision)
          : Promise.resolve(null),
      onCanvasClick: () => {
        if (this.destroyed) return;
        this.applySelection(null);
        this.repaintSelection();
      },
      onOrgClick: (orgId, mods) => {
        if (this.destroyed) return;
        const node = orgNodeRef(orgId);
        this.handleNodeSelect(node, mods);
        this.callbacks.onNodeClick?.(node);
        this.repaintSelection();
      },
      onOrgDoubleClick: (orgId) => {
        this.callbacks.onNodeDoubleClick?.(orgNodeRef(orgId));
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
        if (this.destroyed) return;
        const node = seatNodeRef(this.data, personId, positionId);
        this.handleNodeSelect(node, mods);
        this.callbacks.onNodeClick?.(node);
        this.repaintSelection();
      },
      onPersonDoubleClick: (personId, positionId) => {
        if (!personId) return;
        this.callbacks.onNodeDoubleClick?.(personNodeRef(this.data, personId, positionId));
      },
      onPersonContextMenu: (personId, positionId, pointer) => {
        const ref = seatNodeRef(this.data, personId, positionId);
        this.contextMenu.open(ref, pointer);
      },
      onOrgContextMenu: (orgId, pointer) => {
        this.contextMenu.open(orgNodeRef(orgId), pointer);
      },
      onOrgExpand: this.viewState.orgTreeChrome
        ? (orgId) => {
            void this.expandOrg(orgId);
          }
        : undefined,
      onOrgCollapse: this.viewState.orgTreeChrome
        ? (orgId) => {
            void this.collapseOrg(orgId);
          }
        : undefined,
      onPersonDragEnd: (positionId, col, row) => {
        void this.movePersonToCell(positionId, col, row);
      },
    });
    if (this.destroyed || !this.host) return;
    this.callbacks.onLayoutDiagnostics?.(this.getLayoutDiagnostics());
    this.notifyPromoteSync();
    this.prefetchConfiguredMedia();
  }

  /** URLs currently bound to a node (for `diagram.media.refresh`). */
  private resolveMediaUrlsForRef(ref: NodeRef): string[] {
    const out = new Set<string>();
    const theme = resolveTheme(this.viewState.themeMode);
    if (ref.kind === 'organization') {
      const org = this.data.organizations.find((o) => o.id === ref.id);
      if (!org) return [];
      const media = org.media ?? resolveThemedMediaFromOrganization(org);
      if (media?.fallback) out.add(media.fallback.trim());
      if (media?.byTheme) {
        for (const u of Object.values(media.byTheme)) {
          if (u?.trim()) out.add(u.trim());
        }
      }
      const active = getOrgSymbolUrl(org, theme);
      if (active?.trim()) out.add(active.trim());
      return [...out];
    }
    const personId = ref.personId ?? (ref.kind === 'person' ? ref.id : undefined);
    const person = personId
      ? this.data.persons.find((p) => p.id === personId)
      : undefined;
    const photo = resolvePersonPhotoUrl(person);
    if (photo) out.add(photo);
    return [...out];
  }

  /** M4: preload alternate theme keys when host opts in via prefetchMediaThemeKeys. */
  private prefetchConfiguredMedia(): void {
    if (!this.mediaService?.hasPrefetchThemes) return;
    if (this.viewState.lodLevel === 'far') return;
    for (const org of this.data.organizations) {
      const media = org.media ?? resolveThemedMediaFromOrganization(org);
      this.mediaService.prefetch(media, media?.revision);
    }
    for (const person of this.data.persons) {
      const media = person.media ?? resolveThemedMediaFromPerson(person);
      this.mediaService.prefetch(media, media?.revision);
    }
  }

  getOrgMode(): OrgDisplayMode {
    return detectOrgMode(this.data.organizations);
  }

  async expandOrg(orgId: string): Promise<void> {
    const modeBefore = this.getOrgMode();
    this.data = {
      ...this.data,
      // Expand ancestors too — otherwise row-tree roots at the leaf and drops the forest (A12).
      organizations: revealOrgPath(this.data.organizations, orgId),
    };
    this.callbacks.onOrgModeChange?.(this.getOrgMode());
    await this.render();
    const modeAfter = this.getOrgMode();
    // T53: first matrix→row-tree expand frames the whole visible subtree.
    if (modeBefore === 'matrix' && modeAfter === 'row-tree') {
      this.host?.fitView(48, { animate: true });
      return;
    }
    this.panToNode(orgId, { animate: true });
  }

  async collapseOrg(orgId: string): Promise<void> {
    this.data = {
      ...this.data,
      organizations: collapseOrg(this.data.organizations, orgId),
    };
    this.callbacks.onOrgModeChange?.(this.getOrgMode());
    await this.render();
    this.panToNode(orgId, { animate: true });
  }

  /**
   * Bulk expand / collapse (T67 D2). One data update and one render for the
   * whole set — looping {@link expandOrg} would repaint and re-aim the camera
   * per organization.
   */
  async setOrgsCollapsed(orgIds: readonly string[], collapsed: boolean): Promise<void> {
    if (orgIds.length === 0) return;
    let organizations = this.data.organizations;
    for (const orgId of orgIds) {
      organizations = collapsed
        ? collapseOrg(organizations, orgId)
        : revealOrgPath(organizations, orgId);
    }
    this.data = { ...this.data, organizations };
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
    this.host?.fitView(48, { animate: true });
  }

  /**
   * Pan the camera to a rendered node's centre (T53: after matrix↔row-tree
   * transitions, after expand/collapse, after focus). False when the node has
   * no box — it is collapsed away or not laid out yet.
   */
  private panToNode(nodeId: string, motion?: CameraMotionOptions): boolean {
    const box = this.renderer?.getNodeBox(nodeId);
    if (!box) return false;
    this.host?.panTo(box.x + box.width / 2, box.y + box.height / 2, motion);
    return true;
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
    const side = Math.max(1, Math.ceil(Math.sqrt(this.data.organizations.length)));
    const dims = grid ?? { rows: side, cols: side };
    const cell = { row: Math.floor(row), col: Math.floor(col) };
    const placement = applyMatrixPlacement(this.data.organizations, orgId, cell, dims);
    if (placement.organizations === this.data.organizations) return;

    const { ejectedOrgId } = placement;
    this.data = { ...this.data, organizations: placement.organizations };
    const patch: LayoutPatch = {
      type: 'matrix-cell',
      orgId,
      row: cell.row,
      col: cell.col,
      ejectedOrgId,
    };
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
    await this.searchService.rebuildForScale(this.data);
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
    this.viewState.themeMode = theme;
    this.mediaService?.setActiveThemeKey(resolveTheme(theme));
    await this.render();
  }

  async appendData<TRaw>(chunk: TRaw, mappers?: DiagramMappers<TRaw>): Promise<void> {
    let patch: Partial<DiagramData>;
    if (mappers?.append) {
      patch = await mappers.append(chunk);
    } else if (mappers?.toDiagram) {
      patch = await mappers.toDiagram(chunk);
    } else {
      throw new InteractionError('appendData requires mappers.append or mappers.toDiagram');
    }
    const known = this.searchService.current ? knownSearchIds(this.data) : null;
    this.data = mergePartial(this.data, patch);
    await this.searchService.append(this.data, patch, known);
    await this.render();
  }

  /** Staff focus org (Tier-2). Pass `null` to clear and use auto-inference. */
  setStaffFocus(orgId: string | null): void {
    this.viewState.staffCurrentOrgId = orgId ?? undefined;
  }

  getStaffFocus(): string | undefined {
    return this.viewState.staffCurrentOrgId;
  }

  getStaffExpandedOrgIds(): string[] {
    return [...this.viewState.staffExpandedOrgIds];
  }

  getStaffExpandedPositionIds(): string[] {
    return [...this.viewState.staffExpandedPositionIds];
  }

  /**
   * Toggle expand-in-place for a tier-3 org card (staff under the card).
   * Caps at one expanded card by default (clears others).
   */
  async toggleStaffOrgExpand(orgId: string): Promise<boolean> {
    if (this.viewState.staffExpandedOrgIds.has(orgId)) {
      this.viewState.staffExpandedOrgIds.delete(orgId);
    } else {
      this.viewState.staffExpandedOrgIds.clear();
      this.viewState.staffExpandedOrgIds.add(orgId);
    }
    await this.render();
    return this.viewState.staffExpandedOrgIds.has(orgId);
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

    const expandedIds = this.viewState.staffExpandedPositionIds;
    if (expandedIds.has(positionId) || position.expanded === true) {
      this.setPositionExpandedFlag(positionId, false);
      this.emitPositionExpand(positionId, false, [positionId]);
      await this.render();
      this.panToNode(positionId, { animate: true });
      return false;
    }

    // Honour maxExpandedPositions: collapse the oldest until the new one fits.
    const evicted = victimsForExpand(
      expandedIds,
      this.viewState.staffLayout.maxExpandedPositions ?? Number.POSITIVE_INFINITY,
    );
    for (const id of evicted) this.setPositionExpandedFlag(id, false);
    this.setPositionExpandedFlag(positionId, true);

    for (const id of evicted) this.emitPositionExpand(id, false, [id]);
    this.emitPositionExpand(positionId, true, [positionId, ...evicted]);
    await this.render();
    this.panToNode(positionId, { animate: true });
    return true;
  }

  /** Both expand callbacks always fire together — one place, one shape. */
  private emitPositionExpand(
    positionId: string,
    expanded: boolean,
    changedIds: readonly string[],
  ): void {
    this.callbacks.onLayoutChange?.({ type: 'position-expand', positionId, expanded });
    this.callbacks.onPositionExpandChange?.({
      positionId,
      expanded,
      changedIds: [...changedIds],
    });
  }

  /**
   * Expand ancestors so nodes at depth ≤ `depth` are visible (T66 / C3).
   * Depth 0 = head only. Bypasses `maxExpandedPositions`.
   */
  async expandToDepth(options: {
    organizationId?: string;
    depth: number;
  }): Promise<void> {
    const organizationId = options.organizationId ?? this.viewState.staffCurrentOrgId;
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
      this.viewState.staffExpandedPositionIds.delete(p.id);
    }
    for (const id of expandSet) this.viewState.staffExpandedPositionIds.add(id);
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
    if (head) this.panToNode(head.id, { animate: true });
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
    this.panToNode(positionId, { animate: true });
  }

  /** Apply staff focus and re-render (drill into Tier-3 org card). Clears expands. */
  async focusStaffOrg(orgId: string | null): Promise<void> {
    this.viewState.staffExpandedOrgIds.clear();
    this.setStaffFocus(orgId);
    await this.render();
  }

  async search(query: string): Promise<SearchResult[]> {
    // A destroyed diagram has no scene to focus a hit on; answering with stale
    // rows would just invite the caller to act on a dead instance.
    if (this.destroyed) return [];
    return this.searchService.query(query);
  }

  /** Primary / first selected node (compat). Prefer {@link getSelections}. */
  getSelection(): NodeRef | null {
    return this.selectionStore.primary;
  }

  /** Full multi-select set (T67 Phase 1). Order = selection order. */
  getSelections(): readonly NodeRef[] {
    return this.selectionStore.list;
  }

  /** Engine that drew the scene, or `null` before mount / after destroy (T83). */
  getRendererKind(): 'webgl' | 'canvas' | null {
    return this.host?.getRendererKind() ?? null;
  }

  /**
   * Diagnostics for the last render, including the engine that drew it.
   *
   * The engine line is added here rather than inside `DiagramRenderer`: the
   * renderer overwrites its own list on every render, so a line written once at
   * mount would disappear after the first frame — and it is a property of the
   * host, not of the scene.
   */
  getLayoutDiagnostics(): readonly string[] {
    const fromRenderer = this.renderer?.getLayoutDiagnostics();
    if (!fromRenderer) return [];
    const kind = this.getRendererKind();
    if (!kind) return fromRenderer;
    const engine = `Renderer: ${kind} (requested: ${String(this.rendererPreference)})`;
    return this.rendererDiagnostic
      ? [engine, this.rendererDiagnostic, ...fromRenderer]
      : [engine, ...fromRenderer];
  }

  /** Replace selection with one node (or clear). */
  async select(node: NodeRef | null): Promise<void> {
    this.applySelection(node);
    this.repaintSelection();
  }

  /** Replace selection with many nodes (deduped). */
  async selectMany(nodes: readonly NodeRef[]): Promise<void> {
    this.applySelections(nodes);
    this.repaintSelection();
  }

  /** Toggle membership of one node in the selection set. */
  async toggleSelection(node: NodeRef): Promise<void> {
    this.applyToggleSelection(node);
    this.repaintSelection();
  }

  /** Clear the selection set. */
  async clearSelection(): Promise<void> {
    this.applySelection(null);
    this.repaintSelection();
  }

  /** T75 D1: selection chrome only — keeps nodeViews alive. */
  private repaintSelection(): void {
    if (!this.host || this.destroyed) return;
    this.renderer?.repaintSelection(this.selectionStore.list);
    this.notifyPromoteSync();
  }

  /**
   * Expand org path to root for a person/position/org id, then focus.
   * Unknown id → no-op (returns false).
   */
  async revealPath(nodeId: string): Promise<boolean> {
    const orgId = resolveOrganizationIdForNode(this.data, nodeId);
    if (!orgId) return false;
    const organizations = revealOrgPath(this.data.organizations, orgId);
    if (organizations !== this.data.organizations) {
      // The node box only exists after the reveal is laid out — focusing before
      // the render silently skipped the pan for anything under a collapsed org.
      this.data = { ...this.data, organizations };
      this.callbacks.onOrgModeChange?.(this.getOrgMode());
      await this.render();
    }
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
    const boxes = this.renderer?.listNodeBoxes() ?? [];
    const out: TestAnchorCandidate[] = [];
    const seen = new Set<string>();
    for (const box of boxes) {
      const ref = resolveNodeRefInData(this.data, box.id);
      if (!ref) continue;
      const testId = testIdForRef(this.data, ref);
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
    this.contextMenu.open(ref, {
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
    const ref = resolveNodeRefInData(this.data, nodeId);
    if (!ref) return false;
    this.applySelection(ref);
    this.repaintSelection();
    // A person id has no box of its own — the seat it fills does.
    if (!this.panToNode(nodeId, { animate: true }) && ref.positionId) {
      this.panToNode(ref.positionId, { animate: true });
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
    return this.viewState.lodLevel;
  }

  /**
   * World boxes + resolved node payloads for promote overlay.
   * When `ids` omitted, returns all remembered boxes that resolve to a node.
   */
  listPromoteCandidates(ids?: readonly string[]): PromoteCandidate[] {
    const boxes = this.renderer?.listNodeBoxes() ?? [];
    const wanted = ids ? new Set(ids) : null;
    const out: PromoteCandidate[] = [];
    const seen = new Set<string>();
    for (const box of boxes) {
      if (wanted && !promoteIdMatches(wanted, box.id, box.kind)) continue;
      if (seen.has(box.id)) continue;
      const ref = resolveNodeRefInData(this.data, box.id);
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
    this.renderer?.setPromotedNodeIds(ids);
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
        // T78-L4: same focus as canvas when staffCurrentOrgId unset
        currentOrgId:
          this.viewState.staffCurrentOrgId ?? inferStaffCurrentOrgId(this.data),
        expandedOrgIds: [...this.viewState.staffExpandedOrgIds],
        staffLayout: {
          ...this.viewState.staffLayout,
          expandedPositionIds: [...this.viewState.staffExpandedPositionIds],
        },
        personTheme: this.nodeTheme.person,
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

  destroy(): void {
    this.destroyed = true;
    this.renderCoalesce.stop();
    this.promoteSyncListeners.clear();
    void this.mediaService?.destroy();
    this.mediaService = null;
    this.searchService.dispose();
    this.workerPool?.dispose();
    this.workerPool = null;
    this.host?.destroy();
    this.host = null;
  }
}
