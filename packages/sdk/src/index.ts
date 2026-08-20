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
} from './layout/index.js';
export type {
  OrgDisplayMode,
  OrgLayoutResult,
  MatrixShape,
  OrgLayoutNode,
  OrgLayoutEdge,
  OrgLayoutOptions,
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
    instance.host = await PixiHost.create(container);
    await instance.render();
    return instance;
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
      onOrgClick: (orgId) => {
        this.callbacks.onNodeClick?.({ kind: 'organization', id: orgId });
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
    }
    await this.render();
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
