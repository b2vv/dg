import type { OrgHierarchyConfig } from '@org-hierarchy/sdk';
import {
  OrgHierarchyDiagram,
  flatRowsToDiagram,
  mapFlatRowsInPool,
  mapArrayItems,
  recommendWorkerPoolSize,
  VARIANT_B_HORIZONTAL_GAP,
  VARIANT_B_VERTICAL_GAP,
  VARIANT_B_MAGNET_RADIUS,
  type FlatDiagramRow,
} from '@org-hierarchy/sdk';
import {
  createReactContextMenuHost,
  DefaultReactContextMenu,
  createReactPromoteOverlay,
  DefaultPromoteCard,
  type ReactContextMenuHost,
  type ReactPromoteOverlay,
  type PromoteSlotProps,
} from '@org-hierarchy/sdk/react';
import { createElement } from 'react';
import { buildVariantBData } from '../scenarios/variantB.js';
import { buildFlatOrgsData } from '../scenarios/flatOrgs.js';
import { buildStaffTreeData } from '../scenarios/staffTree.js';
import {
  SCALE_ORG_TOTAL,
  SCALE_ORG_WINDOW,
  buildScaleOrgsWindow,
  buildScaleParentIndex,
  parseScaleOrgQuery,
  type ScaleOrgsWindow,
} from '../scenarios/scaleOrgs.js';
import { SAMPLE_MAPPER_JSON, SAMPLE_MAPPER_ROWS } from '../scenarios/sampleMapper.js';
import { parseJsonFile } from '../utils/json.js';
import { requireElement, setThemeAttribute, showError } from '../utils/dom.js';

export type DemoTab =
  | 'variant-b'
  | 'staff-tree'
  | 'flat-orgs'
  | 'scale-100k'
  | 'mapper'
  | 'worker';

export interface ContourControls {
  paddingCells: number;
  smoothIterations: number;
}

export class App {
  private diagram: OrgHierarchyDiagram | null = null;
  private tab: DemoTab = 'variant-b';
  private theme: 'light' | 'dark' = 'light';
  private contourControls: ContourControls = { paddingCells: 1, smoothIterations: 2 };
  private flatOrgsData = buildFlatOrgsData(24);
  private scaleParents: Int32Array | null = null;
  private scaleWindow: ScaleOrgsWindow | null = null;
  private contextMenu: ReactContextMenuHost | null = null;
  private promote: ReactPromoteOverlay | null = null;

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
    this.diagram?.destroy();
    this.diagram = null;
    this.mountEl.innerHTML = '';

