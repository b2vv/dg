import type { WorkerRequest, WorkerResponse } from './types.js';

let nextId = 0;

export interface WorkerBridgeOptions {
  /** URL worker script (host bundler має emit окремий chunk) */
  workerUrl?: URL | string;
  /** Factory для inline worker (Rsbuild/webpack worker syntax) */
  workerFactory?: () => Worker;
}

/**
 * Мост main ↔ Web Worker для one-shot трансформацій.
 *
 * @example
 * const result = await mapInWorker(myMapper, rawData, { mapperRegistry });
 */
export function mapInWorker<TIn, TOut>(
  worker: Worker,
  mapperKey: string,
  input: TIn,
  transfer?: Transferable[],
  timeoutMs = 120_000,
): Promise<TOut> {
  const id = `map-${++nextId}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      reject(new Error(`Worker timeout: ${mapperKey}`));
    }, timeoutMs);

    const onMessage = (ev: MessageEvent<WorkerResponse<TOut>>) => {
      if (ev.data.id !== id) return;
      clearTimeout(timeout);
      worker.removeEventListener('message', onMessage);
      if (ev.data.ok) {
        resolve(ev.data.result as TOut);
      } else {
        reject(new Error(ev.data.error ?? 'Worker error'));
      }
    };

    worker.addEventListener('message', onMessage);

    const req: WorkerRequest<TIn> = { id, type: 'run-step', mapperKey, payload: input };
    if (transfer?.length) {
      worker.postMessage(req, transfer);
    } else {
      worker.postMessage(req);
    }
  });
}

/** Розбити масив на chunks для паралельної обробки */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * WorkerPool — паралель map chunks (для 2M records).
 * Кожен worker обробляє chunk через той самий mapperKey.
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private queue: number = 0;

  constructor(
    private factory: () => Worker,
    poolSize = navigator.hardwareConcurrency || 4,
  ) {
    for (let i = 0; i < poolSize; i++) {
      this.workers.push(factory());
    }
  }

  async mapChunks<TIn, TOut>(
    mapperKey: string,
    items: TIn[],
    chunkSize: number,
  ): Promise<TOut[]> {
    const chunks = chunkArray(items, chunkSize);
    const results: TOut[] = new Array(chunks.length);
    let nextChunk = 0;

    const runWorker = async (worker: Worker): Promise<void> => {
      while (nextChunk < chunks.length) {
        const idx = nextChunk++;
        const chunk = chunks[idx];
        results[idx] = await mapInWorker<TIn[], TOut>(worker, mapperKey, chunk);
      }
    };

    await Promise.all(this.workers.map(runWorker));
    return results;
  }

  dispose(): void {
    for (const w of this.workers) {
      w.terminate();
    }
    this.workers = [];
  }
}

/** Реєстр mapper functions — передається у worker при init */
export type MapperRegistry = Record<string, (input: unknown) => unknown | Promise<unknown>>;

/** Handler для worker script (import у transform.worker.ts) */
export function createWorkerMessageHandler(registry: MapperRegistry): void {
  self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
    const { id, type, mapperKey, payload } = ev.data;

    if (type === 'dispose') {
      self.close();
      return;
    }

    const start = performance.now();

    try {
      if (type !== 'run-step' || !mapperKey) {
        throw new Error('Invalid worker request');
      }
      const fn = registry[mapperKey];
      if (!fn) throw new Error(`Unknown mapper: ${mapperKey}`);

      const result = await fn(payload);
      const res: WorkerResponse = {
        id,
        ok: true,
        result,
        durationMs: performance.now() - start,
      };
      self.postMessage(res);
    } catch (err) {
      const res: WorkerResponse = {
        id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: performance.now() - start,
      };
      self.postMessage(res);
    }
  };
}
