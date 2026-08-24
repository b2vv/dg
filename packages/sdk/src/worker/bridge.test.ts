import { describe, expect, it } from 'vitest';
import { mapInWorker } from './bridge.js';

describe('mapInWorker', () => {
  it('success: resolves when worker posts ok for the request id', async () => {
    const listeners = new Map<string, Set<EventListener>>();
    let posted: { id: string } | null = null;
    const worker = {
      addEventListener(type: string, fn: EventListener) {
        let set = listeners.get(type);
        if (!set) {
          set = new Set();
          listeners.set(type, set);
        }
        set.add(fn);
      },
      removeEventListener(type: string, fn: EventListener) {
        listeners.get(type)?.delete(fn);
      },
      postMessage(req: { id: string }) {
        posted = req;
        queueMicrotask(() => {
          for (const fn of listeners.get('message') ?? []) {
            fn(
              new MessageEvent('message', {
                data: { id: req.id, ok: true, result: { n: 2 } },
              }),
            );
          }
        });
      },
      terminate() {},
    } as unknown as Worker;

    await expect(mapInWorker(worker, 'inc', { n: 1 }, undefined, 5_000)).resolves.toEqual({
      n: 2,
    });
    expect(posted?.id).toMatch(/^map-/);
  });

  it('failure: rejects immediately on worker error event (A3)', async () => {
    const listeners = new Map<string, Set<EventListener>>();
    const worker = {
      addEventListener(type: string, fn: EventListener) {
        let set = listeners.get(type);
        if (!set) {
          set = new Set();
          listeners.set(type, set);
        }
        set.add(fn);
      },
      removeEventListener(type: string, fn: EventListener) {
        listeners.get(type)?.delete(fn);
      },
      postMessage() {
        queueMicrotask(() => {
          for (const fn of listeners.get('error') ?? []) {
            fn(new ErrorEvent('error', { message: 'ChunkLoadError' }));
          }
        });
      },
      terminate() {},
    } as unknown as Worker;

    await expect(mapInWorker(worker, 'any', null, undefined, 120_000)).rejects.toThrow(
      /ChunkLoadError|Worker error/i,
    );
  });

  it('failure: rejects immediately on messageerror', async () => {
    const listeners = new Map<string, Set<EventListener>>();
    const worker = {
      addEventListener(type: string, fn: EventListener) {
        let set = listeners.get(type);
        if (!set) {
          set = new Set();
          listeners.set(type, set);
        }
        set.add(fn);
      },
      removeEventListener(type: string, fn: EventListener) {
        listeners.get(type)?.delete(fn);
      },
      postMessage() {
        queueMicrotask(() => {
          for (const fn of listeners.get('messageerror') ?? []) {
            fn(new MessageEvent('messageerror'));
          }
        });
      },
      terminate() {},
    } as unknown as Worker;

    await expect(mapInWorker(worker, 'any', null, undefined, 120_000)).rejects.toThrow(
      /messageerror|Worker/i,
    );
  });

  it('failure: rejects on ok:false message', async () => {
    const listeners = new Map<string, Set<EventListener>>();
    const worker = {
      addEventListener(type: string, fn: EventListener) {
        let set = listeners.get(type);
        if (!set) {
          set = new Set();
          listeners.set(type, set);
        }
        set.add(fn);
      },
      removeEventListener(type: string, fn: EventListener) {
        listeners.get(type)?.delete(fn);
      },
      postMessage(req: { id: string }) {
        queueMicrotask(() => {
          for (const fn of listeners.get('message') ?? []) {
            fn(
              new MessageEvent('message', {
                data: { id: req.id, ok: false, error: 'boom' },
              }),
            );
          }
        });
      },
      terminate() {},
    } as unknown as Worker;

    await expect(mapInWorker(worker, 'any', null, undefined, 5_000)).rejects.toThrow(/boom/);
  });
});