    const config = this.buildConfig();
    try {
      this.setStatus('Loading…');
      this.diagram = await OrgHierarchyDiagram.create(this.mountEl, {
        ...config,
        callbacks: {
          onNodeClick: (node) => {
            this.contextMenu?.close();
            if (node.kind === 'organization' && (this.tab === 'flat-orgs' || this.tab === 'scale-100k')) {
              if (this.tab === 'scale-100k') {
                const idx = Number(String(node.id).replace(/^org-/, ''));
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
                    void this.diagram?.focusNode(node.id);
                  }
                  return;
                }
              }
              void this.diagram?.expandOrg(node.id);
            }
            if (this.tab === 'staff-tree') {
              const focus = this.diagram?.getStaffFocus() ?? 'ops';
              const expanded = this.diagram?.getStaffExpandedOrgIds() ?? [];
              const exp =
                expanded.length > 0 ? ` · expanded ${expanded.join(',')}` : '';
              this.setStatus(
                `staff-tree · focus ${focus}${exp} · click ${node.kind}:${node.id}`,
              );
            }
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
      this.mountZoomFab();
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
      this.diagram.fitView(28, { animate: false });
      this.mountSceneCaption();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(this.mountEl, msg);
      this.setStatus(`Error: ${msg}`);
    }
  }

  private zoomDiagram(factor: number): void {
    this.diagram?.zoomBy(factor);
    this.setStatus(`${this.tab} · zoom ${this.diagram?.getZoom().toFixed(2) ?? '—'}`);
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
      else if (action === 'fit' && this.diagram?.fitView(28, { animate: true })) {
        this.setStatus(`${this.tabLabel()} · fit · zoom ${this.diagram.getZoom().toFixed(2)}`);
      }
    });
    this.mountEl.appendChild(fab);
  }

  private mountSceneCaption(): void {
    this.mountEl.querySelectorAll('.scene-caption').forEach((el) => el.remove());
    if (this.tab !== 'variant-b') return;
    const caption = document.createElement('p');
    caption.className = 'scene-caption';
    caption.textContent =
      'Blue wash = magnetic groups (same dept, adjacent cells) · arrows = reports · orange T = temporary';
    this.mountEl.appendChild(caption);
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
    const base = {
      theme: this.theme,
      useWorker: true,
      workerPoolSize: recommendWorkerPoolSize(),
      render: {
        cellWidth: 140,
        cellHeight: 160,
        paddingCells: this.contourControls.paddingCells,
        smoothIterations: this.contourControls.smoothIterations,
      },
    };

    switch (this.tab) {
      case 'variant-b':
        return {
          ...base,
          data: buildVariantBData(),
          staffCurrentOrgId: 'org1',
          // Corridor gaps so report edges are readable; contour pitch = cell + gap.
          staffLayout: {
            horizontalGap: VARIANT_B_HORIZONTAL_GAP,
            verticalGap: VARIANT_B_VERTICAL_GAP,
            margin: 0,
            refCellWidth: 140,
            refCellHeight: 160,
            nodeWidth: 136,
            nodeHeight: 156,
          },
          render: {
            ...base.render,
            magnetRadius: VARIANT_B_MAGNET_RADIUS,
            // Hide singleton CEO wash so the IT notch stays empty (T46).
            minContourMembers: 2,
            smoothIterations: this.contourControls.smoothIterations,
          },
        };
      case 'staff-tree':
        return {
          ...base,
          data: buildStaffTreeData(),
          staffCurrentOrgId: 'ops',
          staffLayout: {
            horizontalGap: 40,
            verticalGap: 52,
            tierGap: 36,
            margin: 24,
            nodeWidth: 136,
            nodeHeight: 156,
            orgCardWidth: 200,
            orgCardHeight: 64,
            refCellWidth: 140,
            refCellHeight: 160,
          },
        };
      case 'flat-orgs':
        return {
          ...base,
          data: this.flatOrgsData,
          orgLayout: {
            nodeWidth: 200,
            nodeHeight: 64,
            horizontalGap: 36,
            verticalGap: 44,
            margin: 40,
          },
        };
      case 'scale-100k': {
        const win = this.scaleWindow ?? this.ensureScaleWindow(0);
        return {
          ...base,
          orgTreeChrome: false,
          data: win.data,
          orgLayout: {
            nodeWidth: 160,
            nodeHeight: 52,
            horizontalGap: 20,
            verticalGap: 24,
            margin: 24,
          },
        };
      }
      case 'mapper':
        return {
          ...base,
          data: SAMPLE_MAPPER_ROWS,
          mappers: { toDiagram: flatRowsToDiagram },
          staffCurrentOrgId: 'org-it',
          orgLayout: {
            nodeWidth: 200,
            nodeHeight: 64,
            horizontalGap: 36,
            verticalGap: 44,
            margin: 40,
          },
        } as OrgHierarchyConfig<unknown>;
      case 'worker':
        return {
          ...base,
          data: buildVariantBData(),
          staffCurrentOrgId: 'org1',
          staffLayout: {
            horizontalGap: VARIANT_B_HORIZONTAL_GAP,
            verticalGap: VARIANT_B_VERTICAL_GAP,
            margin: 0,
            refCellWidth: 140,
            refCellHeight: 160,
            nodeWidth: 136,
            nodeHeight: 156,
          },
          render: { ...base.render, magnetRadius: VARIANT_B_MAGNET_RADIUS, minContourMembers: 2 },
        };
      default:
        return { ...base, data: buildVariantBData() };
    }
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
    const enabled = this.tab === 'variant-b';
    for (const id of ['padding-control', 'smooth-control']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.dataset.disabled = enabled ? 'false' : 'true';
      el.title = enabled ? '' : 'Variant B only';
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
    switch (this.tab) {
      case 'variant-b':
        return 'Variant B';
      case 'staff-tree':
        return 'Staff tree';
      case 'flat-orgs':
        return 'Flat orgs';
      case 'scale-100k':
        return '100k orgs';
      case 'mapper':
        return 'Mapper';
      case 'worker':
        return 'Worker';
      default:
        return this.tab;
    }
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
