import type { DiagramData, DiagramOrganization, DiagramReportLine } from './data/types.js';
import { isDiagramData, mergePartial } from './data/mergeData.js';
import { applyInitialExpand } from './data/initialExpand.js';
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
  type NodeThemeOverrides,
  type RenderConfig,
  type CameraMotionOptions,
  type NodeWorldBox,
} from './render/index.js';
import { resolvePersonPhotoUrl } from './render/PersonNode.js';
import { inferStaffCurrentOrgId } from './render/inferStaffCurrentOrgId.js';
import { resolveLodLevel, type LodLevel, type LodThresholds } from './render/lod.js';
import { createRenderCoalesce } from './render/renderCoalesce.js';
import { SelectionStore } from './state/SelectionStore.js';
import { ViewStateStore } from './state/ViewStateStore.js';
import { DataStore } from './state/DataStore.js';
import type { PromoteCandidate, PromoteChrome } from './render/promoteTypes.js';
import { promoteIdMatches } from './render/promoteMath.js';
import type { SelectionPointerMods } from './interaction/selection.js';
import {
  adminParentsOf,
  canReparent,
  reparentPosition,
} from './interaction/positionReparent.js';
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
import type {
  OrgHierarchyCallbacks,
  LayoutPatch,
  ViewportChangeReason,
  HostSearchHit,
  HostSearchPage,
  RenderFailure,
  InitialExpandResult,
} from './callbacks.js';
import type { ViewportTransform } from './render/Viewport.js';
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
  styles?: NodeThemeOverrides;
  render?: Partial<RenderConfig>;
  /** Contour + WASM compute у Web Worker (default: true у browser) */
  useWorker?: boolean;
  /** Worker pool для паралельних map chunks (flatRowsToDiagram тощо) */
  workerPoolSize?: number;
  /** Custom worker factory (transform.worker.ts) */
  workerFactory?: () => Worker;
  callbacks?: OrgHierarchyCallbacks;
  /** Quiet period before `onViewportChange` reports `settled` (default 150). */
  viewportSettleMs?: number;
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
   * Open the tree to the minimum a reader needs, before the first frame.
   *
   * With `rootOrgId`, that organisation and its ancestors are opened and
   * everything else is closed — three levels when it has a governing
   * organisation above it, two when it is a root itself. Without one, every root
   * of the forest is treated as ours.
   *
   * Omit this and the `collapsed` flags in the data are left exactly as they
   * arrived. That is deliberate: the flags are a host contract, and taking them
   * over uninvited would change scenes that already work.
   */
  initialExpand?: {
    rootOrgId?: string;
    /**
     * Open the tree down to this node as well, and put the camera on it.
     *
     * For a deep link: a URL that names an organisation should land on it
     * already open, not open it after a collapsed frame. Accepts a person or
     * position id too — those resolve to the organisation that holds them.
     *
     * A target that resolves to nothing leaves the {@link rootOrgId} minimum in
     * place and says why through `onInitialExpand`; it is not an error, because
     * a stale link is an ordinary thing for a URL to carry.
     */
    revealNodeId?: string;
  };
  /**
   * Which engine draws the scene (T83). Default `'auto'`: the browser refuses a
   * WebGL context it would emulate in software, and Pixi falls to Canvas2D.
   * `'canvas'` is the only guarantee; `'auto'` is best-effort.
   */
  renderer?: RendererKindPreference;
}

