import { describe, expect, it, vi } from 'vitest';
import type { DiagramData } from '../data/types.js';
import {
  buildSearchIndex,
  flattenPositionSearchRows,
  mergeSearchIndexes,
  searchIndex,
  searchIndexFromDTO,
  searchIndexToDTO,
} from './searchIndex.js';
import {
  buildSearchIndexInPool,
  buildSearchIndexInWorker,
  configureSearchWorker,
  handleBuildSearchIndex,
  handleBuildSearchIndexPositions,
  resetSearchWorkerForTests,
  searchHandlerKeys,
} from './searchWorker.js';
import { WorkerPool } from '../worker/bridge.js';

function sampleData(): DiagramData {
  return {
    organizations: [{ id: 'root', name: 'Root Co', groupIds: [] }],
    groups: [],
    departments: [{ id: 'IT', name: 'IT', organizationId: 'root' }],
    persons: [{ id: 'p1', fullName: 'Alice Smith' }],
    positions: [
      {
        id: 'pos1',
        title: 'CEO',
        organizationId: 'root',
        departmentId: 'IT',
        groupIds: [],
        personId: 'p1',
        status: 'filled',
        isTemporary: false,
        gridCell: { col: 1, row: 2 },
      },
      {
        id: 'pos2',
        title: 'Dev',
        organizationId: 'root',
        departmentId: 'IT',
        groupIds: [],
        status: 'vacant',
        isTemporary: false,
        gridCell: { col: 2, row: 2 },
      },
    ],
    reportLines: [],
  };
}

function mockWorker(handlerFn: (payload: unknown, key: string) => unknown): Worker {
  let onMessage: (ev: MessageEvent) => void = () => {};
  return {
    postMessage: vi.fn((req: { id: string; mapperKey?: string; payload: unknown }) => {
      queueMicrotask(() => {
        try {
          const result = handlerFn(req.payload, req.mapperKey ?? '');
          onMessage({ data: { id: req.id, ok: true, result } } as MessageEvent);
        } catch (err) {
          onMessage({
            data: {
              id: req.id,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
          } as MessageEvent);
        }
      });
    }),
    addEventListener: vi.fn((event: string, fn: (ev: MessageEvent) => void) => {
      if (event === 'message') onMessage = fn;
    }),
    removeEventListener: vi.fn(),
    terminate: vi.fn(),
  } as unknown as Worker;
}

describe('searchIndex merge / DTO', () => {
  it('success: merge remaps byChar and keeps Alice searchable', () => {
    const data = sampleData();
    const full = buildSearchIndex(data);
    const a = buildSearchIndex({ ...data, positions: data.positions.slice(0, 1), persons: data.persons });
    const b = buildSearchIndex({
      ...data,
      organizations: [],
      positions: data.positions.slice(1),
      persons: data.persons,
    });
    const merged = mergeSearchIndexes([a, b]);
    expect(merged.entries.length).toBe(full.entries.length);
    expect(searchIndex(merged, 'Alice').some((h) => h.label.includes('Alice'))).toBe(true);
  });

  it('success: DTO round-trip', () => {
    const idx = buildSearchIndex(sampleData());
    const again = searchIndexFromDTO(searchIndexToDTO(idx));
    expect(searchIndex(again, 'Dev').map((h) => h.label)).toEqual(
      searchIndex(idx, 'Dev').map((h) => h.label),
    );
  });

  it('failure: merge empty parts → empty index', () => {
    expect(mergeSearchIndexes([]).entries).toEqual([]);
  });
});

describe('search worker handlers', () => {
  it('success: handleBuildSearchIndex returns DTO with entries', () => {
    const dto = handleBuildSearchIndex(sampleData());
    expect(dto.entries.length).toBeGreaterThan(0);
    expect(Array.isArray(dto.byChar)).toBe(true);
  });

  it('success: position rows handler matches flatten path', () => {
    const data = sampleData();
    const rows = flattenPositionSearchRows(data.positions, data.persons);
    const dto = handleBuildSearchIndexPositions(rows);
    expect(dto.entries.length).toBe(rows.length * 2);
  });
});

describe('search worker bridge', () => {
  it('success: buildSearchIndexInWorker via mock', async () => {
    resetSearchWorkerForTests();
    const worker = mockWorker((payload, key) => {
      expect(key).toBe(searchHandlerKeys.buildSearchIndex);
      return handleBuildSearchIndex(payload as DiagramData);
    });
    configureSearchWorker({ workerFactory: () => worker, fallbackToMainThread: false });
    const idx = await buildSearchIndexInWorker(sampleData());
    expect(searchIndex(idx, 'Alice').length).toBeGreaterThan(0);
    resetSearchWorkerForTests();
  });

  it('success: buildSearchIndexInPool merges chunks', async () => {
    const factory = () =>
      mockWorker((payload, key) => {
        expect(key).toBe(searchHandlerKeys.buildSearchIndexPositions);
        expect(Array.isArray(payload)).toBe(true);
        return handleBuildSearchIndexPositions(
          payload as ReturnType<typeof flattenPositionSearchRows>,
        );
      });
    const pool = new WorkerPool(factory, 2);
    const idx = await buildSearchIndexInPool(pool, sampleData(), 1);
    expect(searchIndex(idx, 'Alice').length).toBeGreaterThan(0);
    expect(searchIndex(idx, 'Root').length).toBeGreaterThan(0);
    pool.dispose();
  });

  it('failure: worker error falls back to async main', async () => {
    resetSearchWorkerForTests();
    const worker = mockWorker(() => {
      throw new Error('boom');
    });
    configureSearchWorker({ workerFactory: () => worker, fallbackToMainThread: true });
    const idx = await buildSearchIndexInWorker(sampleData());
    expect(searchIndex(idx, 'Alice').length).toBeGreaterThan(0);
    resetSearchWorkerForTests();
  });
});
