import type { OrgHierarchyCallbacks, OrgHierarchyConfig, PromoteMode } from '@org-hierarchy/sdk';
import {
  OrgHierarchyDiagram,
  mapFlatRowsInPool,
  mapArrayItems,
  recommendWorkerPoolSize,
  type DiagramData,
  type FlatDiagramRow,
} from '@org-hierarchy/sdk';
import {
  createReactContextMenuHost,
  DefaultReactContextMenu,
  createReactPromoteOverlay,
  createTestAnchorOverlay,
  DefaultPromoteCard,
  type ReactContextMenuHost,
  type ReactPromoteOverlay,
  type TestAnchorOverlay,
  type PromoteSlotProps,
} from '@org-hierarchy/sdk/react';
import { createElement } from 'react';
import { buildFlatOrgsData } from '../scenarios/flatOrgs.js';
import {
  SCALE_ORG_TOTAL,
  SCALE_ORG_WINDOW,
  buildScaleOrgsWindow,
  buildScaleParentIndex,
  parseScaleOrgQuery,
  type ScaleOrgsWindow,
} from '../scenarios/scaleOrgs.js';
import {
  buildScaleStaffWindow,
  CURRENT_SEATS,
  STAFF_SCALE_COLS,
  LEAD_SEATS,
  parseScaleStaffQuery,
  STAFF_SCALE_DEFAULT_FOCUS,
  STAFF_SCALE_TOTAL,
  STAFF_SCALE_WINDOW,
  type ScaleStaffWindow,
} from '../scenarios/scaleStaff.js';
import {
  RebuildScheduler,
  rebaseViewport,
  resolveWindowRange,
  type WallGeometry,
} from './viewportWindow.js';

/**
 * Screens of materialized seats kept beyond each visible edge.
 *
 * One screen either side is the starting point, not a measured answer — T88.8
 * is where it gets a number. Named here so the measurement has one knob to turn
 * rather than a constant buried in a call site.
 */
const STAFF_RESERVE_SCREENS = 1;

/** Quiet period before the window is rebuilt, in ms. */
const STAFF_REBUILD_QUIET_MS = 120;
import { SAMPLE_MAPPER_JSON } from '../scenarios/sampleMapper.js';
import { parseJsonFile } from '../utils/json.js';
import { requireElement, setThemeAttribute, showError } from '../utils/dom.js';
import {
  ALL_MOCKUP_TABS,
  FIGMA_MOCKUP_TABS,
  GOJS_MOCKUP_TABS,
  MOCKUP_FIT_MIN_SCALE,
  ORG_TREE_TABS,
  TAB_META,
  isDemoTab,
  type ContourControls,
  type DemoTab,
} from './tabs.js';
import { buildTabConfig } from './tabConfigs.js';
import { captionForTab } from './captions.js';
import { installDemoE2eBridge, type DemoE2eBridge } from './e2eBridge.js';

export type { DemoE2eBridge };

export type { ContourControls, DemoTab };

/**
 * Why the staff window is being rebuilt.
 *
 * The two are not the same move and must not be collapsed into one number: a
 * slide is given a range and keeps the content under the cursor still, a jump
 * is given a point and takes the camera to it. They share a scheduler because
 * they share the one thing that must not overlap — `setData`.
 */
type StaffRebuild = { kind: 'slide'; start: number } | { kind: 'jump'; focusIndex: number };

export class App {
  private diagram: OrgHierarchyDiagram | null = null;
  private tab: DemoTab = 'variant-b';
  private theme: 'light' | 'dark' = 'light';
  private contourControls: ContourControls = { paddingCells: 1, smoothIterations: 2 };
  private flatOrgsData = buildFlatOrgsData(24);
  /** Set once the user loads rows on the Mapper tab; cleared when they leave it. */
  private mapperData: DiagramData | null = null;
  private scaleParents: Int32Array | null = null;
  private scaleWindow: ScaleOrgsWindow | null = null;
  private staffScaleWindow: ScaleStaffWindow | null = null;

  private staffScheduler: RebuildScheduler<StaffRebuild> | null = null;
  private contextMenu: ReactContextMenuHost | null = null;
  private promote: ReactPromoteOverlay | null = null;
  private testAnchors: TestAnchorOverlay | null = null;
  private readonly e2eMode =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');
  /** `?renderer=canvas|webgl|auto` — lets e2e pin the engine the way a host would. */
  private readonly rendererParam =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('renderer');
  private readonly promoteMode: PromoteMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('promote') === 'near-visible'
      ? 'near-visible'
      : 'near-selection';

  private readonly mountEl: HTMLElement;
  private readonly statusEl: HTMLElement;

  constructor() {
    this.mountEl = requireElement('diagram-mount');
    this.statusEl = requireElement('status');
  }

