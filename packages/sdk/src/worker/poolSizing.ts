/** Leave cores for UI + browser; never spawn a huge pool. */
export function recommendWorkerPoolSize(
  hardwareConcurrency = typeof navigator === 'undefined'
    ? 4
    : navigator.hardwareConcurrency,
): number {
  const cores = Number.isFinite(hardwareConcurrency) && hardwareConcurrency > 0
    ? Math.floor(hardwareConcurrency)
    : 4;
  return Math.min(4, Math.max(2, cores - 1));
}

export interface ChunkSizeOptions {
  /** Target CPU time per chunk (ms). Default 120. */
  targetChunkMs?: number;
  /** Floor. Default 500. */
  minChunkSize?: number;
  /** Cap. Default 25_000. */
  maxChunkSize?: number;
  /** Heuristic items/ms when no timing yet. Default 40. */
  itemsPerMs?: number;
}

/** Initial chunk size from item count (no timing yet). */
export function recommendChunkSize(
  itemCount: number,
  options: ChunkSizeOptions = {},
): number {
  const min = Math.max(1, options.minChunkSize ?? 500);
  const max = Math.max(min, options.maxChunkSize ?? 25_000);
  const targetMs = Math.max(30, options.targetChunkMs ?? 120);
  const itemsPerMs = Math.max(1, options.itemsPerMs ?? 40);

  if (!Number.isFinite(itemCount) || itemCount <= 0) return min;

  // Prefer ~targetMs of work, but also keep chunk count reasonable (≤ ~200).
  const byTime = Math.round(targetMs * itemsPerMs);
  const byCount = Math.ceil(itemCount / 200);
  const raw = Math.max(byTime, byCount);
  return clamp(raw, min, max);
}

/**
 * Adjust chunk size after observing one chunk duration.
 * Slow → shrink; fast → grow (within min/max).
 */
export function adaptChunkSize(
  currentChunkSize: number,
  durationMs: number,
  options: ChunkSizeOptions = {},
): number {
  const min = Math.max(1, options.minChunkSize ?? 500);
  const max = Math.max(min, options.maxChunkSize ?? 25_000);
  const targetMs = Math.max(30, options.targetChunkMs ?? 120);
  const size = Math.max(1, currentChunkSize);

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return clamp(size, min, max);
  }

  // duration / target ≈ how oversized the chunk was.
  const factor = targetMs / durationMs;
  const next = Math.round(size * clamp(factor, 0.5, 2));
  return clamp(next, min, max);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
