/** Повідомлення worker pipeline */
export type WorkerRequest<T = unknown> = {
  id: string;
  type: 'run' | 'run-step' | 'dispose';
  stepIndex?: number;
  mapperKey?: string;
  payload?: T;
};

export type WorkerResponse<T = unknown> = {
  id: string;
  ok: boolean;
  result?: T;
  error?: string;
  durationMs?: number;
};

/** Опис кроку pipeline (функція серіалізується через ім'я, не closure) */
export interface PipelineStepDef<TIn = unknown, TOut = unknown> {
  name: string;
  /** Ключ з реєстру mapper functions (worker-safe) */
  mapperKey: string;
}

export interface PipelineRunOptions {
  /** Transferable buffers для zero-copy */
  transfer?: Transferable[];
  /** Chunk size для великих масивів */
  chunkSize?: number;
}

export interface PipelineResult<T> {
  data: T;
  totalDurationMs: number;
  stepDurationsMs: number[];
}