  async init(): Promise<void> {
    this.contextMenu = createReactContextMenuHost({
      component: DefaultReactContextMenu,
      onAction: (item, request) => {
        void this.diagram?.runContextMenuAction(item.id, request);
        const label =
          request.node.person?.fullName ??
          request.node.organization?.name ??
          request.node.ref.id;
        this.setStatus(`menu · ${item.id} · ${label}`);
      },
    });
    this.bindToolbar();
    await this.loadTab('variant-b');
    this.setStatus('Ready');
  }

  private bindToolbar(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (!isDemoTab(tab)) {
          this.setStatus(`Unknown tab in markup: ${tab ?? '(empty)'}`);
          return;
        }
        void this.loadTab(tab);
      });
    });

    requireElement('theme-toggle').addEventListener('click', () => {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      setThemeAttribute(this.theme);
      this.syncThemeToggleLabel();
      void this.reload();
    });

    requireElement('collapse-all').addEventListener('click', () => {
      if (ORG_TREE_TABS.has(this.tab)) void this.diagram?.collapseAllOrgs();
    });

    requireElement('export-png').addEventListener('click', () => {
      void this.downloadExport('png');
    });
    requireElement('export-svg').addEventListener('click', () => {
      void this.downloadExport('svg');
    });
    requireElement('export-pdf').addEventListener('click', () => {
      void this.downloadExport('pdf');
    });
    requireElement('export-print').addEventListener('click', () => {
      void this.diagram?.print({ scope: 'full' });
    });

    const search = requireElement('search-input') as HTMLInputElement;
    let searchTimer: ReturnType<typeof setTimeout> | undefined;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        void this.runSearch(search.value);
      }, 150);
    });

    const padding = requireElement('padding-slider') as HTMLInputElement;
    const smooth = requireElement('smooth-slider') as HTMLInputElement;
    padding.addEventListener('input', () => {
      this.contourControls.paddingCells = Number(padding.value);
      this.syncContourControlLabels();
      if (TAB_META[this.tab].reloadsOnContourSlider) void this.reload();
    });
    smooth.addEventListener('input', () => {
      this.contourControls.smoothIterations = Number(smooth.value);
      this.syncContourControlLabels();
      if (TAB_META[this.tab].reloadsOnContourSlider) void this.reload();
    });

    requireElement('json-file').addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) void this.loadMapperFile(file);
      input.value = '';
    });

    requireElement('load-sample-json').addEventListener('click', () => {
      void this.loadMapperJson(SAMPLE_MAPPER_JSON);
    });

    requireElement('run-worker-bench').addEventListener('click', () => {
      void this.runWorkerBench();
    });

    this.syncThemeToggleLabel();
    this.syncContourControlsEnabled();
    this.syncContourControlLabels();
  }

  private async loadTab(tab: DemoTab): Promise<void> {
    // Leaving the Mapper tab drops what the user loaded — coming back should
    // show the sample again, not a stale scene.
    if (tab !== 'mapper') this.mapperData = null;
    this.tab = tab;
    document.querySelectorAll('[data-tab]').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.tab === tab);
    });
    document.body.dataset.activeTab = tab;
    // Style mockups pin theme: Figma = dark, GoJS = dark (production default).
    if (FIGMA_MOCKUP_TABS.has(tab) || GOJS_MOCKUP_TABS.has(tab)) {
      this.theme = 'dark';
      setThemeAttribute('dark');
      this.syncThemeToggleLabel();
    }
    const search = requireElement('search-input') as HTMLInputElement;
    search.value = '';
    this.syncContourControlsEnabled();
    if (tab === 'scale-100k') {
      this.ensureScaleWindow(this.scaleWindow?.focusIndex ?? 1);
    }
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.disposeDiagram();
    const config = this.buildConfig();
    try {
      this.setStatus('Loading…');
      this.diagram = await OrgHierarchyDiagram.create(this.mountEl, {
        ...config,
        // Forwarded unvalidated on purpose: the demo stands in for an untyped
        // host here, and the SDK owns normalising anything it does not know
        // (resolveRendererPreference) — validating twice would hide that path.
        ...(this.rendererParam
          ? { renderer: this.rendererParam as OrgHierarchyConfig['renderer'] }
          : {}),
        callbacks: this.diagramCallbacks(),
      });
      this.staffScheduler = new RebuildScheduler<StaffRebuild>(
        (request) =>
          request.kind === 'slide'
            ? this.slideStaffWindow(request.start)
            : this.jumpStaffWindow(request.focusIndex),
        STAFF_REBUILD_QUIET_MS,
        (error) => {
          // The scene keeps the window it already has — the failure is named,
          // not painted as an empty edge that looks like a broken diagram.
          const msg = error instanceof Error ? error.message : String(error);
          this.setStatus(`staff · window unchanged · rebuild failed: ${msg}`);
        },
      );
      this.mountOverlays(this.diagram);
      this.mountZoomFab();
      this.mountBulkBar();
      this.setStatus(this.readyStatus());
      this.fitDiagramView();
      this.setStatus(`${this.tabLabel()} · zoom ${this.diagram.getZoom().toFixed(2)}`);
      this.mountSceneCaption();
      if (this.tab === 'staff-1m' && this.staffScaleWindow) {
        this.syncStaffWindowMarker(this.staffScaleWindow);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(this.mountEl, msg);
      this.setStatus(`Error: ${msg}`);
    }
  }

  /** Drop the live diagram and everything mounted around it. */
  private disposeDiagram(): void {
    this.staffScheduler?.stop();
    this.staffScheduler = null;
    this.promote?.dispose();
    this.promote = null;
    this.testAnchors?.dispose();
    this.testAnchors = null;
    this.diagram?.destroy();
    this.diagram = null;
    this.mountEl.innerHTML = '';
    this.mountEl.removeAttribute('data-testid');
  }

  private diagramCallbacks(): OrgHierarchyCallbacks {
    return {
      onViewportChange: (_transform, meta) => {
        // Only on settled: rebuilding mid-gesture is what the reserve exists to
        // avoid. A resize counts as settled work too — it changes how much fits
        // without moving the camera, so nothing else would notice the new edge.
        if (!meta.settled || this.tab !== 'staff-1m') return;
        const win = this.staffScaleWindow;
        const diagram = this.diagram;
        if (!win || !diagram) return;
        const range = resolveWindowRange(
          {
            screen: diagram.getScreenSize(),
            viewport: diagram.getViewport(),
            reserveScreens: STAFF_RESERVE_SCREENS,
            wallBase: win.wallBase,
          },
          this.staffWallGeometry(),
        );
        if (range.start === win.startIndex) return;
        this.staffScheduler?.request({ kind: 'slide', start: range.start });
      },
      onSelectionChange: (nodes) => {
        this.setStatus(
          nodes.length === 0
            ? `${this.tab} · 0 selected`
            : `selection · ${nodes.length} selected`,
        );
        this.syncBulkBar(nodes);
      },
      onNodeClick: (node) => {
        this.contextMenu?.close();
        if (node.kind === 'organization' && ORG_TREE_TABS.has(this.tab)) {
          this.handleOrgNodeClick(node.id);
          return;
        }
        if (this.tab === 'staff-tree') {
          const focus = this.diagram?.getStaffFocus() ?? 'ops';
          const expanded = this.diagram?.getStaffExpandedOrgIds() ?? [];
          const exp = expanded.length > 0 ? ` · expanded ${expanded.join(',')}` : '';
          const n = this.diagram?.getSelections().length ?? 0;
          this.setStatus(
            `staff-tree · focus ${focus}${exp} · click ${node.kind}:${node.id} · ${n} selected`,
          );
        }
      },
      onNodeDoubleClick: (node) => {
        this.contextMenu?.close();
        const label =
          node.kind === 'organization'
            ? `org:${node.id}`
            : node.kind === 'person'
              ? `person:${node.id}`
              : `${node.kind}:${node.id}`;
        // Host should open sidebar here (GoJS prod emitted but never subscribed — dead wire).
        this.setStatus(`dblclick ${label} · host opens sidebar`);
      },
      onContextMenu: (request) => {
        // 100k: no expand/collapse on nodes — tree↔matrix via focus path / Collapse all.
        if (this.tab === 'scale-100k') {
          request.items = request.items.filter((i) => i.id !== 'expand' && i.id !== 'collapse');
        }
        this.contextMenu?.handleContextMenu(request);
        const label =
          request.node.person?.fullName ??
          request.node.organization?.name ??
          request.node.position?.title ??
          request.node.ref.id;
        this.setStatus(`context · ${request.node.ref.kind} · ${label}`);
      },
      onOrgModeChange: (mode) => {
        if (this.tab === 'scale-100k' && this.scaleWindow) {
          this.setStatus(this.scaleWindowStatus(mode));
          return;
        }
        this.setStatus(`${this.tab} · ${mode} · ${this.theme}`);
      },
      onLayoutDiagnostics: (messages) => {
        // The `Renderer: …` line is always present (T83) and is not a warning.
        // Toasting it would bury every real warning behind a "+N".
        const warnings = messages.filter((m) => !m.startsWith('Renderer: '));
        if (warnings.length === 0) return;
        this.showToast(
          `Layout: ${warnings[0]}${warnings.length > 1 ? ` (+${warnings.length - 1})` : ''}`,
        );
      },
    };
  }

  /** Promote overlay always; test anchors + the e2e bridge only in `?e2e=1`. */
  private mountOverlays(diagram: OrgHierarchyDiagram): void {
    this.promote = createReactPromoteOverlay({
      diagram,
      mount: this.mountEl,
      // Opt-in, like `?renderer=`: the default stays the selection card so the
      // existing behaviour — and the e2e that pins it — keeps its meaning.
      mode: this.promoteMode,
      component:
        this.promoteMode === 'near-visible' ? DemoContentModesCard : DemoPromoteCard,
    });
    if (!this.e2eMode) return;
    this.testAnchors = createTestAnchorOverlay({
      diagram,
      mount: this.mountEl,
      interactive: true,
    });
    this.mountEl.setAttribute('data-testid', 'diagram-ready');
    installDemoE2eBridge({
      diagram,
      clickOrg: (orgId) => this.handleOrgNodeClick(orgId),
      scaleWindowStart: () => this.scaleWindow?.startIndex ?? null,
      config: () => this.buildConfig(),
    });
  }

  private scaleWindowStatus(mode: string): string {
    const w = this.scaleWindow;
    if (!w) return `100k orgs · ${mode}`;
    const uk = (n: number) => n.toLocaleString('uk-UA');
    return `100k orgs · ${mode} · window ${uk(w.windowSize)} of ${uk(w.total)} · focus org-${w.focusIndex}`;
  }

  /** First status line after a tab mounts — what this scene wants you to try. */
  private readyStatus(): string {
    switch (this.tab) {
      case 'staff-tree':
        return `Staff tree · focus ${this.diagram?.getStaffFocus() ?? 'ops'}`;
      case 'scale-100k':
        return this.scaleWindowStatus(this.diagram?.getOrgMode() ?? 'row-tree');
      case 'variant-b':
        return `Variant B · padding ${this.contourControls.paddingCells} · smooth ${this.contourControls.smoothIterations}`;
      case 'worker':
        return 'Worker bench · open sidebar to run pooled map';
      case 'mapper':
        return 'Mapper · load sample JSON or upload a file';
      default:
        return `${this.tabLabel()} · zoom ${this.diagram?.getZoom().toFixed(2) ?? '—'}`;
    }
  }

  private fitDiagramView(motion: { animate?: boolean } = { animate: false }): boolean {
    if (!this.diagram) return false;
    const minScale = ALL_MOCKUP_TABS.has(this.tab) ? MOCKUP_FIT_MIN_SCALE : undefined;
    return this.diagram.fitView(28, { ...motion, minScale });
  }

  /** E2e: layout staff canvas edges for current tab config (mockup staff tabs). */
  private zoomDiagram(factor: number): void {
    this.diagram?.zoomBy(factor);
    this.setStatus(`${this.tab} · zoom ${this.diagram?.getZoom().toFixed(2) ?? '—'}`);
  }

  /**
   * Bulk action bar for multi-select (Shift/Ctrl+click). Hidden for 0–1 nodes;
   * the same actions are in the node context menu (`bulk-*` item ids).
   */
  private syncBulkBar(nodes: readonly { kind: string; id: string }[]): void {
    const bar = this.mountEl.querySelector<HTMLElement>('.bulk-bar');
    if (!bar) return;
    const many = nodes.length > 1;
    bar.hidden = !many;
    if (!many) return;
    const kinds = new Set(nodes.map((n) => n.kind));
    const kindLabel = kinds.size === 1 ? ` · ${[...kinds][0]}` : '';
    const count = bar.querySelector<HTMLElement>('[data-bulk="count"]');
    if (count) count.textContent = `${nodes.length} selected${kindLabel}`;
    // Collapse only makes sense for an organization-only set.
    const orgsOnly = nodes.every((n) => n.kind === 'organization');
    bar.querySelector<HTMLElement>('[data-bulk="collapse"]')?.toggleAttribute('hidden', !orgsOnly);
  }

  private mountBulkBar(): void {
    this.mountEl.querySelectorAll('.bulk-bar').forEach((el) => el.remove());
    const bar = document.createElement('div');
    bar.className = 'bulk-bar';
    bar.hidden = true;
    bar.setAttribute('data-testid', 'bulk-bar');
    bar.innerHTML =
      '<span data-bulk="count">0 selected</span>' +
      '<button type="button" data-bulk="collapse" hidden>Collapse</button>' +
      '<button type="button" data-bulk="copy">Copy ids</button>' +
      '<button type="button" data-bulk="clear">Clear</button>';
    bar.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).closest('button[data-bulk]')?.getAttribute('data-bulk');
      if (!action) return;
      const nodes = this.diagram?.getSelections() ?? [];
      if (action === 'copy') {
        const ids = nodes.map((n) => `${n.kind}:${n.id}`).join(' ');
        void navigator.clipboard?.writeText(ids);
        this.showToast(`Copied ${nodes.length} ids`);
        return;
      }
      if (action === 'collapse') {
        const orgIds = nodes.filter((n) => n.kind === 'organization').map((n) => n.id);
        void this.diagram?.setOrgsCollapsed(orgIds, true);
        this.showToast(`Collapsed ${orgIds.length} organizations`);
        return;
      }
      if (action === 'clear') void this.diagram?.clearSelection();
    });
    this.mountEl.appendChild(bar);
  }

  /** On-diagram zoom controls (mobile-friendly; toolbar +/- can scroll off-screen). */
  private mountZoomFab(): void {
    const fab = document.createElement('div');
    fab.className = 'zoom-fab';
    fab.innerHTML =
      '<button type="button" data-zoom="out" title="Zoom out" aria-label="Zoom out">−</button>' +
      '<button type="button" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>' +
      '<button type="button" data-zoom="fit" title="Fit" aria-label="Fit view">Fit</button>';
    fab.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button[data-zoom]') as HTMLButtonElement | null;
      if (!btn) return;
      const action = btn.dataset.zoom;
      if (action === 'in') this.zoomDiagram(1.25);
      else if (action === 'out') this.zoomDiagram(0.8);
      else if (action === 'fit' && this.fitDiagramView({ animate: true })) {
        this.setStatus(`${this.tabLabel()} · fit · zoom ${this.diagram?.getZoom().toFixed(2) ?? '—'}`);
      }
    });
    this.mountEl.appendChild(fab);
  }

  private mountSceneCaption(): void {
    this.mountEl.querySelectorAll('.scene-caption').forEach((el) => el.remove());
    const text = captionForTab(this.tab, this.staffScaleWindow);
    if (!text) return;
    const caption = document.createElement('p');
    caption.className = 'scene-caption';
    caption.textContent = text;
    this.mountEl.appendChild(caption);
  }

  /** 1M staff address space — one window materialized around the focus seat. */
  private rebuildStaffScaleWindow(focusIndex = STAFF_SCALE_DEFAULT_FOCUS): ScaleStaffWindow {
    this.staffScaleWindow = buildScaleStaffWindow({ focusIndex });
    return this.staffScaleWindow;
  }

  /**
   * Staff · 1M wall geometry: refCellHeight 44 + verticalGap 28 (`tabConfigs.ts`).
   * Mirrored here rather than read back from the diagram because the window has
   * to be sized *before* anything is materialized to read it from.
   */
  private staffWallGeometry(): WallGeometry {
    return { cols: STAFF_SCALE_COLS, pitchY: 72, firstIndex: LEAD_SEATS, tierSeats: CURRENT_SEATS };
  }

  /**
   * Move the window to follow the camera, then move the camera back.
   *
   * Seat rows are relative to the wall base, so re-basing shifts every card by
   * whole rows; `rebaseViewport` undoes exactly that shift, which is what keeps
   * the content under the cursor still while the data underneath it changes.
   */
  private async slideStaffWindow(start: number): Promise<void> {
    const diagram = this.diagram;
    const previous = this.staffScaleWindow;
    if (!diagram || !previous || this.tab !== 'staff-1m') return;

    const geom = this.staffWallGeometry();
    const screen = diagram.getScreenSize();
    const size = resolveWindowRange(
      { screen, viewport: diagram.getViewport(), reserveScreens: STAFF_RESERVE_SCREENS, wallBase: previous.wallBase },
      geom,
    ).size;
    const next = buildScaleStaffWindow({ startIndex: start, windowSize: size });
    if (next.wallBase === previous.wallBase && next.startIndex === previous.startIndex) return;

    const rowShift = (next.wallBase - previous.wallBase) / geom.cols;
    // Advertised before the await and rolled back if it fails, rather than set
    // after. Both orders were tried: setting it afterwards leaves the camera
    // callback reading the *old* start for the length of the rebuild, so every
    // slide earns a second, redundant one — which is frames, and frames are
    // what T87's harness measures. Rolling back keeps the honest half: a
    // rejected rebuild must not leave the field describing a window that was
    // never materialized, or the next slide takes its `wallBase` from a scene
    // that does not exist while the status says nothing changed.
    this.staffScaleWindow = next;
    try {
      await diagram.setData(next.data);
    } catch (error) {
      this.staffScaleWindow = previous;
      throw error;
    }
    diagram.setViewport(rebaseViewport(diagram.getViewport(), { rowShift, pitchY: geom.pitchY }));
    this.mountSceneCaption();
    this.syncStaffWindowMarker(next);
    this.setStatus(this.staffWindowStatus(next));
  }

  /**
   * Take the window to a named seat without recreating the scene.
   *
   * The opposite of a slide in the one place that matters: `rebaseViewport`
   * exists to hold the content under the cursor still, which is exactly what
   * somebody who typed an index does *not* want. The camera is put on the seat
   * instead — and the canvas it moves over is the one that was already there,
   * which is the whole point of not going through `reload()`.
   */
  private async jumpStaffWindow(focusIndex: number): Promise<void> {
    const diagram = this.diagram;
    const previous = this.staffScaleWindow;
    if (!diagram || !previous || this.tab !== 'staff-1m') return;

    const geom = this.staffWallGeometry();
    const { span } = resolveWindowRange(
      {
        screen: diagram.getScreenSize(),
        viewport: diagram.getViewport(),
        reserveScreens: STAFF_RESERVE_SCREENS,
        wallBase: previous.wallBase,
      },
      geom,
    );
    // `span`, not `size`: if the camera is sitting at the end of tier 2 right
    // now, what the wall left over there is narrower than a screen, and the
    // window is about to be built somewhere with no edge to run into. A zero
    // span means the surface has not been measured yet — the default is the
    // only honest guess left.
    const next = buildScaleStaffWindow({ focusIndex, windowSize: span > 0 ? span : STAFF_SCALE_WINDOW });
    // See `slideStaffWindow` for why this is advertised first and rolled back.
    this.staffScaleWindow = next;
    try {
      await diagram.setData(next.data);
    } catch (error) {
      this.staffScaleWindow = previous;
      throw error;
    }

    // A seat outside tier 2 renders nothing to aim at, so the camera goes to the
    // start of the window that *was* materialized. Leaving it where it was would
    // point it at whatever the old window had at those coordinates — the reload
    // path hid that by refitting the whole scene.
    const target = next.focusMaterialized ? `pos-${focusIndex}` : `pos-${next.startIndex}`;
    const aimed = await diagram.focusNode(target);
    this.mountSceneCaption();
    this.syncStaffWindowMarker(next);
    // After the camera, not before: focusing selects the seat, and the selection
    // callback writes a status of its own.
    this.setStatus(this.staffJumpStatus(next, focusIndex, { target, aimed }));
  }

  /** What a jump has to say for itself, in the order the user cares about. */
  private staffJumpStatus(
    win: ScaleStaffWindow,
    focusIndex: number,
    camera: { target: string; aimed: boolean },
  ): string {
    if (!camera.aimed) {
      // The window moved either way — an unaimed camera is worth naming, not
      // worth pretending the jump failed.
      return `${this.staffWindowStatus(win)} · camera stayed: ${camera.target} is not in the scene`;
    }
    if (!win.focusMaterialized) {
      // The window only centres inside tier 2 — say so instead of leaving the
      // camera on a seat that is not the one that was asked for.
      return `search · pos-${focusIndex} is in the ${win.focusTier} tier · the window centres on the current org (pos-${LEAD_SEATS}…${LEAD_SEATS + win.composition.current - 1})`;
    }
    return this.staffWindowStatus(win);
  }

  /**
   * The observable the e2e waits on. Without it a test can only sleep on a
   * constant and hope the rebuild landed — the rebuild is debounced and async,
   * so there is otherwise nothing in the DOM that says it happened.
   */
  private staffWindowStatus(win: ScaleStaffWindow): string {
    return `staff · window ${win.startIndex}…${win.startIndex + win.windowSize} / ${win.total}`;
  }

  private syncStaffWindowMarker(win: ScaleStaffWindow): void {
    this.mountEl.dataset.windowStart = String(win.startIndex);
    this.mountEl.dataset.windowEnd = String(win.startIndex + win.windowSize);
  }

  private ensureScaleWindow(focusIndex = 0): ScaleOrgsWindow {
    if (!this.scaleParents) {
      this.scaleParents = buildScaleParentIndex(SCALE_ORG_TOTAL);
    }
    this.scaleWindow = buildScaleOrgsWindow({
      total: SCALE_ORG_TOTAL,
      windowSize: SCALE_ORG_WINDOW,
      focusIndex,
      parents: this.scaleParents,
    });
    return this.scaleWindow;
  }

  private buildConfig(): OrgHierarchyConfig<unknown> {
    return buildTabConfig(this.tab, {
      theme: this.theme,
      contourControls: this.contourControls,
      flatOrgsData: this.flatOrgsData,
      mapperData: this.mapperData,
      scaleOrgsWindow: () => this.scaleWindow ?? this.ensureScaleWindow(0),
      scaleStaffWindow: () => this.staffScaleWindow ?? this.rebuildStaffScaleWindow(),
    });
  }

  private async downloadExport(format: 'png' | 'svg' | 'pdf'): Promise<void> {
    if (!this.diagram) return;
    try {
      const result = await this.diagram.export({ format, scope: 'full' });
      if (format === 'svg') {
        const blob = new Blob([result as string], { type: 'image/svg+xml' });
        this.triggerDownload(blob, `org-diagram.${format}`);
      } else {
        this.triggerDownload(result as Blob, `org-diagram.${format}`);
      }
      this.setStatus(`export · ${format} ready`);
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : String(err));
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Flat orgs / 100k org card click — shared by Pixi host and e2e bridge. */
  private handleOrgNodeClick(orgId: string): void {
    if (this.tab === 'scale-100k') {
      const idx = Number(String(orgId).replace(/^org-/, ''));
      if (Number.isFinite(idx)) {
        const win = this.scaleWindow;
        const inWindow =
          win &&
          idx >= win.startIndex &&
          idx < win.startIndex + win.data.organizations.length;
        if (inWindow) {
          void this.diagram?.focusNode(orgId);
        } else {
          this.ensureScaleWindow(idx);
          void this.reload();
        }
      }
      return;
    }
    if (this.tab === 'flat-orgs') {
      const org = this.diagram?.getData().organizations.find((o) => o.id === orgId);
      if (org?.collapsed === false) {
        void this.diagram?.focusNode(orgId);
      } else {
        void this.diagram?.expandOrg(orgId);
      }
      return;
    }
    void this.diagram?.expandOrg(orgId);
  }

  private async runSearch(query: string): Promise<void> {
    if (!this.diagram) return;

    if (this.tab === 'scale-100k') {
      const idx = parseScaleOrgQuery(query, SCALE_ORG_TOTAL);
      if (!query.trim()) {
        this.setStatus(`100k · focus ${this.scaleWindow?.focusIndex ?? 0}`);
        return;
      }
      if (idx === null) {
        this.setStatus(`search · try org-12345 (0…${SCALE_ORG_TOTAL - 1})`);
        return;
      }
      this.ensureScaleWindow(idx);
      await this.reload();
      return;
    }

    if (this.tab === 'staff-1m') {
      const index = parseScaleStaffQuery(query, STAFF_SCALE_TOTAL);
      if (index === null) {
        const local = await this.diagram.search(query);
        this.setStatus(
          local.length > 0
            ? `search · ${local.length} hits in the current window · try pos-500000 to move it`
            : `search · not in the window · try pos-N (0…${STAFF_SCALE_TOTAL - 1})`,
        );
        if (local[0]) await this.diagram.revealPath(local[0].node.positionId ?? local[0].node.id);
        return;
      }
      const scheduler = this.staffScheduler;
      if (!scheduler) {
        // No live scene to move the window inside of — building one is the only
        // thing the old path is still here for.
        this.rebuildStaffScaleWindow(index);
        await this.reload();
        return;
      }
      try {
        // Through the scheduler, not around it: the jump ends in `setData`, and
        // an in-flight pan rebuild is the overlap the scheduler exists to stop.
        await scheduler.run({ kind: 'jump', focusIndex: index });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.setStatus(`search · pos-${index} · window unchanged · rebuild failed: ${msg}`);
      }
      return;
    }

    const hits = await this.diagram.search(query);
    if (!query.trim()) {
      this.setStatus(`${this.tab} · ${this.theme}`);
      return;
    }
    if (hits.length === 0) {
      this.setStatus(`search · no hits for “${query}”`);
      return;
    }
    const top = hits[0]!;
    await this.diagram.revealPath(top.node.positionId ?? top.node.id);
    this.setStatus(`search · ${hits.length} hits · focus ${top.label}`);
  }

  private async loadMapperFile(file: File): Promise<void> {
    this.tab = 'mapper';
    const parsed = await parseJsonFile<FlatDiagramRow[]>(file);
    if (!parsed.ok) {
      this.showToast(parsed.error.message);
      return;
    }
    await this.loadMapperJson(JSON.stringify(parsed.data));
  }

  private async loadMapperJson(text: string): Promise<void> {
    const { parseJsonText } = await import('../utils/json.js');
    const parsed = parseJsonText<FlatDiagramRow[]>(text);
    if (!parsed.ok) {
      this.showToast(parsed.error.message);
      return;
    }

    const pooled = await mapFlatRowsInPool(parsed.data, {
      poolSize: recommendWorkerPoolSize(),
    });
    // Go through the normal tab path: mounting by hand here used to drop the
    // callbacks, the promote overlay and the e2e anchors on the floor.
    this.mapperData = pooled.data;
    this.tab = 'mapper';
    await this.reload();
    const via = pooled.usedWorker ? `pool×${pooled.poolSize}` : 'main';
    this.setStatus(
      `mapper · ${parsed.data.length} rows · ${via} · ${pooled.chunkCount} chunks · ${Math.round(pooled.totalDurationMs)}ms`,
    );
  }

  private async runWorkerBench(): Promise<void> {
    this.setStatus('Worker bench…');
    const rows: FlatDiagramRow[] = Array.from({ length: 5_000 }, (_, i) => ({
      id: `org-${i}`,
      kind: 'organization',
      label: `Org ${i}`,
      parentId: i > 0 ? `org-${Math.floor((i - 1) / 3)}` : null,
    }));

    try {
      const pooled = await mapFlatRowsInPool(rows, {
        poolSize: recommendWorkerPoolSize(),
      });
      const ids = await mapArrayItems(rows, (row) => row.id, { chunkSize: 1_000 });
      const via = pooled.usedWorker ? `pool×${pooled.poolSize}` : 'main';
      const ms = Math.round(pooled.totalDurationMs);
      this.setStatus(
        `Worker · ${rows.length.toLocaleString('uk-UA')} rows → ${pooled.data.organizations.length.toLocaleString('uk-UA')} orgs · ${via} · ${ms}ms · ids ${ids.data.length}`,
      );
    } catch (err) {
      this.setStatus(`Worker error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private syncContourControlsEnabled(): void {
    const enabled = TAB_META[this.tab]?.contourControls === true;
    for (const id of ['padding-control', 'smooth-control']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.dataset.disabled = enabled ? 'false' : 'true';
      el.title = enabled ? '' : 'Variant B / Staff · GoJS only';
    }
    const padding = document.getElementById('padding-slider') as HTMLInputElement | null;
    const smooth = document.getElementById('smooth-slider') as HTMLInputElement | null;
    if (padding) padding.disabled = !enabled;
    if (smooth) smooth.disabled = !enabled;
  }

  private syncContourControlLabels(): void {
    const pad = document.getElementById('padding-value');
    const sm = document.getElementById('smooth-value');
    if (pad) pad.textContent = String(this.contourControls.paddingCells);
    if (sm) sm.textContent = String(this.contourControls.smoothIterations);
  }

  private syncThemeToggleLabel(): void {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = this.theme === 'light' ? 'Dark' : 'Light';
  }

  private tabLabel(): string {
    return TAB_META[this.tab]?.label ?? this.tab;
  }

  private showToast(message: string): void {
    const toast = requireElement('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 4000);
  }

  private setStatus(text: string): void {
    this.statusEl.textContent = text;
  }
}

/** Demo promote card with a placeholder "chart" slot (host can swap for Chart.js). */
function DemoPromoteCard(props: PromoteSlotProps) {
  return createElement(
    DefaultPromoteCard,
    props,
    createElement(
      'div',
      {
        style: {
          height: 36,
          borderRadius: 4,
          background: 'linear-gradient(90deg, #dbeafe, #93c5fd)',
          fontSize: 10,
          color: '#1e3a8a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      'Host slot · Chart.js / actions',
    ),
  );
}

/**
 * Three ways a host can fill a promoted card, chosen by the host's own
 * `entityType` — T87.8, acceptance row 3.
 *
 * The SDK never interprets `entityType`; it carries it through and the host
 * decides. That is the whole claim being demonstrated here, so the demo does the
 * deciding in one readable place rather than hiding it in a style table.
 */
function promoteDisplayMode(node: PromoteSlotProps['node']): 'cover' | 'contain' | 'text' {
  const image = node.person?.photoUrl;
  if (!image) return 'text';
  const kind = node.person?.entityType ?? node.organization?.entityType;
  return kind === 'promo-contain' ? 'contain' : 'cover';
}

/**
 * Card for `near-visible` — demonstrates the three content modes.
 *
 * Kept apart from {@link DemoPromoteCard} on purpose: the selection card is what
 * the demo has always shown, and turning every card with a photo into a bare
 * image would have changed the default behaviour to demonstrate an opt-in one.
 */
function DemoContentModesCard(props: PromoteSlotProps) {
  const mode = promoteDisplayMode(props.node);
  const { screenRect, chrome, node } = props;
  const title =
    node.person?.fullName ?? node.organization?.name ?? node.position?.title ?? node.ref.id;

  if (mode === 'text') {
    // No picture at all — a vacant seat. Showing an empty frame where the other
    // cards show an image reads as a loading failure, so it says what it is.
    return createElement(
      DefaultPromoteCard,
      props,
      createElement(
        'div',
        { style: { fontSize: 10, color: '#94a3b8' }, 'data-promote-mode': 'text' },
        'Без зображення',
      ),
    );
  }

  return createElement(
    'div',
    {
      'data-promote-card': node.ref.id,
      'data-promote-mode': mode,
      style: {
        position: 'absolute',
        left: screenRect.left,
        top: screenRect.top,
        width: screenRect.width,
        height: screenRect.height,
        boxSizing: 'border-box',
        borderRadius: chrome.borderRadius,
        border: `${chrome.borderWidth}px solid var(--border, #cbd5e1)`,
        background: 'var(--surface, #ffffff)',
        overflow: 'hidden',
        pointerEvents: 'auto',
        // `cover` fills to the edges, so it gets no inset at all; `contain`
        // needs the inset for the letterbox to read as deliberate.
        padding: mode === 'contain' ? (chrome.paddingY ?? 6) : 0,
      },
    },
    createElement('img', {
      src: node.person?.photoUrl,
      alt: title,
      style: {
        width: '100%',
        height: '100%',
        objectFit: mode,
        display: 'block',
      },
    }),
  );
}
