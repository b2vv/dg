import type { ContourMagnetConfig, ContourPositionInput, DeptContourResult } from './bridge.js';
import { toRustConfig } from './config.js';

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

function deptKey(departmentId: string, positions: ContourPositionInput[]): string {
  const cells = positions
    .filter((p) => p.departmentId === departmentId)
    .map((p) => `${p.id}:${p.col},${p.row}`)
    .sort();
  return cells.join('|');
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
      const fp = deptKey(id, positions);
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
        cachedFp.set(id, deptKey(id, positions));
        cachedResults.set(
          id,
          all.filter((r) => r.departmentId === id),
        );
      }
      return all;
    }

    await Promise.all(
      dirty.map(async (id) => {
        const rs = await computeDept(id, positions, config);
        cachedFp.set(id, deptKey(id, positions));
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
