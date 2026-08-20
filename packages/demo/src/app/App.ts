import type { OrgHierarchyConfig } from '@org-hierarchy/sdk';
import {
  OrgHierarchyDiagram,
  flatRowsToDiagram,
  mapInWorker,
  type FlatDiagramRow,
} from '@org-hierarchy/sdk';
import {
  createReactContextMenuHost,
  DefaultReactContextMenu,
  type ReactContextMenuHost,
} from '@org-hierarchy/sdk/react';
import { buildVariantBData } from '../scenarios/variantB.js';
import { buildFlatOrgsData } from '../scenarios/flatOrgs.js';
import { buildStaffTreeData } from '../scenarios/staffTree.js';
import { SAMPLE_MAPPER_JSON, SAMPLE_MAPPER_ROWS } from '../scenarios/sampleMapper.js';
import { parseJsonFile } from '../utils/json.js';
import { requireElement, setThemeAttribute, showError } from '../utils/dom.js';
import { createTransformWorker } from '../worker/createTransformWorker.js';

export type DemoTab = 'variant-b' | 'staff-tree' | 'flat-orgs' | 'mapper' | 'worker';

export interface ContourControls {
  paddingCells: number;
  smoothIterations: number;
}

export class App {
  private diagram: OrgHierarchyDiagram | null = null;
  private tab: DemoTab = 'variant-b';
  private theme: 'light' | 'dark' = 'light';
  private contourControls: ContourControls = { paddingCells: 0, smoothIterations: 2 };
  private flatOrgsData = buildFlatOrgsData(24);
  private contextMenu: ReactContextMenuHost | null = null;

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
      void this.reload();
    });

    requireElement('fit-view').addEventListener('click', () => {
      if (this.diagram?.fitView()) {
        this.setStatus(`${this.tab} · fit · zoom ${this.diagram.getZoom().toFixed(2)}`);
      }
    });

    requireElement('collapse-all').addEventListener('click', () => {
      if (this.tab === 'flat-orgs') {
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
      if (this.tab === 'variant-b') void this.reload();
    });
    smooth.addEventListener('input', () => {
      this.contourControls.smoothIterations = Number(smooth.value);
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
  }

  private async loadTab(tab: DemoTab): Promise<void> {
    this.tab = tab;
    document.querySelectorAll('[data-tab]').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.tab === tab);
    });
    document.body.dataset.activeTab = tab;
    await this.reload();
  }

  private async reload(): Promise<void> {
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
            if (node.kind === 'organization' && this.tab === 'flat-orgs') {
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
            this.contextMenu?.handleContextMenu(request);
            const label =
              request.node.person?.fullName ??
              request.node.organization?.name ??
              request.node.position?.title ??
              request.node.ref.id;
            this.setStatus(`context · ${request.node.ref.kind} · ${label}`);
          },
          onOrgModeChange: (mode) => {
            this.setStatus(`${this.tab} · ${mode} · ${this.theme}`);
          },
        },
      });
      if (this.tab === 'staff-tree') {
        this.setStatus(`staff-tree · focus ${this.diagram.getStaffFocus() ?? 'ops'} · ${this.theme}`);
      } else {
        this.setStatus(`${this.tab} · ${this.theme} theme`);
      }
      this.diagram.fitView();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(this.mountEl, msg);
      this.setStatus(`Error: ${msg}`);
    }
  }

  private buildConfig(): OrgHierarchyConfig<unknown> {
    const base = {
      theme: this.theme,
      useWorker: true,
      workerPoolSize: 2,
      render: {
        cellWidth: 100,
        cellHeight: 80,
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
          render: { ...base.render, magnetRadius: 8 },
        };
      case 'staff-tree':
        return { ...base, data: buildStaffTreeData(), staffCurrentOrgId: 'ops' };
      case 'flat-orgs':
        return { ...base, data: this.flatOrgsData };
      case 'mapper':
        return {
          ...base,
          data: SAMPLE_MAPPER_ROWS,
          mappers: { toDiagram: flatRowsToDiagram },
        } as OrgHierarchyConfig<unknown>;
      case 'worker':
        return { ...base, data: buildVariantBData() };
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
    this.diagram = await OrgHierarchyDiagram.create(this.mountEl, {
      data: parsed.data,
      mappers: { toDiagram: flatRowsToDiagram },
      theme: this.theme,
      useWorker: true,
    });
    this.setStatus(`mapper · ${parsed.data.length} rows`);
  }

  private async runWorkerBench(): Promise<void> {
    this.setStatus('Worker bench…');
    const rows = buildFlatOrgsData(100).organizations.map((o) => ({
      id: o.id,
      kind: 'organization' as const,
      label: o.name,
      parentId: o.parentOrgId ?? null,
    }));
    const worker = createTransformWorker();
    const t0 = performance.now();
    try {
      await mapInWorker(worker, 'flatRowsToDiagram', rows);
      const ms = Math.round(performance.now() - t0);
      this.showToast(`Worker map: ${rows.length} rows in ${ms}ms`);
      this.setStatus(`worker bench · ${ms}ms`);
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : String(err));
    } finally {
      worker.terminate();
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
