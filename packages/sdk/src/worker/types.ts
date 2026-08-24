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