/** Embed SDK — Pixi render + data/mappers + worker contour */
/** What {@link OrgHierarchyDiagram.searchAll} answers with. */
export interface SearchAllResult {
  hits: SearchResult[];
  /** Every match in the dataset when the host answered; the page otherwise. */
  total: number;
  hasMore: boolean;
  /** Where the answer came from — `window` also means «no host callback». */
  source: 'window' | 'host';
  /**
   * Set when the host could not answer: it threw, or sent something that is not
   * a page. The caller must say so rather than showing «no matches» — those are
   * different facts and a user acts on them differently.
   */
  unavailable?: string;
  /**
   * The host's page verbatim, before the scene was asked to resolve any of it.
   *
   * Required, not a convenience: a windowed host answers with seats it holds
   * and the diagram does not, so filtering to what the current scene can
   * resolve would return an empty list for a query with 25 000 real matches.
   * The caller renders these; `hits` is only the subset it can focus *now*.
   */
  beyond?: HostSearchHit[];
  /**
   * Ids in {@link beyond} the current scene cannot resolve.
   *
   * For a windowed host this is the normal state, not an error — the seat
   * exists, it is simply not materialised, and reaching it means moving the
   * window first. It is reported so a caller that expected everything to be
   * focusable can tell.
   */
  unresolved?: string[];
}

/**
 * Validate a host answer before believing it.
 *
 * `searchBeyondWindow` is somebody else's code, so its return value is input,
 * not a promise kept. Anything that fails this reads as unavailable.
 */
function parseHostSearchPage(value: unknown): HostSearchPage | null {
  if (typeof value !== 'object' || value === null) return null;
  const page = value as Partial<HostSearchPage>;
  if (!Array.isArray(page.hits)) return null;
  if (typeof page.total !== 'number' || !Number.isFinite(page.total) || page.total < 0) return null;
  if (typeof page.hasMore !== 'boolean') return null;
  for (const hit of page.hits) {
    if (typeof hit !== 'object' || hit === null) return null;
    const h = hit as Partial<HostSearchHit>;
    if (typeof h.id !== 'string' || typeof h.label !== 'string') return null;
  }
  return page as HostSearchPage;
}

/**
 * Organisations whose whole ancestor chain is open.
 *
 * `collapsed` on an organisation hides its **children**, not itself, so an org
 * is open when no ancestor above it is collapsed. The guard set matters:
 * `parentOrgId` is host data and a cycle in it would otherwise spin forever
 * (T97 row 10).
 */
function expandedOrgIds(organizations: readonly DiagramOrganization[]): Set<string> {
  const byId = new Map(organizations.map((o) => [o.id, o]));
  const open = new Set<string>();
  for (const org of organizations) {
    let cursor = org.parentOrgId;
    let visible = true;
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor);
      const parent = byId.get(cursor);
      // A parent that does not exist makes this org a root rather than an
      // orphan to hide — the reading `revealOrgPath` already takes.
      if (!parent) break;
      if (parent.collapsed) {
        visible = false;
        break;
      }
      cursor = parent.parentOrgId;
    }
    if (visible) open.add(org.id);
  }
  return open;
}

export class OrgHierarchyDiagram {
  private readonly dataStore = new DataStore();
  private host: PixiHost | null = null;
  /** What the host asked for, kept verbatim for the diagnostic line. */
  private rendererPreference: RendererKindPreference = 'auto';
  /** Set only when the host asked for an engine we do not know (T83). */
  private rendererDiagnostic: string | null = null;
  private stylesPartial: NodeThemeOverrides | undefined;
  private nodeTheme = mergeTheme();
  private renderConfig: RenderConfig = { ...defaultRenderConfig };
  private useWorker = true;
  private workerFactory: () => Worker = createTransformWorker;
  private workerPool: WorkerPool | null = null;
  private lastRenderFailure: RenderFailure | null = null;
  /**
   * The data the last successful frame drew — the only state known to be on
   * screen, and therefore the only honest target for a rollback (T104).
   *
   * Not `before` captured per call: two mutators in flight capture snapshots
   * that already contain each other's edits, so restoring "mine" in `catch`
   * order leaves the earlier edit applied and undrawn.
   */
  private lastDrawnData: DiagramData | null = null;
  /** Bumped per `searchAll` so a late answer can tell it is late. */
  private searchEpoch = 0;
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

