/**
 * Coalesce overlapping async work so at most one `run` is in flight (T75 D2).
 * Concurrent `schedule()` callers never overlap a pass; a caller that arrives
 * while one is running joins the single follow-up pass instead of starting its
 * own.
 *
 * **Each caller is answered about its own pass** (T104). A caller that arrives
 * mid-pass did not have its state drawn by that pass — the follow-up draws it —
 * so it waits for the follow-up and learns that verdict, not this one. The
 * earlier shape returned one promise for the whole dirty-loop session, which
 * meant a caller whose frame drew fine inherited a later pass's failure; every
 * mutator that decides "do I roll back?" from that answer was deciding on
 * someone else's outcome.
 *
 * GoF: lightweight Scheduler / coalescing queue — not a full Command bus (KISS).
 */
export type RenderCoalesce = {
  schedule: () => Promise<void>;
  stop: () => void;
};

export function createRenderCoalesce(run: () => Promise<void>): RenderCoalesce {
  /** The pass drawing right now. */
  let inFlight: Promise<void> | null = null;
  /** The one pass that will follow it — at most one, however many ask for it. */
  let queued: Promise<void> | null = null;
  let stopped = false;

  const runPass = async (): Promise<void> => {
    if (stopped) return;
    await run();
  };

  /**
   * Takes the in-flight slot **synchronously** as the queued pass begins.
   *
   * Without this the slot moved a microtask later than the pass started, and a
   * caller arriving in that gap was handed a pass that had already read the
   * state — so its own edit was not in the frame it was told about. Only shows
   * up with three callers; two never reach the gap.
   */
  const runQueued = async (): Promise<void> => {
    inFlight = queued;
    queued = null;
    await runPass();
  };

  /**
   * Free the slot once nothing follows. Guarded on `queued` because between a
   * pass settling and its successor starting the slot must stay occupied —
   * otherwise a caller in between starts a second concurrent pass.
   */
  const clearWhenIdle = (pass: Promise<void>): void => {
    void pass
      .catch(() => {})
      .then(() => {
        if (inFlight === pass && !queued) inFlight = null;
      });
  };

  return {
    stop(): void {
      stopped = true;
      queued = null;
    },

    schedule(): Promise<void> {
      if (stopped) return Promise.resolve();

      if (!inFlight) {
        const pass = runPass();
        inFlight = pass;
        clearWhenIdle(pass);
        return pass;
      }

      if (!queued) {
        // A failed pass must not block the next one: the state that follows is
        // still owed a frame, and refusing to draw it would strand the diagram
        // on whatever the failure left behind.
        const next = inFlight.then(runQueued, runQueued);
        queued = next;
        clearWhenIdle(next);
      }
      return queued;
    },
  };
}
