import { emptyDiagramData, computeStats } from './data/types.js';
import type { DiagramData } from './data/types.js';
import type { DiagramMappers } from './mappers/types.js';
import { PixiHost } from './render/PixiHost.js';
import {
  defaultRenderConfig,
  mergeTheme,
  resolveTheme,
  type NodeTheme,
  type RenderConfig,
} from './render/index.js';

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

export { createWorkerPipeline, mapInWorker, WorkerPool } from './worker/index.js';
export type { MapperRegistry, WorkerBridgeOptions } from './worker/bridge.js';

export {
  computeDeptContour,
  computeAllContours,
  initContourWasm,
  VARIANT_B_POSITIONS,
} from './contour/bridge.js';
export type {
  ContourPositionInput,
  ContourMagnetConfig,
  ContourPoint,
  DeptContourResult,
} from './contour/bridge.js';

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
export type { NodeTheme, ThemeMode, RenderConfig } from './render/index.js';

/** Конфіг embed — дані in-memory + мапери (API опційно зовні) */
export interface OrgHierarchyConfig<TRaw = DiagramData> {
  data: TRaw | DiagramData;
  mappers?: DiagramMappers<TRaw>;
  theme?: 'light' | 'dark' | 'auto';
  styles?: Partial<NodeTheme>;
  render?: Partial<RenderConfig>;
  workerPoolSize?: number;
}

/** Embed SDK — Pixi render + data/mappers */
export class OrgHierarchyDiagram {
  private data: DiagramData = emptyDiagramData();
  private host: PixiHost | null = null;
  private themeMode: 'light' | 'dark' | 'auto' = 'auto';
  private nodeTheme = mergeTheme();
  private renderConfig: RenderConfig = { ...defaultRenderConfig };

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
    await this.host.renderer.render(this.data, this.nodeTheme, resolved, this.renderConfig);
  }

  getData(): DiagramData {
    return this.data;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.host?.getCanvas() ?? null;
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
