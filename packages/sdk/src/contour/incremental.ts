import type { ContourMagnetConfig, ContourPositionInput, DeptContourResult } from './bridge.js';
import { toRustConfig } from './config.js';
import { resolveMagnetRadius } from '../render/magnetRadius.js';

export type ContourComputerFn = (
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
) => Promise<DeptContourResult[]>;

export type DeptContourComputerFn = (
  departmentId: string,
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
) => Promise<DeptContourResult[]>;

export interface IncrementalContourComputer extends ContourComputerFn {
  invalidate(): void;
  /** Test/metrics: departments recomputed on the last call. */
  lastDirtyDepartmentIds(): readonly string[];
}

function configKey(config?: ContourMagnetConfig): string {
  return JSON.stringify(toRustConfig(config));
}

function chebyshev(
  a: Pick<ContourPositionInput, 'col' | 'row'>,
  b: Pick<ContourPositionInput, 'col' | 'row'>,
): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

/** Chebyshev ring of own cells that can change G6/G7 / magnet fill. */
function influenceRadius(config?: ContourMagnetConfig): number {
  const magnet = Math.max(0, Math.ceil(resolveMagnetRadius(config?.magnetRadius)));
  const pad = Math.max(0, config?.paddingCells ?? 0);
  const corridor = Math.max(0, config?.corridorCells ?? 0);
  return magnet + pad + corridor + 1;
}

function deptKey(
  departmentId: string,
  positions: ContourPositionInput[],
  config?: ContourMagnetConfig,
): string {
  const own = positions.filter((p) => p.departmentId === departmentId);
  const ownPart = own
    .map((p) => `${p.id}:${p.col},${p.row}`)
    .sort()
    .join('|');
  const radius = influenceRadius(config);
  const foreignPart = positions
    .filter((p) => p.departmentId !== departmentId)
    .filter((p) => own.some((o) => chebyshev(o, p) <= radius))
    .map((p) => `${p.id}:${p.departmentId}:${p.col},${p.row}`)
    .sort()
    .join('|');
  return `${ownPart}#fx:${foreignPart}`;
}

function listDepartmentIds(positions: ContourPositionInput[]): string[] {
  const ids = new Set<string>();
  for (const p of positions) ids.add(p.departmentId);
  return [...ids].sort();
}

/**
 * ContourComputer that recomputes only departments whose cell fingerprint changed.
 * Full `computeAll` is used when every department is dirty (cold start / wipe).
 */
export function createIncrementalContourComputer(
  computeAll: ContourComputerFn,
  computeDept: DeptContourComputerFn,
): IncrementalContourComputer {
  let cachedConfig = '';
  const cachedFp = new Map<string, string>();
  const cachedResults = new Map<string, DeptContourResult[]>();
  let lastDirty: string[] = [];

  const run: IncrementalContourComputer = async (positions, config) => {
    const cfg = configKey(config);
    if (cfg !== cachedConfig) {
      cachedConfig = cfg;
      cachedFp.clear();
      cachedResults.clear();
    }

    const deptIds = listDepartmentIds(positions);
    if (deptIds.length === 0) {
      lastDirty = [];
      cachedFp.clear();
      cachedResults.clear();
      return [];
    }

    const dirty: string[] = [];
    for (const id of deptIds) {
      const fp = deptKey(id, positions, config);
      if (cachedFp.get(id) !== fp) dirty.push(id);
    }

    // Drop cache for departments that disappeared.
    for (const id of [...cachedFp.keys()]) {
      if (!deptIds.includes(id)) {
        cachedFp.delete(id);
        cachedResults.delete(id);
      }
    }

    lastDirty = dirty;

    if (dirty.length === 0) {
      return deptIds.flatMap((id) => cachedResults.get(id) ?? []);
    }

    if (dirty.length === deptIds.length) {
      const all = await computeAll(positions, config);
      cachedFp.clear();
      cachedResults.clear();
      for (const id of deptIds) {
        cachedFp.set(id, deptKey(id, positions, config));
        cachedResults.set(
          id,
          all.filter((r) => r.departmentId === id),
        );
      }
      return deptIds.flatMap((id) => cachedResults.get(id) ?? []);
    }

    await Promise.all(
      dirty.map(async (id) => {
        const rs = await computeDept(id, positions, config);
        cachedFp.set(id, deptKey(id, positions, config));
        cachedResults.set(id, rs);
      }),
    );

    return deptIds.flatMap((id) => cachedResults.get(id) ?? []);
  };

  run.invalidate = () => {
    cachedConfig = '';
    cachedFp.clear();
    cachedResults.clear();
    lastDirty = [];
  };

  run.lastDirtyDepartmentIds = () => lastDirty;

  return run;
}
