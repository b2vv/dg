import type { DiagramData } from '../data/types.js';
import { mapInWorker, WorkerPool } from '../worker/bridge.js';
import { createTransformWorker } from '../worker/createWorker.js';
import {
  buildOrgSearchIndex,
  buildSearchIndexAsync,
  flattenPositionSearchRows,
  mergeSearchIndexes,
  searchIndexFromDTO,
  type PositionSearchRow,
  type SearchIndex,
  type SearchIndexDTO,
} from './searchIndex.js';
import {
  handleBuildSearchIndex,
  handleBuildSearchIndexPositions,
  searchHandlerKeys,
} from './searchHandlers.js';

export {
  handleBuildSearchIndex,
  handleBuildSearchIndexPositions,
  searchHandlerKeys,
} from './searchHandlers.js';

export interface SearchWorkerOptions {
  workerFactory?: () => Worker;
  timeoutMs?: number;
  fallbackToMainThread?: boolean;
  /** Position rows per pool chunk (default 25_000). */
  chunkSize?: number;
}

const DEFAULT_OPTIONS: Required<SearchWorkerOptions> = {
  workerFactory: createTransformWorker,
  timeoutMs: 120_000,
  fallbackToMainThread: true,
  chunkSize: 25_000,
};

let options: Required<SearchWorkerOptions> = { ...DEFAULT_OPTIONS };
let sharedWorker: Worker | null = null;

export function configureSearchWorker(opts: SearchWorkerOptions): void {
  options = { ...DEFAULT_OPTIONS, ...opts };
  if (sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
  }
}

export function resetSearchWorkerForTests(): void {
  options = { ...DEFAULT_OPTIONS };
  if (sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
  }
}

function getWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = options.workerFactory();
  }
  return sharedWorker;
}

/** Single-worker full index build. */
export async function buildSearchIndexInWorker(data: DiagramData): Promise<SearchIndex> {
  try {
    const dto = await mapInWorker<DiagramData, SearchIndexDTO>(
      getWorker(),
      searchHandlerKeys.buildSearchIndex,
      data,
      undefined,
      options.timeoutMs,
    );
    return searchIndexFromDTO(dto);
  } catch (err) {
    if (options.fallbackToMainThread) {
      return buildSearchIndexAsync(data);
    }
    throw err;
  }
}

/**
 * Parallel position chunks via WorkerPool; orgs stay on main (usually small).
 * Falls back to async main-thread build when worker fails.
 */
export async function buildSearchIndexInPool(
  pool: WorkerPool,
  data: DiagramData,
  chunkSize = options.chunkSize,
): Promise<SearchIndex> {
  const orgPart = buildOrgSearchIndex(data.organizations);
  const rows = flattenPositionSearchRows(data.positions, data.persons);
  if (rows.length === 0) return orgPart;

  try {
    const dtos = await pool.mapChunks<PositionSearchRow, SearchIndexDTO>(
      searchHandlerKeys.buildSearchIndexPositions,
      rows,
      Math.max(1, chunkSize),
    );
    const parts = dtos.map(searchIndexFromDTO);
    return mergeSearchIndexes([orgPart, ...parts]);
  } catch (err) {
    if (options.fallbackToMainThread) {
      return buildSearchIndexAsync(data);
    }
    throw err;
  }
}

/** Prefer pool → single worker → async main. */
export async function buildSearchIndexForScale(
  data: DiagramData,
  opts?: {
    useWorker?: boolean;
    pool?: WorkerPool | null;
    workerFactory?: () => Worker;
  },
): Promise<SearchIndex> {
  const useWorker = opts?.useWorker ?? typeof Worker !== 'undefined';
  if (!useWorker) {
    return buildSearchIndexAsync(data);
  }

  if (opts?.workerFactory) {
    configureSearchWorker({ workerFactory: opts.workerFactory });
  }

  if (opts?.pool) {
    try {
      return await buildSearchIndexInPool(opts.pool, data);
    } catch {
      /* fall through */
    }
  }

  return buildSearchIndexInWorker(data);
}
