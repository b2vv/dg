import { WorkerPool, chunkArray } from './bridge.js';
import { createTransformWorker } from './createWorker.js';
import {
  adaptChunkSize,
  recommendChunkSize,
  recommendWorkerPoolSize,
  type ChunkSizeOptions,
} from './poolSizing.js';

export type ChunkMapperFn<TItem, TChunkOut> = (
  chunk: TItem[],
) => TChunkOut | Promise<TChunkOut>;

export type ChunkMergeFn<TChunkOut, TOut> = (parts: TChunkOut[]) => TOut | Promise<TOut>;

export interface PooledArrayMapperConfig<TItem, TChunkOut, TOut> {
  /**
   * Registry key in transform.worker.ts (used when running in workers).
   * If omitted, always runs `mapChunk` on the main thread.
   */
  mapperKey?: string;
  /** Pure chunk mapper (also used as main-thread fallback). */
  mapChunk: ChunkMapperFn<TItem, TChunkOut>;
  /** Combine ordered chunk results into the final value. */
  merge: ChunkMergeFn<TChunkOut, TOut>;
  workerFactory?: () => Worker;
  poolSize?: number;
  chunkSize?: number;
  chunkSizeOptions?: ChunkSizeOptions;
  /** Prefer workers when `mapperKey` + Worker exist (default true). */
  useWorker?: boolean;
}

export interface PooledMapOptions {
  poolSize?: number;
  chunkSize?: number;
  /** Reuse an existing pool (caller owns dispose). */
  pool?: WorkerPool | null;
  useWorker?: boolean;
}

export interface PooledMapResult<TOut> {
  data: TOut;
  poolSize: number;
  chunkSize: number;
  chunkCount: number;
  totalDurationMs: number;
  avgChunkMs: number;
  /** Suggested chunk size for the next similar run. */
  recommendedNextChunkSize: number;
  usedWorker: boolean;
}

/**
 * Dumb generic facade: pass an array → auto chunk + N workers (or main fallback) → merge.
 *
 * @example
 * const mapRows = createPooledArrayMapper({
 *   mapperKey: 'flatRowsToDiagram',
 *   mapChunk: flatRowsToDiagram,
 *   merge: (parts) => parts.reduce(mergeDiagramData, emptyDiagramData()),
 * });
 * const { data } = await mapRows(rows);
 */
export function createPooledArrayMapper<TItem, TChunkOut, TOut>(
  config: PooledArrayMapperConfig<TItem, TChunkOut, TOut>,
): (items: TItem[], options?: PooledMapOptions) => Promise<PooledMapResult<TOut>> {
  return (items, options) => mapArrayInPool(items, config, options);
}

/**
 * One-shot facade (same as createPooledArrayMapper(...)(items, options)).
 */
export async function mapArrayInPool<TItem, TChunkOut, TOut>(
  items: TItem[],
  config: PooledArrayMapperConfig<TItem, TChunkOut, TOut>,
  options: PooledMapOptions = {},
): Promise<PooledMapResult<TOut>> {
  const started = now();
  const poolSize = Math.max(
    1,
    options.poolSize ?? config.poolSize ?? recommendWorkerPoolSize(),
  );
  const chunkSize = Math.max(
    1,
    options.chunkSize ??
      config.chunkSize ??
      recommendChunkSize(items.length, config.chunkSizeOptions),
  );
  const useWorker =
    (options.useWorker ?? config.useWorker ?? true) &&
    Boolean(config.mapperKey) &&
    (Boolean(options.pool) || typeof Worker !== 'undefined');

  if (items.length === 0) {
    const data = await config.merge([]);
    return {
      data,
      poolSize,
      chunkSize,
      chunkCount: 0,
      totalDurationMs: now() - started,
      avgChunkMs: 0,
      recommendedNextChunkSize: chunkSize,
      usedWorker: false,
    };
  }

  const chunkCount = chunkArray(items, chunkSize).length;
  let parts: TChunkOut[];
  let usedWorker = false;

  if (useWorker && config.mapperKey) {
    const ownsPool = !options.pool;
    const pool =
      options.pool ??
      new WorkerPool(config.workerFactory ?? createTransformWorker, poolSize);
    try {
      parts = await pool.mapChunks<TItem, TChunkOut>(config.mapperKey, items, chunkSize);
      usedWorker = true;
    } catch {
      // Worker path failed (timeout / postMessage) — fall back to main-thread chunks.
      parts = await mapChunksOnMain(chunkArray(items, chunkSize), config.mapChunk);
      usedWorker = false;
    } finally {
      if (ownsPool) pool.dispose();
    }
  } else {
    parts = await mapChunksOnMain(chunkArray(items, chunkSize), config.mapChunk);
  }

  const data = await config.merge(parts);
  const totalDurationMs = now() - started;
  const avgChunkMs = totalDurationMs / Math.max(1, chunkCount);

  return {
    data,
    poolSize: usedWorker ? poolSize : 1,
    chunkSize,
    chunkCount,
    totalDurationMs,
    avgChunkMs,
    recommendedNextChunkSize: adaptChunkSize(chunkSize, avgChunkMs, config.chunkSizeOptions),
    usedWorker,
  };
}

async function mapChunksOnMain<TItem, TChunkOut>(
  chunks: TItem[][],
  mapChunk: ChunkMapperFn<TItem, TChunkOut>,
): Promise<TChunkOut[]> {
  const out: TChunkOut[] = new Array(chunks.length);
  for (let i = 0; i < chunks.length; i += 1) {
    out[i] = await mapChunk(chunks[i]!);
    await Promise.resolve();
  }
  return out;
}

function now(): number {
  return typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();
}
