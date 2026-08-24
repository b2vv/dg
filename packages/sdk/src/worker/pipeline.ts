import type { PipelineResult, PipelineRunOptions } from './types.js';
import { mapInWorker } from './bridge.js';

export type StepFn<TIn, TOut> = (input: TIn) => TOut | Promise<TOut>;

type PipelineStep = {
  name: string;
  fn?: StepFn<unknown, unknown>;
  mapperKey?: string;
};

/**
 * Ланцюжок трансформацій даних.
 * `.runSync()` — main thread; `.runInWorker()` — через mapper keys у worker.
 *
 * @deprecated T77-M09: no renderer consumers (M01 Option B removed contour
 * compute from DiagramRenderer). Kept for backward compatibility; will be
 * removed in next major. Prefer direct `mapInWorker` calls.
 */
export class WorkerPipeline<TIn, TOut = TIn> {
  private steps: PipelineStep[] = [];

  /** Main-thread step (function) */
  step<TNext>(name: string, fn: StepFn<TOut, TNext>): WorkerPipeline<TIn, TNext> {
    const next = this as unknown as WorkerPipeline<TIn, TNext>;
    next.steps = [...this.steps, { name, fn: fn as StepFn<unknown, unknown> }];
    return next;
  }

  /** Worker step (registry key in transform.worker.ts) */
  stepKey<TNext>(name: string, mapperKey: string): WorkerPipeline<TIn, TNext> {
    const next = this as unknown as WorkerPipeline<TIn, TNext>;
    next.steps = [...this.steps, { name, mapperKey }];
    return next;
  }

  /** Синхронний run на main thread (для малих даних / тестів) */
  async runSync(input: TIn): Promise<PipelineResult<TOut>> {
    const start = performance.now();
    const stepDurationsMs: number[] = [];
    let current: unknown = input;

    for (const step of this.steps) {
      if (!step.fn) {
        throw new Error(`Step "${step.name}" has no fn — use runInWorker for stepKey steps`);
      }
      const s = performance.now();
      current = await step.fn(current);
      stepDurationsMs.push(performance.now() - s);
    }

    return {
      data: current as TOut,
      totalDurationMs: performance.now() - start,
      stepDurationsMs,
    };
  }

  /** Run pipeline steps in Web Worker via mapper registry keys */
  async runInWorker(
    worker: Worker,
    input: TIn,
    options: PipelineRunOptions = {},
  ): Promise<PipelineResult<TOut>> {
    const start = performance.now();
    const stepDurationsMs: number[] = [];
    let current: unknown = input;

    for (const step of this.steps) {
      if (!step.mapperKey) {
        throw new Error(`Step "${step.name}" has no mapperKey — use runSync for fn steps`);
      }
      const s = performance.now();
      current = await mapInWorker(
        worker,
        step.mapperKey,
        current,
        options.transfer,
        options.timeoutMs,
      );
      stepDurationsMs.push(performance.now() - s);
    }

    return {
      data: current as TOut,
      totalDurationMs: performance.now() - start,
      stepDurationsMs,
    };
  }

  getStepNames(): string[] {
    return this.steps.map((s) => s.name);
  }
}

/** @deprecated T77-M09: no renderer consumers; see WorkerPipeline JSDoc. */
export function createWorkerPipeline<TIn>(): WorkerPipeline<TIn, TIn> {
  return new WorkerPipeline<TIn, TIn>();
}

/**
 * Pipeline: positions → dept contours (worker).
 * @deprecated T77-M09: DiagramRenderer no longer uses this (M01 Option B).
 */
export function createContourPipeline() {
  return createWorkerPipeline<{ positions: unknown[]; config?: unknown }>().stepKey(
    'contours',
    'computeAllContours',
  );
}
