import type { PipelineResult, PipelineRunOptions } from './types.js';

export type StepFn<TIn, TOut> = (input: TIn) => TOut | Promise<TOut>;

/**
 * Ланцюжок трансформацій даних.
 * На main thread — `.run()` делегує у Worker через `mapInWorker` / pipeline worker.
 */
export class WorkerPipeline<TIn, TOut = TIn> {
  private steps: Array<{ name: string; fn: StepFn<unknown, unknown> }> = [];

  step<TNext>(
    name: string,
    fn: StepFn<TOut, TNext>,
  ): WorkerPipeline<TIn, TNext> {
    const next = this as unknown as WorkerPipeline<TIn, TNext>;
    next.steps = [...this.steps, { name, fn: fn as StepFn<unknown, unknown> }];
    return next;
  }

  /** Синхронний run на main thread (для малих даних / тестів) */
  async runSync(input: TIn): Promise<PipelineResult<TOut>> {
    const start = performance.now();
    const stepDurationsMs: number[] = [];
    let current: unknown = input;

    for (const step of this.steps) {
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

  getStepNames(): string[] {
    return this.steps.map((s) => s.name);
  }
}

export function createWorkerPipeline<TIn>(): WorkerPipeline<TIn, TIn> {
  return new WorkerPipeline<TIn, TIn>();
}
