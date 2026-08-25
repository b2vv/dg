import type { OrgHierarchyConfig } from '@org-hierarchy/sdk';
import {
  OrgHierarchyDiagram,
  defaultLodThresholds,
  flatRowsToDiagram,
  layoutStaffCanvas,
  mapFlatRowsInPool,
  mapArrayItems,
  recommendWorkerPoolSize,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
  VARIANT_B_MAGNET_RADIUS,
  type DiagramData,
  type FlatDiagramRow,
  type LodThresholds,
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
import { buildVariantBData } from '../scenarios/variantB.js';
import { buildFlatOrgsData } from '../scenarios/flatOrgs.js';
import { buildStaffTreeData } from '../scenarios/staffTree.js';
import {
  buildMockupOrgsFigmaData,
  buildMockupOrgsGojsData,
  buildMockupStaffFigmaData,
  buildMockupStaffGojsData,
  buildMockupStaffFloodData,
  buildMockupStaffMagneticData,
  FIGMA_ORG_LAYOUT,
  FIGMA_STAFF_LAYOUT,
  FLOOD_CELL,
  FLOOD_STAFF_LAYOUT,
  MAGNETIC_CELL,
  MAGNETIC_STAFF_LAYOUT,
  MOCKUP_FIGMA_STYLES,
  MOCKUP_GOJS_STYLES,
  MOCKUP_MAGNETIC_STYLES,
} from '../scenarios/mockupFigma.js';
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
  LEAD_SEATS,
  parseScaleStaffQuery,
  STAFF_SCALE_DEFAULT_FOCUS,
  STAFF_SCALE_TOTAL,
  type ScaleStaffWindow,
} from '../scenarios/scaleStaff.js';
import { SAMPLE_MAPPER_JSON, SAMPLE_MAPPER_ROWS } from '../scenarios/sampleMapper.js';
import { parseJsonFile } from '../utils/json.js';
import { requireElement, setThemeAttribute, showError } from '../utils/dom.js';
import {
  ALL_MOCKUP_TABS,
  FIGMA_MOCKUP_TABS,
  GOJS_MOCKUP_TABS,
  MOCKUP_FIT_MIN_SCALE,
  TAB_META,
  type ContourControls,
  type DemoTab,
} from './tabs.js';
import { buildTabConfig } from './tabConfigs.js';
import { captionForTab } from './captions.js';

export type { ContourControls, DemoTab };

export interface DemoE2eBridge {
  collapseOrg(orgId: string): Promise<void> | undefined;
  expandOrg(orgId: string): Promise<void> | undefined;
  /** Same code path as demo `onNodeClick` for flat orgs / 100k org cards. */
  clickOrg(orgId: string): void;
  getScaleWindowStart(): number | null;
  toggleStaffOrg(orgId: string): Promise<boolean> | undefined;
  focusTestId(testId: string): Promise<boolean> | undefined;
  getStaffExpandedOrgIds(): string[];
  getZoom(): number;
  getStaffLayoutEdges(): Promise<Array<{ fromId: string; toId: string; kind: string }>>;
  /** Soft render warnings — a silently empty contour layer must show up here. */
  getLayoutDiagnostics(): string[];
}

