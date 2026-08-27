import { describe, expect, it, rstest } from '@rstest/core';
import { createRenderCoalesce } from './renderCoalesce.js';

describe('createRenderCoalesce (T75 D2)', () => {
  it('success: concurrent schedule never overlaps run', async () => {
    let inflight = 0;
    let maxInflight = 0;
    let passes = 0;
    const coalesce = createRenderCoalesce(async () => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      passes += 1;
      await new Promise((r) => setTimeout(r, 20));
      inflight -= 1;
    });

    await Promise.all([coalesce.schedule(), coalesce.schedule(), coalesce.schedule()]);

    expect(maxInflight).toBe(1);
    expect(passes).toBeGreaterThanOrEqual(1);
    expect(passes).toBeLessThanOrEqual(2);
    expect(inflight).toBe(0);
  });

  it('failure: stop prevents further runs', async () => {
    const run = rstest.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    const coalesce = createRenderCoalesce(run);
    const first = coalesce.schedule();
    coalesce.stop();
    await first;
    await coalesce.schedule();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