  // The viewport notifier is deliberately separate from `promoteSync`: that one
  // has no transform to hand out and also fires from selection and from the end
  // of a render, so a host subscribed to it would recompute its window on every
  // click. This one carries the transform and fires only for the two things that
  // change what is visible.
  private viewportSettleMs = 150;
  private viewportPending: { t: ViewportTransform; reason: ViewportChangeReason } | null = null;
  private viewportFrame: number | null = null;
  private viewportSettleTimer: ReturnType<typeof setTimeout> | null = null;
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

    // Before the first render, not after it. `revealPath` and `setOrgsCollapsed`
    // can do this from outside, but only once a frame already exists — the user
    // would see the host's collapsed state, then a jump. T97 row 12 forbids that
    // intermediate frame, and the only place without one is here.
    //
    // Opt-in: a host that ships its own `collapsed` and asks for nothing keeps
    // it. The demo's flat-orgs marks every organisation collapsed, and quietly
    // overriding that would change a scene that works today (T97 Б2).
    let initialReveal: InitialExpandResult | null = null;
    if (config.initialExpand) {
      const { rootOrgId, revealNodeId } = config.initialExpand;
      let organizations = applyInitialExpand(instance.data.organizations, rootOrgId);

      if (revealNodeId) {
        // The target may be a person or a position; both live in an org, and
        // that org is what has to be open for the card to exist.
        const targetOrgId = resolveOrganizationIdForNode(
          { ...instance.data, organizations },
          revealNodeId,
        );
        if (targetOrgId) {
          // Union, not replacement: the minimum stays and the path is added, so
          // a target inside the minimum changes nothing (row 13).
          organizations = revealOrgPath(organizations, targetOrgId);
          initialReveal = { revealedOrgId: targetOrgId };
        } else {
          // A link can outlive the data it pointed at. Keeping the minimum and
          // naming the reason beats an empty screen or a throw.
          initialReveal = {
            revealedOrgId: null,
            reason: `initialExpand.revealNodeId «${revealNodeId}» is not in this data`,
          };
        }
      }
      instance.data = { ...instance.data, organizations };
    }
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
    instance.viewportSettleMs = config.viewportSettleMs ?? 150;
    instance.host.setOnViewportChange((t) => {
      instance.onViewportTransform(t.scale);
      instance.notifyPromoteSync();
      instance.notifyViewportChange(t, 'camera');
    });
    // A resize changes how much of the scene fits without moving the camera, so
    // it changes the answer to "which nodes are visible" — and nothing else
    // would tell the promote layer that.
    instance.host.setOnResize(() => {
      instance.notifyPromoteSync();
      // The transform is unchanged by design — only how much of it fits is.
      instance.notifyViewportChange(instance.getViewport(), 'resize');
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

    // Camera after the frame: a node has no box until it is laid out, which is
    // why `revealPath` renders before it focuses. Still inside `create()`, so
    // nothing of the host's can interleave — it has no reference yet.
    if (initialReveal?.revealedOrgId && config.initialExpand?.revealNodeId) {
      await instance.focusNode(config.initialExpand.revealNodeId);
    }
    if (initialReveal) instance.callbacks.onInitialExpand?.(initialReveal);

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

  /**
   * Coalesce viewport events to one call per frame, then one settled call.
   *
   * `PixiHost.setOnViewportChange` passes every `Viewport.apply` straight
   * through — it coalesces the *paint*, not the handler — so without this a pan
   * would call the host once per pointermove.
   */
  private notifyViewportChange(t: ViewportTransform, reason: ViewportChangeReason): void {
    if (this.destroyed || !this.callbacks.onViewportChange) return;
    this.viewportPending = { t, reason };
    if (this.viewportSettleTimer !== null) clearTimeout(this.viewportSettleTimer);
    this.viewportSettleTimer = setTimeout(() => {
      this.viewportSettleTimer = null;
      const pending = this.viewportPending;
      if (this.destroyed || !pending) return;
      this.callbacks.onViewportChange?.(pending.t, { settled: true, reason: pending.reason });
    }, this.viewportSettleMs);
    if (this.viewportFrame !== null) return;
    this.viewportFrame = requestAnimationFrame(() => {
      this.viewportFrame = null;
      const pending = this.viewportPending;
      if (this.destroyed || !pending) return;
      this.callbacks.onViewportChange?.(pending.t, { settled: false, reason: pending.reason });
    });
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
   * Apply a data edit, draw it, and only then tell the host.
   *
   * The order is the whole point (T104). Announcing before the frame let a
   * host act on an edit that a failed render then undid, and no second call
   * ever took it back — `onLayoutChange` carries a delta, and a delta cannot
   * be re-fired to cancel itself the way `revealPath` re-fires a state.
   *
   * Safe to key on our own failure only since the coalescer began answering
   * each caller about its own pass; before that, this `catch` could fire for
   * a frame that drew perfectly well.
   */
  private async commitDataChange(next: DiagramData, patch: LayoutPatch): Promise<void> {
    this.data = next;
    try {
      await this.render();
    } catch (err) {
      // Undo only what is still ours to undo. `this.data !== next` means a later
      // mutator wrote on top of us and its frame is what the screen will show —
      // restoring our target there would replace a drawn state with an older
      // one, which is the very divergence this method exists to prevent.
      //
      // And the target is read here, not at entry: at entry it would be this
      // caller's private snapshot, which by now may predate a neighbour's frame.
      if (this.data === next && this.lastDrawnData) this.data = this.lastDrawnData;
      throw err;
    }
    if (this.lastDrawnData !== next) {
      // Our frame resolved, but the state on screen is not ours. Either a
      // neighbour's rollback took our edit with it, or nothing drew at all
      // (unmounted, destroyed, stopped) — and in every one of those cases
      // announcing the patch would claim something the diagram cannot show.
      throw new Error(
        `OrgHierarchyDiagram: '${patch.type}' never reached the screen and was not applied`,
      );
    }
    this.callbacks.onLayoutChange?.(patch);
  }

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
    // Rebound on every render, because a drop changes the report lines the
    // answer depends on — and every drop is followed by a render. The id set is
    // built here rather than inside the closure so a drag that sweeps across
    // the wall does not rebuild it once per target.
    const knownPositionIds = new Set(this.data.positions.map((p) => p.id));
    const reportLinesNow = this.data.reportLines;
    host.renderer.canReparent = (positionId, managerId) =>
      canReparent(reportLinesNow, positionId, managerId, knownPositionIds);
    // Captured before the await, because that is the state the renderer is
    // handed. Reading `this.data` afterwards would record whatever a mutator
    // wrote *during* the frame — a state nobody drew (T104 review).
    const drawing = this.data;
    await this.reportIfRenderFails(
      host.renderer.render(drawing, this.nodeTheme, resolved, this.renderConfig, {
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
      onPersonReparent: (positionId, managerId) => {
        void this.reparentPosition(positionId, managerId);
      },
      }),
      drawing,
    );
    // The scene changed; nothing paints on its own any more (T84).
    host.requestPaint();
    if (this.destroyed || !this.host) return;
    this.callbacks.onLayoutDiagnostics?.(this.getLayoutDiagnostics());
    this.notifyPromoteSync();
    this.prefetchConfiguredMedia();
  }

  /**
   * Report a render that produced no frame, then let the failure through.
   *
   * A channel of its own, separate from `onLayoutDiagnostics`: diagnostics
   * explain a scene that *was* drawn, and this says there is no scene to
   * explain. Rethrown rather than swallowed — every caller that mutated state
   * before rendering needs to know whether to undo it, and making each of them
   * poll for that is how a diagram ends up describing a tree it never drew
   * (T97 defense; `revealPath` is the first caller that relies on it).
   */
  private async reportIfRenderFails(pending: Promise<void>, drawing: DiagramData): Promise<void> {
    try {
      await pending;
      this.lastRenderFailure = null;
      this.lastDrawnData = drawing;
    } catch (error) {
      const failure: RenderFailure = {
        reason: error instanceof Error ? error.message : String(error),
        cause: error,
      };
      this.lastRenderFailure = failure;
      this.callbacks.onRenderFailed?.(failure);
      throw error;
    }
  }

  /**
   * Why the last render drew nothing, or `null` when the last one worked.
   *
   * The callback fires once; this answers later — a host that logs on a timer,
   * or one that wants to know before acting, has no other way to ask.
   */
  getLastRenderFailure(): RenderFailure | null {
    return this.lastRenderFailure;
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

  /**
   * M4: preload alternate theme keys when host opts in via prefetchMediaThemeKeys.
   *
   * Only for what is **open**. This walked the whole dataset — every
   * organisation and every person, collapsed branches included — which is the
   * one place that ignored «images load for expanded organisations» (T97 §В3).
   *
   * Accepted consequence: prefetch exists to make a theme switch instant, so a
   * branch opened after the prefetch will flicker on the next switch. Not
   * fetching what nobody opened wins over that.
   */
  private prefetchConfiguredMedia(): void {
    if (!this.mediaService?.hasPrefetchThemes) return;
    // The two gates answer different questions and do not overlap: below
    // `farMax` a card draws no image at all (M6), so there is nothing worth
    // preloading — the LOD decides *whether any* image is wanted, expansion
    // decides *which* ones may load.
    if (this.viewState.lodLevel === 'far') return;

    const open = expandedOrgIds(this.data.organizations);
    for (const org of this.data.organizations) {
      if (!open.has(org.id)) continue;
      const media = org.media ?? resolveThemedMediaFromOrganization(org);
      this.mediaService.prefetch(media, media?.revision);
    }

    // A person is reachable only through a position, so an org nobody opened
    // takes its people with it.
    const openPeople = new Set<string>();
    for (const position of this.data.positions) {
      if (position.personId && open.has(position.organizationId)) {
        openPeople.add(position.personId);
      }
    }
    for (const person of this.data.persons) {
      if (!openPeople.has(person.id)) continue;
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
    await this.commitDataChange(
      { ...this.data, organizations: swapMatrixOrder(this.data.organizations, orgId, newIndex) },
      { type: 'matrix-reorder', orgId, newIndex },
    );
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
    await this.commitDataChange(
      { ...this.data, organizations: placement.organizations },
      { type: 'matrix-cell', orgId, row: cell.row, col: cell.col, ejectedOrgId },
    );
  }

  /**
   * A snapshot of the diagram's data — a **copy**, not the live object.
   *
   * It used to return `this.data` by reference, so a consumer could push into a
   * collection or flip a `collapsed` flag and desync the scene from its own
   * state: no search rebuild, no reseeded view state, no render, no callback
   * (structure audit §High). Everything is supposed to cross `setData` or a
   * mutator.
   *
   * A shallow copy would have been ~700× cheaper and would have stopped only
   * half of that — pushes and splices, but not a field on a node. That is the
   * kind of guard that reads as protection and is not, so the copy is deep.
   *
   * **Cost, measured:** ~7.6 ms at 4 000 seats, ~40 ms at 20 000. This is an
   * accessor a host calls deliberately, not a per-frame path — but a caller in a
   * loop should hold the result rather than ask again.
   */
  getData(): DiagramData {
    return structuredClone(this.data);
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

  /**
   * Search beyond the materialised window, when the host offers a way to.
   *
   * A separate method rather than a wider `search()`: «what is on screen» and
   * «what exists in the dataset» are different questions with different failure
   * modes. The first cannot fail; the second can be absent, slow, refused or
   * malformed, and folding them together would make every existing caller carry
   * an error surface it has no use for.
   *
   * With no `searchBeyondWindow` callback this is `search()` plus a count —
   * which is the whole of acceptance row 17.
   */
  async searchAll(query: string, page = 0): Promise<SearchAllResult> {
    if (this.destroyed) return { hits: [], total: 0, hasMore: false, source: 'window' };

    const local = await this.searchService.query(query);
    if (this.destroyed) return { hits: [], total: 0, hasMore: false, source: 'window' };

    const beyond = this.callbacks.searchBeyondWindow;
    if (!beyond) {
      return { hits: local, total: local.length, hasMore: false, source: 'window' };
    }

    // «Last wins». A slow answer that lands after a newer query has been asked
    // describes a question nobody is waiting for any more, and rendering it
    // would show results for text the user has already replaced.
    const epoch = (this.searchEpoch += 1);
    const stale = (): boolean => this.destroyed || epoch !== this.searchEpoch;

    let answer: unknown;
    try {
      answer = await beyond(query, page);
    } catch (error) {
      if (stale()) return { hits: local, total: local.length, hasMore: false, source: 'window' };
      return {
        hits: local,
        total: local.length,
        hasMore: false,
        source: 'window',
        // Named, not swallowed: local hits are still worth showing, and the
        // caller has to be able to say the rest of the dataset went unsearched.
        unavailable: error instanceof Error ? error.message : String(error),
      };
    }

    // The check goes *after* the await as well as before it. `destroy()` during
    // an in-flight callback is the case a check on entry cannot see.
    if (stale()) return { hits: local, total: local.length, hasMore: false, source: 'window' };

    const parsed = parseHostSearchPage(answer);
    if (!parsed) {
      return {
        hits: local,
        total: local.length,
        hasMore: false,
        source: 'window',
        // A malformed payload is a broken host, and a broken host is not an
        // empty dataset. Reporting «no matches» here would put the host's bug
        // in the user's mouth.
        unavailable: 'searchBeyondWindow returned a malformed page',
      };
    }

    const unresolved: string[] = [];
    const hits: SearchResult[] = [];
    for (const hit of parsed.hits) {
      const ref = resolveNodeRefInData(this.data, hit.id);
      if (!ref) {
        // Not dropped silently: an id the scene cannot resolve is a hit the user
        // will click and nothing will happen, so the caller is told which.
        unresolved.push(hit.id);
        continue;
      }
      hits.push({ node: ref, label: hit.label, score: 1 });
    }

    return {
      hits,
      beyond: [...parsed.hits],
      total: parsed.total,
      hasMore: parsed.hasMore,
      source: 'host',
      ...(unresolved.length > 0 ? { unresolved } : {}),
    };
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
    // A destroyed diagram has nothing to reveal a path into, and `search()`
    // already answers that way (`:881`).
    if (this.destroyed) return false;

    const orgId = resolveOrganizationIdForNode(this.data, nodeId);
    if (!orgId) return false;
    const organizations = revealOrgPath(this.data.organizations, orgId);
    if (organizations !== this.data.organizations) {
      // The node box only exists after the reveal is laid out — focusing before
      // the render silently skipped the pan for anything under a collapsed org.
      const previous = this.data;
      this.data = { ...this.data, organizations };
      this.callbacks.onOrgModeChange?.(this.getOrgMode());
      try {
        await this.render();
      } catch (error) {
        // Rolled back rather than left half-applied. The data said «expanded»
        // and the scene did not, so the next caller read a tree that was never
        // drawn — and `getOrgMode()` had already been told about it. Same shape
        // as the staff window's rebuild, which advertises optimistically and
        // undoes it here (T88 report §20).
        this.data = previous;
        this.callbacks.onOrgModeChange?.(this.getOrgMode());
        throw error;
      }
      // After the await as well as before it: `destroy()` during a reveal is
      // the case an entry check cannot see. Nothing downstream crashes today
      // because each call gates itself on `this.host`, but that is a
      // coincidence of the current call chain rather than a guarantee.
      if (this.destroyed) return false;
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
   * Frame geometry of a node kind in world units, for callers that draw a
   * replacement for a Pixi node and need it to line up.
   */
  getPromoteChrome(kind: 'organization' | 'person' | 'position'): PromoteChrome {
    const style =
      kind === 'organization' ? this.nodeTheme.organization : this.nodeTheme.person;
    const chrome: PromoteChrome = {
      borderRadius: style.borderRadius,
      borderWidth: style.borderWidth,
    };
    if (kind === 'organization') {
      const org = this.nodeTheme.organization;
      if (org.bodyPaddingX !== undefined) chrome.paddingX = org.bodyPaddingX;
      if (org.bodyPaddingY !== undefined) chrome.paddingY = org.bodyPaddingY;
    }
    return chrome;
  }

  /** Surface size from the host's ResizeObserver — see {@link PixiHost.getScreenSize}. */
  getScreenSize(): { width: number; height: number } {
    return this.host?.getScreenSize() ?? { width: 0, height: 0 };
  }

  /**
   * Node rectangles with no data resolution — the cheap half of
   * {@link OrgHierarchyDiagram.listPromoteCandidates}. Promote callers filter on
   * these first and resolve only what survives, because resolving a box walks
   * the data arrays several times over while reading its rectangle costs
   * nothing (`work/reports/promote-near/report.md` §2.3).
   */
  listPromoteBoxes(): readonly NodeWorldBox[] {
    return this.renderer?.listNodeBoxes() ?? [];
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

  /**
   * Which nodes Pixi is currently **not** drawing because HTML replaced them.
   *
   * The complement of this set is what the canvas owns, so it is the only way to
   * ask "did that node go back to being drawn?" from outside — the DOM alone
   * cannot answer it, since an absent card and a hidden node look the same.
   */
  getPromotedNodeIds(): readonly string[] {
    return this.renderer?.getPromotedNodeIds() ?? [];
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

  /**
   * Make `positionId` report to `managerId`, then say so.
   *
   * Applies here rather than asking the host first, matching
   * {@link movePersonToCell}: one contract for edits made on the canvas, and no
   * window in which the card has been dropped but the diagram still draws the
   * old line. A host that wants the last word has `onLayoutChange` and can send
   * its own `setData`.
   *
   * The rollback mirrors `revealPath` (T97): if the render that follows draws
   * nothing, the data goes back to what it described, because a diagram that
   * reports a reporting line it never drew is worse than one that refused.
   */
  async reparentPosition(positionId: string, managerId: string): Promise<void> {
    const knownIds = new Set(this.data.positions.map((p) => p.id));
    const fromManagerId = adminParentsOf(this.data.reportLines).get(positionId) ?? null;
    let reportLines: DiagramReportLine[];
    try {
      reportLines = reparentPosition(this.data.reportLines, positionId, managerId, knownIds);
    } catch (err) {
      // A refused drop is an ordinary outcome of the gesture, not a fault: the
      // preview already told the user, and there is nothing to redraw.
      if (err instanceof InteractionError) return;
      throw err;
    }
    await this.commitDataChange(
      { ...this.data, reportLines },
      { type: 'position-reparent', positionId, fromManagerId, toManagerId: managerId },
    );
  }

  async movePersonToCell(positionId: string, col: number, row: number): Promise<void> {
    let positions;
    try {
      positions = movePositionToCell(this.data.positions, positionId, col, row);
    } catch (err) {
      if (err instanceof InteractionError) {
        // A refused move is an ordinary outcome: redraw what is already true
        // and say nothing, because nothing changed.
        await this.render();
        return;
      }
      throw err;
    }
    await this.commitDataChange(
      { ...this.data, positions },
      { type: 'position-move', positionId, col, row },
    );
  }

  async shiftBlock(seedPositionId: string, deltaLevel: number): Promise<void> {
    const { positions, positionIds } = shiftPositionBlock(
      this.data.positions,
      seedPositionId,
      deltaLevel,
    );
    await this.commitDataChange(
      { ...this.data, positions },
      { type: 'block-shift', positionIds, deltaLevel },
    );
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
    if (this.viewportFrame !== null) cancelAnimationFrame(this.viewportFrame);
    if (this.viewportSettleTimer !== null) clearTimeout(this.viewportSettleTimer);
    this.viewportFrame = null;
    this.viewportSettleTimer = null;
    this.viewportPending = null;
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