export class App {
  private diagram: OrgHierarchyDiagram | null = null;
  private tab: DemoTab = 'variant-b';
  private theme: 'light' | 'dark' = 'light';
  private contourControls: ContourControls = { paddingCells: 1, smoothIterations: 2 };
  private flatOrgsData = buildFlatOrgsData(24);
  private scaleParents: Int32Array | null = null;
  private scaleWindow: ScaleOrgsWindow | null = null;
  private staffScaleWindow: ScaleStaffWindow | null = null;
  private contextMenu: ReactContextMenuHost | null = null;
  private promote: ReactPromoteOverlay | null = null;
  private testAnchors: TestAnchorOverlay | null = null;
  private readonly e2eMode =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');

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
        const tab = btn.dataset.tab as DemoTab;
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
      if (this.tab === 'flat-orgs' || this.tab === 'scale-100k') {
        void this.diagram?.collapseAllOrgs();
      }
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
      if (this.tab === 'variant-b') void this.reload();
    });
    smooth.addEventListener('input', () => {
      this.contourControls.smoothIterations = Number(smooth.value);
      this.syncContourControlLabels();
      if (this.tab === 'variant-b') void this.reload();
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
    this.promote?.dispose();
    this.promote = null;
    this.testAnchors?.dispose();
    this.testAnchors = null;
    this.diagram?.destroy();
    this.diagram = null;
    this.mountEl.innerHTML = '';
    this.mountEl.removeAttribute('data-testid');

    const config = this.buildConfig();
    try {
      this.setStatus('Loading…');
      this.diagram = await OrgHierarchyDiagram.create(this.mountEl, {
        ...config,
        callbacks: {
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
            if (node.kind === 'organization' && (this.tab === 'flat-orgs' || this.tab === 'scale-100k')) {
              this.handleOrgNodeClick(node.id);
              return;
            }
            if (this.tab === 'staff-tree') {
              const focus = this.diagram?.getStaffFocus() ?? 'ops';
              const expanded = this.diagram?.getStaffExpandedOrgIds() ?? [];
              const exp =
                expanded.length > 0 ? ` · expanded ${expanded.join(',')}` : '';
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
              request.items = request.items.filter(
                (i) => i.id !== 'expand' && i.id !== 'collapse',
              );
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
              const w = this.scaleWindow;
              this.setStatus(
                `100k orgs · ${mode} · window ${w.windowSize.toLocaleString('uk-UA')} of ${w.total.toLocaleString('uk-UA')} · focus org-${w.focusIndex}`,
              );
              return;
            }
            this.setStatus(`${this.tab} · ${mode} · ${this.theme}`);
          },
          onLayoutDiagnostics: (messages) => {
            if (messages.length === 0) return;
            this.showToast(`Layout: ${messages[0]}${messages.length > 1 ? ` (+${messages.length - 1})` : ''}`);
          },
        },
      });
      this.promote = createReactPromoteOverlay({
        diagram: this.diagram,
        mount: this.mountEl,
        mode: 'near-selection',
        component: DemoPromoteCard,
      });
      if (this.e2eMode) {
        this.testAnchors = createTestAnchorOverlay({
          diagram: this.diagram,
          mount: this.mountEl,
          interactive: true,
        });
        this.mountEl.setAttribute('data-testid', 'diagram-ready');
        (window as unknown as { __demoE2e?: DemoE2eBridge }).__demoE2e = {
          collapseOrg: (orgId: string) => this.diagram?.collapseOrg(orgId),
          expandOrg: (orgId: string) => this.diagram?.expandOrg(orgId),
          clickOrg: (orgId: string) => this.handleOrgNodeClick(orgId),
          getScaleWindowStart: () => this.scaleWindow?.startIndex ?? null,
          toggleStaffOrg: (orgId: string) => this.diagram?.toggleStaffOrgExpand(orgId),
          focusTestId: (testId: string) => this.diagram?.focusByTestId(testId),
          getStaffExpandedOrgIds: () => this.diagram?.getStaffExpandedOrgIds() ?? [],
          getZoom: () => this.diagram?.getZoom() ?? 0,
          getLayoutDiagnostics: () => [...(this.diagram?.getLayoutDiagnostics() ?? [])],
          getStaffLayoutEdges: () => this.getStaffLayoutEdgesForE2e(),
        };
      }
      this.mountZoomFab();
      this.mountBulkBar();
      if (this.tab === 'staff-tree') {
        this.setStatus(`Staff tree · focus ${this.diagram.getStaffFocus() ?? 'ops'}`);
      } else if (this.tab === 'scale-100k' && this.scaleWindow) {
        const w = this.scaleWindow;
        const mode = this.diagram?.getOrgMode() ?? 'row-tree';
        this.setStatus(
          `100k orgs · ${mode} · window ${w.windowSize.toLocaleString('uk-UA')} of ${w.total.toLocaleString('uk-UA')} · focus org-${w.focusIndex}`,
        );
      } else if (this.tab === 'variant-b') {
        this.setStatus(
          `Variant B · padding ${this.contourControls.paddingCells} · smooth ${this.contourControls.smoothIterations}`,
        );
      } else if (this.tab === 'worker') {
        this.setStatus('Worker bench · open sidebar to run pooled map');
      } else if (this.tab === 'mapper') {
        this.setStatus('Mapper · load sample JSON or upload a file');
      } else {
        this.setStatus(`${this.tabLabel()} · zoom ${this.diagram.getZoom().toFixed(2)}`);
      }
      this.fitDiagramView();
      this.setStatus(`${this.tabLabel()} · zoom ${this.diagram!.getZoom().toFixed(2)}`);
      this.mountSceneCaption();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(this.mountEl, msg);
      this.setStatus(`Error: ${msg}`);
    }
  }

  private fitDiagramView(motion: { animate?: boolean } = { animate: false }): boolean {
    if (!this.diagram) return false;
    const minScale = ALL_MOCKUP_TABS.has(this.tab) ? MOCKUP_FIT_MIN_SCALE : undefined;
    return this.diagram.fitView(28, { ...motion, minScale });
  }

  /** E2e: layout staff canvas edges for current tab config (mockup staff tabs). */
  private async getStaffLayoutEdgesForE2e(): Promise<
    Array<{ fromId: string; toId: string; kind: string }>
  > {
    const cfg = this.buildConfig();
    const orgId = cfg.staffCurrentOrgId;
    const data = cfg.data;
    if (!orgId || !data || typeof data !== 'object' || !('positions' in data)) return [];
    const diagram = data as DiagramData;
    const canvas = await layoutStaffCanvas(
      {
        organizations: diagram.organizations,
        positions: diagram.positions,
        reports: diagram.reportLines,
        groups: diagram.groups,
        departments: diagram.departments,
        persons: diagram.persons,
      },
      orgId,
      {
        ...cfg.staffLayout,
        expandedOrgIds: cfg.staffExpandedOrgIds ?? cfg.staffLayout?.expandedOrgIds,
      },
    );
    return canvas.edges.map((e) => ({ fromId: e.fromId, toId: e.toId, kind: e.kind }));
  }

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
        if (!inWindow) {
          this.ensureScaleWindow(idx);
          void this.reload();
        } else {
          void this.diagram?.focusNode(orgId);
        }
      }
      return;
    }
    if (this.tab === 'flat-orgs') {
      const org = this.diagram?.getData().organizations.find((o) => o.id === orgId);
      if (org?.collapsed !== false) {
        void this.diagram?.expandOrg(orgId);
      } else {
        void this.diagram?.focusNode(orgId);
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
      const win = this.rebuildStaffScaleWindow(index);
      await this.reload();
      if (!win.focusMaterialized) {
        // The window only centres inside tier 2 — say so instead of leaving the
        // camera on a seat that is not the one that was asked for.
        this.setStatus(
          `search · pos-${index} is in the ${win.focusTier} tier · the window centres on the current org (pos-${LEAD_SEATS}…${LEAD_SEATS + win.composition.current - 1})`,
        );
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

    this.tab = 'mapper';
    this.diagram?.destroy();
    this.mountEl.innerHTML = '';

    const pooled = await mapFlatRowsInPool(parsed.data, {
      poolSize: recommendWorkerPoolSize(),
    });
    this.diagram = await OrgHierarchyDiagram.create(this.mountEl, {
      data: pooled.data,
      theme: this.theme,
      useWorker: true,
      workerPoolSize: recommendWorkerPoolSize(),
    });
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

/** Demo promote card with a placeholder “chart” slot (host can swap for Chart.js). */
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
