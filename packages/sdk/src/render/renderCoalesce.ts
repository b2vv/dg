/**
 * Coalesce overlapping async work so at most one `run` is in flight (T75 D2).
 * Concurrent `schedule()` callers share one promise; a dirty flag runs exactly
 * one follow-up pass after the current work finishes.
 *
 * GoF: lightweight Scheduler / coalescing queue — not a full Command bus (KISS).
 */
export type RenderCoalesce = {
  schedule: () => Promise<void>;
  stop: () => void;
};

export function createRenderCoalesce(run: () => Promise<void>): RenderCoalesce {
  let promise: Promise<void> | null = null;
  let dirty = false;
  let stopped = false;

  return {
    stop(): void {
      stopped = true;
      dirty = false;
    },
    async schedule(): Promise<void> {
      if (stopped) return;
      if (promise) {
        dirty = true;
        return promise;
      }
      promise = (async () => {
        do {
          dirty = false;
          if (stopped) return;
          await run();
        } while (dirty && !stopped);
      })();
      try {
        await promise;
      } finally {
        promise = null;
      }
    },
  };
}
