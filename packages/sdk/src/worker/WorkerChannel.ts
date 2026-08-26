import { mapInWorker } from './bridge.js';
import { createTransformWorker } from './createWorker.js';

export interface WorkerChannelOptions {
  workerFactory?: () => Worker;
  timeoutMs?: number;
  /** Run the work on the main thread when the worker fails (default true). */
  fallbackToMainThread?: boolean;
}

/**
 * One worker, owned by whoever created the channel.
 *
 * The contour and search bridges used to keep a module-level worker plus
 * module-level options, so a second diagram on the page **terminated the first
 * one's worker** and replaced its factory. A channel makes that ownership
 * explicit: a diagram holds its own, disposes its own, and cannot reach into
 * anyone else's.
 */
export class WorkerChannel {
  private worker: Worker | null = null;
  private opts: Required<WorkerChannelOptions>;

  constructor(defaults: Required<WorkerChannelOptions>, overrides?: WorkerChannelOptions) {
    this.opts = { ...defaults, ...overrides };
  }

  get options(): Required<WorkerChannelOptions> {
    return this.opts;
  }

  /** Replace options; the current worker is dropped so the new factory applies. */
  reconfigure(defaults: Required<WorkerChannelOptions>, overrides?: WorkerChannelOptions): void {
    this.opts = { ...defaults, ...overrides };
    this.dispose();
  }

  /**
   * Run one job. `onFallback` is used when the worker fails and fallback is on —
   * the caller supplies it because only the caller knows the main-thread twin.
   */
  async run<TIn, TOut>(
    key: string,
    payload: TIn,
    onFallback: () => TOut | Promise<TOut>,
  ): Promise<TOut> {
    try {
      return await mapInWorker<TIn, TOut>(
        this.ensureWorker(),
        key,
        payload,
        undefined,
        this.opts.timeoutMs,
      );
    } catch (err) {
      if (this.opts.fallbackToMainThread) return onFallback();
      throw err;
    }
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private ensureWorker(): Worker {
    if (!this.worker) this.worker = this.opts.workerFactory();
    return this.worker;
  }
}

export const WORKER_CHANNEL_DEFAULTS: Required<WorkerChannelOptions> = {
  workerFactory: createTransformWorker,
  timeoutMs: 30_000,
  fallbackToMainThread: true,
};
