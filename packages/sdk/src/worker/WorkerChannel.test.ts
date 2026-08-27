import { describe, expect, it, rstest } from '@rstest/core';
import { WorkerChannel, WORKER_CHANNEL_DEFAULTS } from './WorkerChannel.js';

/** Worker stand-in: answers the first message, or never answers at all. */
function fakeWorker(behaviour: 'reply' | 'silent' = 'reply') {
  const listeners = new Map<string, ((e: unknown) => void)[]>();
  const worker = {
    terminated: false,
    postMessage(msg: { id: string }) {
      if (behaviour !== 'reply') return;
      queueMicrotask(() => {
        for (const fn of listeners.get('message') ?? []) {
          fn({ data: { id: msg.id, ok: true, result: 'from-worker' } });
        }
      });
    },
    addEventListener(type: string, fn: (e: unknown) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    removeEventListener() {},
    terminate() {
      worker.terminated = true;
    },
  };
  return worker;
}

const defaults = { ...WORKER_CHANNEL_DEFAULTS, timeoutMs: 50 };

describe('WorkerChannel', () => {
  it('success: builds its worker once and reuses it', async () => {
    const worker = fakeWorker();
    const factory = rstest.fn(() => worker as unknown as Worker);
    const channel = new WorkerChannel({ ...defaults, workerFactory: factory });

    expect(await channel.run('k', 1, () => 'fallback')).toBe('from-worker');
    expect(await channel.run('k', 2, () => 'fallback')).toBe('from-worker');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('success: two channels are independent — one dispose does not touch the other', async () => {
    const a = fakeWorker();
    const b = fakeWorker();
    const chA = new WorkerChannel({ ...defaults, workerFactory: () => a as unknown as Worker });
    const chB = new WorkerChannel({ ...defaults, workerFactory: () => b as unknown as Worker });

    await chA.run('k', 1, () => 'fallback');
    await chB.run('k', 1, () => 'fallback');
    chA.dispose();

    expect(a.terminated).toBe(true);
    expect(b.terminated).toBe(false);
    // B keeps working after A is gone — the regression this class exists for.
    expect(await chB.run('k', 2, () => 'fallback')).toBe('from-worker');
  });

  it('success: reconfigure drops the old worker so the new factory applies', async () => {
    const first = fakeWorker();
    const second = fakeWorker();
    const channel = new WorkerChannel({ ...defaults, workerFactory: () => first as unknown as Worker });
    await channel.run('k', 1, () => 'fallback');

    channel.reconfigure({ ...defaults, workerFactory: () => second as unknown as Worker });
    await channel.run('k', 2, () => 'fallback');

    expect(first.terminated).toBe(true);
    expect(second.terminated).toBe(false);
  });

  it('failure: a dead worker falls back, and without fallback it throws', async () => {
    const silent = () => fakeWorker('silent') as unknown as Worker;
    const withFallback = new WorkerChannel({ ...defaults, workerFactory: silent });
    expect(await withFallback.run('k', 1, () => 'fallback')).toBe('fallback');

    const strict = new WorkerChannel({
      ...defaults,
      workerFactory: silent,
      fallbackToMainThread: false,
    });
    await expect(strict.run('k', 1, () => 'fallback')).rejects.toThrow();
  });
});
