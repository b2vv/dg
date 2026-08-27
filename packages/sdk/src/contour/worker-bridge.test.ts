import { describe, expect, it, rstest, beforeEach, afterEach } from '@rstest/core';
import {
  computeDeptContourInWorker,
  computeAllContoursInWorker,
  configureContourWorker,
  resetContourWorkerForTests,
} from './worker-bridge.js';
import { VARIANT_B_POSITIONS } from './bridge.js';

function createMockWorker(handler: (req: { mapperKey?: string; payload?: unknown }) => unknown) {
  const listeners: Array<(ev: MessageEvent) => void> = [];
  return {
    postMessage: rstest.fn((req: { id: string; mapperKey?: string; payload?: unknown }) => {
      queueMicrotask(() => {
        try {
          const result = handler(req);
          Promise.resolve(result).then((data) => {
            listeners.forEach((fn) =>
              fn({ data: { id: req.id, ok: true, result: data } } as MessageEvent),
            );
          });
        } catch (err) {
          listeners.forEach((fn) =>
            fn({
              data: {
                id: req.id,
                ok: false,
                error: err instanceof Error ? err.message : String(err),
              },
            } as MessageEvent),
          );
        }
      });
    }),
    addEventListener: rstest.fn((event: string, fn: (ev: MessageEvent) => void) => {
      if (event === 'message') listeners.push(fn);
    }),
    removeEventListener: rstest.fn(),
    terminate: rstest.fn(),
  } as unknown as Worker;
}

describe('computeDeptContourInWorker', () => {
  beforeEach(() => resetContourWorkerForTests());
  afterEach(() => resetContourWorkerForTests());

  it('success: returns path M…Z via worker', async () => {
    configureContourWorker({
      workerFactory: () =>
        createMockWorker((req) => {
          if (req.mapperKey === 'computeDeptContour') {
            return {
              departmentId: 'IT',
              path: 'M 0 0 L 100 0 Z',
              points: [],
              cornerCount: 4,
            };
          }
          throw new Error('unknown');
        }),
      fallbackToMainThread: false,
    });

    const result = await computeDeptContourInWorker('IT', VARIANT_B_POSITIONS, {
      smoothIterations: 0,
      magnetRadius: 2,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.path.startsWith('M')).toBe(true);
    expect(result[0]!.path.endsWith('Z')).toBe(true);
  });

  it('failure: worker error falls back to main thread by default', async () => {
    configureContourWorker({
      workerFactory: () =>
        createMockWorker(() => {
          throw new Error('worker boom');
        }),
      fallbackToMainThread: true,
    });

    const result = await computeDeptContourInWorker('IT', VARIANT_B_POSITIONS, {
      smoothIterations: 0,
      magnetRadius: 2,
    });
    expect(result[0]!.departmentId).toBe('IT');
    expect(result[0]!.path.length).toBeGreaterThan(0);
  });

  it('failure: rejects on timeout when no fallback', async () => {
    configureContourWorker({
      workerFactory: () =>
        ({
          postMessage: rstest.fn(),
          addEventListener: rstest.fn(),
          removeEventListener: rstest.fn(),
          terminate: rstest.fn(),
        }) as unknown as Worker,
      fallbackToMainThread: false,
      timeoutMs: 50,
    });

    await expect(
      computeDeptContourInWorker('IT', VARIANT_B_POSITIONS, { smoothIterations: 0 }),
    ).rejects.toThrow(/timeout/i);
  });
});

describe('computeAllContoursInWorker', () => {
  beforeEach(() => resetContourWorkerForTests());
  afterEach(() => resetContourWorkerForTests());

  it('failure: empty positions returns empty array', async () => {
    configureContourWorker({
      workerFactory: () =>
        createMockWorker((req) => {
          if (req.mapperKey === 'computeAllContours') return [];
          throw new Error('unknown');
        }),
      fallbackToMainThread: false,
    });

    const result = await computeAllContoursInWorker([]);
    expect(result).toEqual([]);
  });
});
