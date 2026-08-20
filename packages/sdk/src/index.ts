import { emptyDiagramData, computeStats } from './data/types.js';
import type {
  DiagramData,
  DiagramOrganization,
  DiagramPerson,
  DiagramPosition,
} from './data/types.js';
import type { DiagramMappers } from './mappers/types.js';

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

/** Конфіг embed — дані in-memory + мапери (API опційно зовні) */
export interface OrgHierarchyConfig<TRaw = DiagramData> {
  data: TRaw | DiagramData;
  mappers?: DiagramMappers<TRaw>;
  theme?: 'light' | 'dark' | 'auto';
  workerPoolSize?: number;
}

/** Skeleton SDK — render/layout у наступних фазах */
export class OrgHierarchyDiagram {
  private data: DiagramData = emptyDiagramData();

  static async create<TRaw>(
    _container: HTMLElement,
    config: OrgHierarchyConfig<TRaw>,
  ): Promise<OrgHierarchyDiagram> {
    const instance = new OrgHierarchyDiagram();
    await instance.applyConfig(config);
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

  getData(): DiagramData {
    return this.data;
  }

  async appendData<TRaw>(chunk: TRaw, mappers?: DiagramMappers<TRaw>): Promise<void> {
    if (mappers?.append) {
      const patch = await mappers.append(chunk);
      this.data = mergePartial(this.data, patch);
    } else if (mappers?.toDiagram) {
      const mapped = await mappers.toDiagram(chunk);
      this.data = mergePartial(this.data, mapped);
    }
  }

  destroy(): void {
    /* Pixi teardown — наступна фаза */
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
