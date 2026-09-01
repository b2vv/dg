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

/** Per-item mapper (what hosts usually write). */
export type ItemMapperFn<TItem, TOut> = (item: TItem) => TOut | Promise<TOut>;

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

export interface PooledItemMapperConfig<TItem, TOut, TFinal = TOut[]> {
  /** Map one item → one result. Facade chunks the array for you. */
  mapItem: ItemMapperFn<TItem, TOut>;
  /**
   * Combine flat item results (default: identity array).
   * Called once with all mapped items in order.
   */
  merge?: (results: TOut[]) => TFinal | Promise<TFinal>;
  /**
   * Optional worker registry key that maps `TItem[] → TOut[]`
   * (same semantics as `chunk.map(mapItem)`). Closures cannot cross workers.
   */
  mapperKey?: string;
  workerFactory?: () => Worker;
  poolSize?: number;
  chunkSize?: number;
  chunkSizeOptions?: ChunkSizeOptions;
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
 * Facade for the common case: `array500k + mapItem` — chunks/pool/merge are internal.
 *
 * @example
 * const mapPeople = createPooledItemMapper({
 *   mapItem: (row) => ({ id: row.id, name: row.label }),
 * });
 * const { data } = await mapPeople(rows500k);
 *
 * // one-shot:
 * await mapArrayItems(rows500k, (row) => transform(row));
 */
export function createPooledItemMapper<TItem, TOut, TFinal = TOut[]>(
  config: PooledItemMapperConfig<TItem, TOut, TFinal>,
): (items: TItem[], options?: PooledMapOptions) => Promise<PooledMapResult<TFinal>> {
  const mapChunk: ChunkMapperFn<TItem, TOut[]> = async (chunk) => {
    const out: TOut[] = Array.from({ length: chunk.length });
    for (let i = 0; i < chunk.length; i += 1) {
      out[i] = await config.mapItem(chunk[i]!);
    }
    return out;
  };

  const mergeParts: ChunkMergeFn<TOut[], TFinal> = async (parts) => {
    const flat = parts.flat();
    if (config.merge) return config.merge(flat);
    return flat as unknown as TFinal;
  };

  return createPooledArrayMapper<TItem, TOut[], TFinal>({
    mapperKey: config.mapperKey,
    mapChunk,
    merge: mergeParts,
    workerFactory: config.workerFactory,
    poolSize: config.poolSize,
    chunkSize: config.chunkSize,
    chunkSizeOptions: config.chunkSizeOptions,
    // Without mapperKey, stay on main (mapItem is a closure).
    useWorker: config.mapperKey ? (config.useWorker ?? true) : false,
  });
}

/** One-shot: `mapArrayItems(array500k, mapItem)`. */
export function mapArrayItems<TItem, TOut, TFinal = TOut[]>(
  items: TItem[],
  mapItem: ItemMapperFn<TItem, TOut>,
  options?: PooledMapOptions & {
    merge?: (results: TOut[]) => TFinal | Promise<TFinal>;
    mapperKey?: string;
    workerFactory?: () => Worker;
    chunkSizeOptions?: ChunkSizeOptions;
  },
): Promise<PooledMapResult<TFinal>> {
  const { merge, mapperKey, workerFactory, chunkSizeOptions, ...runOpts } = options ?? {};
  return createPooledItemMapper<TItem, TOut, TFinal>({
    mapItem,
    merge,
    mapperKey,
    workerFactory,
    chunkSizeOptions,
    poolSize: runOpts.poolSize,
    chunkSize: runOpts.chunkSize,
    useWorker: runOpts.useWorker,
  })(items, runOpts);
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
  const out: TChunkOut[] = Array.from({ length: chunks.length });
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
