import { describe, expect, it, vi } from 'vitest';
import {
  adaptChunkSize,
  recommendChunkSize,
  recommendWorkerPoolSize,
} from './poolSizing.js';
import { createPooledArrayMapper, mapArrayInPool, mapArrayItems, createPooledItemMapper } from './mapArrayFacade.js';
import { mapFlatRowsInPool } from './flatRowsPool.js';
import type { FlatDiagramRow } from '../mappers/flatToDiagram.js';
import { WorkerPool } from './bridge.js';

describe('poolSizing', () => {
  it('success: recommendWorkerPoolSize leaves a core and caps at 4', () => {
    expect(recommendWorkerPoolSize(8)).toBe(4);
    expect(recommendWorkerPoolSize(4)).toBe(3);
    expect(recommendWorkerPoolSize(2)).toBe(2);
    expect(recommendWorkerPoolSize(1)).toBe(2);
  });

  it('success: recommendChunkSize grows with input but stays capped', () => {
    expect(recommendChunkSize(100)).toBeGreaterThanOrEqual(500);
    expect(recommendChunkSize(500_000)).toBeLessThanOrEqual(25_000);
  });

  it('success: adaptChunkSize shrinks when slow', () => {
    expect(adaptChunkSize(10_000, 400, { targetChunkMs: 120 })).toBeLessThan(10_000);
  });

  it('failure: non-finite / empty inputs get safe floors', () => {
    expect(recommendChunkSize(0)).toBe(500);
    expect(adaptChunkSize(1000, Number.NaN)).toBe(1000);
  });
});

describe('mapArrayInPool facade', () => {
  it('success: generic mapper chunks on main and merges', async () => {
    const map = createPooledArrayMapper<number, number, number>({
      mapChunk: (chunk) => chunk.reduce((a, b) => a + b, 0),
      merge: (parts) => parts.reduce((a, b) => a + b, 0),
      useWorker: false,
      chunkSize: 3,
    });
    const result = await map([1, 2, 3, 4, 5]);
    expect(result.data).toBe(15);
    expect(result.chunkCount).toBe(2);
    expect(result.usedWorker).toBe(false);
    expect(result.recommendedNextChunkSize).toBeGreaterThan(0);
  });

  it('success: mapArrayInPool with mock worker pool', async () => {
    const factory = () => {
      let onMessage: (ev: MessageEvent) => void = () => {};
      return {
        postMessage: vi.fn((req: { id: string; mapperKey?: string; payload: unknown }) => {
          queueMicrotask(() => {
            const chunk = req.payload as number[];
            onMessage({
              data: {
                id: req.id,
                ok: true,
                result: chunk.map((n) => n * 2),
                durationMs: 5,
              },
            } as MessageEvent);
          });
        }),
        addEventListener: vi.fn((_e: string, fn: (ev: MessageEvent) => void) => {
          onMessage = fn;
        }),
        removeEventListener: vi.fn(),
        terminate: vi.fn(),
      } as unknown as Worker;
    };

    const pool = new WorkerPool(factory, 2);
    const result = await mapArrayInPool<number, number[], number[]>(
      [1, 2, 3, 4],
      {
        mapperKey: 'double',
        mapChunk: (chunk) => chunk.map((n) => n * 2),
        merge: (parts) => parts.flat(),
        chunkSize: 2,
      },
      { pool, useWorker: true },
    );
    expect(result.data).toEqual([2, 4, 6, 8]);
    expect(result.usedWorker).toBe(true);
    expect(result.chunkCount).toBe(2);
    pool.dispose();
  });

  it('failure: empty array merges to empty seed', async () => {
    const result = await mapArrayInPool<number, number, number>(
      [],
      {
        mapChunk: () => 1,
        merge: (parts) => parts.length,
        useWorker: false,
      },
    );
    expect(result.data).toBe(0);
    expect(result.chunkCount).toBe(0);
  });
});

describe('mapArrayItems / createPooledItemMapper', () => {
  it('success: array + mapItem produces flat mapped results', async () => {
    const { data, chunkCount } = await mapArrayItems([1, 2, 3, 4, 5], (n) => n * 10, {
      chunkSize: 2,
    });
    expect(data).toEqual([10, 20, 30, 40, 50]);
    expect(chunkCount).toBe(3);
  });

  it('success: createPooledItemMapper with custom merge', async () => {
    const sumIds = createPooledItemMapper({
      mapItem: (row: { id: number }) => row.id,
      merge: (ids) => ids.reduce((a, b) => a + b, 0),
      chunkSize: 2,
    });
    const { data } = await sumIds([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(data).toBe(6);
  });

  it('failure: empty array + mapItem → []', async () => {
    const { data, chunkCount } = await mapArrayItems([], (n: number) => n);
    expect(data).toEqual([]);
    expect(chunkCount).toBe(0);
  });
});

describe('mapFlatRowsInPool', () => {
  it('success: falls back to main when worker errors', async () => {
    const rows: FlatDiagramRow[] = Array.from({ length: 5 }, (_, i) => ({
      id: `org-${i}`,
      kind: 'organization',
      label: `Org ${i}`,
    }));
    const badFactory = () => {
      let onMessage: (ev: MessageEvent) => void = () => {};
      return {
        postMessage: vi.fn((req: { id: string }) => {
          queueMicrotask(() => {
            onMessage({
              data: { id: req.id, ok: false, error: 'boom' },
            } as MessageEvent);
          });
        }),
        addEventListener: vi.fn((_e: string, fn: (ev: MessageEvent) => void) => {
          onMessage = fn;
        }),
        removeEventListener: vi.fn(),
        terminate: vi.fn(),
      } as unknown as Worker;
    };

    const pool = new WorkerPool(badFactory, 1);
    const result = await mapFlatRowsInPool(rows, { pool, chunkSize: 2, useWorker: true });
    expect(result.data.organizations).toHaveLength(5);
    expect(result.usedWorker).toBe(false);
    pool.dispose();
  });
});
