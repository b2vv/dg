import type { DiagramData } from '../data/types.js';
import { WorkerPool } from '../worker/bridge.js';
import { createTransformWorker } from '../worker/createWorker.js';
import { WorkerChannel, type WorkerChannelOptions } from '../worker/WorkerChannel.js';
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

/** Shared channel behind the module functions; see {@link createSearchWorkerClient}. */
let chunkSize = DEFAULT_OPTIONS.chunkSize;
const defaultChannel = new WorkerChannel(channelDefaults());

function channelDefaults(): Required<WorkerChannelOptions> {
  return {
    workerFactory: DEFAULT_OPTIONS.workerFactory,
    timeoutMs: DEFAULT_OPTIONS.timeoutMs,
    fallbackToMainThread: DEFAULT_OPTIONS.fallbackToMainThread,
  };
}

export function configureSearchWorker(opts: SearchWorkerOptions): void {
  chunkSize = opts.chunkSize ?? DEFAULT_OPTIONS.chunkSize;
  defaultChannel.reconfigure(channelDefaults(), opts as WorkerChannelOptions);
}

export function resetSearchWorkerForTests(): void {
  chunkSize = DEFAULT_OPTIONS.chunkSize;
  defaultChannel.reconfigure(channelDefaults());
}

/**
 * An isolated search worker — own factory, own worker, own lifetime. Each
 * diagram builds one instead of reconfiguring the module, which used to
 * terminate the other diagram's worker mid-build.
 */
export function createSearchWorkerClient(opts?: SearchWorkerOptions) {
  const channel = new WorkerChannel(channelDefaults(), opts as WorkerChannelOptions);
  const size = opts?.chunkSize ?? DEFAULT_OPTIONS.chunkSize;
  return {
    buildForScale: (data: DiagramData, scale?: { useWorker?: boolean; pool?: WorkerPool | null }) =>
      buildForScale(channel, size, data, scale),
    dispose: () => channel.dispose(),
  };
}

/** Single-worker full index build. */
export async function buildSearchIndexInWorker(data: DiagramData): Promise<SearchIndex> {
  return runSingleWorkerBuild(defaultChannel, data);
}

async function runSingleWorkerBuild(
  channel: WorkerChannel,
  data: DiagramData,
): Promise<SearchIndex> {
  // The worker answers with a DTO, the fallback with a live index — and a DTO
  // has the same keys, so sniffing the shape returns a Map-less impostor.
  let fellBack = false;
  const result = await channel.run<DiagramData, SearchIndexDTO | SearchIndex>(
    searchHandlerKeys.buildSearchIndex,
    data,
    async () => {
      fellBack = true;
      return buildSearchIndexAsync(data);
    },
  );
  return fellBack ? (result as SearchIndex) : searchIndexFromDTO(result as SearchIndexDTO);
}

/**
 * Parallel position chunks via WorkerPool; orgs stay on main (usually small).
 * Falls back to async main-thread build when worker fails.
 */
export async function buildSearchIndexInPool(
  pool: WorkerPool,
  data: DiagramData,
  rowsPerChunk = chunkSize,
): Promise<SearchIndex> {
  const orgPart = buildOrgSearchIndex(data.organizations);
  const rows = flattenPositionSearchRows(data.positions, data.persons);
  if (rows.length === 0) return orgPart;

  try {
    const dtos = await pool.mapChunks<PositionSearchRow, SearchIndexDTO>(
      searchHandlerKeys.buildSearchIndexPositions,
      rows,
      Math.max(1, rowsPerChunk),
    );
    const parts = dtos.map(searchIndexFromDTO);
    return mergeSearchIndexes([orgPart, ...parts]);
  } catch (err) {
    if (defaultChannel.options.fallbackToMainThread) {
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

  return buildForScale(defaultChannel, chunkSize, data, opts);
}

async function buildForScale(
  channel: WorkerChannel,
  rowsPerChunk: number,
  data: DiagramData,
  opts?: { useWorker?: boolean; pool?: WorkerPool | null },
): Promise<SearchIndex> {
  const useWorker = opts?.useWorker ?? typeof Worker !== 'undefined';
  if (!useWorker) return buildSearchIndexAsync(data);

  if (opts?.pool) {
    try {
      return await buildSearchIndexInPool(opts.pool, data, rowsPerChunk);
    } catch {
      /* fall through to the single worker */
    }
  }
  return runSingleWorkerBuild(channel, data);
}
