import { describe, expect, it } from '@rstest/core';
import {
  RebuildScheduler,
  type StaffRebuild,
  rebaseViewport,
  resolveWindowRange,
  type WallGeometry,
} from './viewportWindow.js';
import { STAFF_SCALE_COLS, LEAD_SEATS, CURRENT_SEATS } from '../scenarios/scaleStaff.js';

/**
 * A readable fixture, deliberately **not** the tab's current pitch.
 *
 * `resolveWindowRange` is scale-free arithmetic, so the numbers below only have
 * to make the assertions legible — 720 px of screen is exactly 10 rows of 72.
 * Wiring this to `STAFF_1M_PITCH_Y` looked tidier and meant that changing the
 * gaps between seats on one demo tab broke three arithmetic tests that have
 * nothing to do with how the tab looks.
 */
const geom: WallGeometry = {
  cols: STAFF_SCALE_COLS,
  pitchY: 72,
  firstIndex: LEAD_SEATS,
  tierSeats: CURRENT_SEATS,
};

const at = (row: number, scale = 1) => ({ x: 0, y: -row * 72 * scale, scale });

// The scheduler speaks in rebuild requests, not seat numbers. These two keep
// the tests reading about the seat they care about rather than the wrapper.
const slide = (start: number): StaffRebuild => ({ kind: 'slide', start });
const seatOf = (r: StaffRebuild): number => (r.kind === 'slide' ? r.start : r.focusIndex);

describe('resolveWindowRange', () => {
  it('success: the window covers what is on screen plus the reserve', () => {
    // One screen of 720 px at scale 1 is 10 rows of 72. With one screen of
    // reserve on each side that is 30 rows, and a row is `cols` seats.
    const r = resolveWindowRange(
      { screen: { width: 1920, height: 720 }, viewport: at(100), reserveScreens: 1, maxSeats: 1_000_000, wallBase: 2400 },
      geom,
    );
    expect((r.end - r.start) / geom.cols).toBeCloseTo(30, 0);
    expect(r.size).toBe(r.end - r.start);
  });

  it('success: a bigger screen asks for a bigger window', () => {
    // The size is a consequence of what fits, not the constant 600 the demo
    // used to hard-code — that is the whole point of the reserve being named
    // in screens rather than in seats.
    const small = resolveWindowRange(
      { screen: { width: 1920, height: 720 }, viewport: at(100), reserveScreens: 1, maxSeats: 1_000_000, wallBase: 2400 },
      geom,
    );
    const large = resolveWindowRange(
      { screen: { width: 1920, height: 1440 }, viewport: at(100), reserveScreens: 1, maxSeats: 1_000_000, wallBase: 2400 },
      geom,
    );
    expect(large.size).toBeGreaterThan(small.size);
  });

  it('success: zooming out asks for more seats at the same screen size', () => {
    const near = resolveWindowRange(
      { screen: { width: 1920, height: 720 }, viewport: at(100, 1), reserveScreens: 1, maxSeats: 1_000_000, wallBase: 2400 },
      geom,
    );
    const far = resolveWindowRange(
      { screen: { width: 1920, height: 720 }, viewport: at(100, 0.5), reserveScreens: 1, maxSeats: 1_000_000, wallBase: 2400 },
      geom,
    );
    expect(far.size).toBeGreaterThan(near.size);
  });

  it('failure: the top of the address space clamps instead of going negative', () => {
    const r = resolveWindowRange(
      { screen: { width: 1920, height: 720 }, viewport: at(0), reserveScreens: 2, maxSeats: 1_000_000, wallBase: 0 },
      geom,
    );
    expect(r.start).toBe(LEAD_SEATS);
  });

  it('failure: the bottom clamps to the last seat of the tier', () => {
    const lastRow = Math.floor((LEAD_SEATS + CURRENT_SEATS) / STAFF_SCALE_COLS);
    const r = resolveWindowRange(
      {
        screen: { width: 1920, height: 720 },
        viewport: at(lastRow),
        reserveScreens: 2, maxSeats: 1_000_000,
        wallBase: lastRow * STAFF_SCALE_COLS,
      },
      geom,
    );
    expect(r.end).toBe(LEAD_SEATS + CURRENT_SEATS);
  });

  it('failure: above the wall `span` still asks for a screenful, `size` does not', () => {
    // The two differ only at the top now. At the bottom the start is held back
    // by a whole ask, so `size` reaches `span` there — that is the row-5 fix,
    // and this test used to assert the opposite, which is what a test written
    // against a bug looks like from the inside.
    const r = resolveWindowRange(
      { screen: { width: 1920, height: 720 }, viewport: at(0), reserveScreens: 2, maxSeats: 1_000_000, wallBase: 0 },
      geom,
    );
    expect(r.size).toBeLessThan(r.span);
    const middle = resolveWindowRange(
      {
        screen: { width: 1920, height: 720 },
        viewport: at(1000),
        reserveScreens: 2, maxSeats: 1_000_000,
        wallBase: 1000 * STAFF_SCALE_COLS,
      },
      geom,
    );
    expect(r.span).toBe(middle.size);
  });

  it('failure: past the last seat the window holds a screenful, it does not empty', () => {
    // Row 5. Clamping both ends to the last seat gave size 0, which reached
    // `buildScaleStaffWindow` as `windowSize: 0` and drew an empty wall.
    const lastRow = Math.floor((LEAD_SEATS + CURRENT_SEATS) / STAFF_SCALE_COLS);
    const r = resolveWindowRange(
      {
        screen: { width: 1920, height: 720 },
        viewport: at(lastRow + 6),
        reserveScreens: 2, maxSeats: 1_000_000,
        wallBase: lastRow * STAFF_SCALE_COLS,
      },
      geom,
    );
    expect(r.end).toBe(LEAD_SEATS + CURRENT_SEATS);
    expect(r.size).toBe(r.span);
    expect(r.start).toBe(LEAD_SEATS + CURRENT_SEATS - r.span);
  });

  it('failure: before the first seat the window still holds a screenful', () => {
    // Row 6, the same failure from the other end.
    const r = resolveWindowRange(
      { screen: { width: 1920, height: 720 }, viewport: at(-8), reserveScreens: 2, maxSeats: 1_000_000, wallBase: 0 },
      geom,
    );
    expect(r.start).toBe(LEAD_SEATS);
    expect(r.size).toBeGreaterThan(0);
  });
});

  it('failure: zooming out is bounded by the ceiling, not by the size of the tier', () => {
    // Row 10. The visible band grows as the scale shrinks, so without a ceiling
    // the ask grows with every notch and the only thing that ever stopped it
    // was the tier's 700 000 seats.
    const wide = resolveWindowRange(
      {
        screen: { width: 1920, height: 900 },
        viewport: { x: 0, y: -1000 * 72, scale: 0.02 },
        reserveScreens: 1,
        maxSeats: 4000,
        wallBase: 1000 * STAFF_SCALE_COLS,
      },
      geom,
    );
    expect(wide.capped).toBe(true);
    expect(wide.size).toBeLessThanOrEqual(4000);

    // An ordinary zoom is not capped, so the flag means something.
    const normal = resolveWindowRange(
      {
        screen: { width: 1920, height: 900 },
        viewport: at(1000),
        reserveScreens: 1,
        maxSeats: 4000,
        wallBase: 1000 * STAFF_SCALE_COLS,
      },
      geom,
    );
    expect(normal.capped).toBe(false);
  });

describe('rebaseViewport', () => {
  it('success: shifting the base by a row moves the camera back by exactly a row', () => {
    // Rows are window-relative (absolute rows would put the wall at y ~ 730 000
    // px — see scaleStaff.snapWallBase). The price is this compensation, and it
    // has to be exact: a pixel of error per rebuild is a scene that creeps.
    const before = { x: 30, y: -7200, scale: 1 };
    const after = rebaseViewport(before, { rowShift: 1, pitchY: 72 });
    expect(after.y).toBe(before.y + 72);
    expect(after.x).toBe(before.x);
    expect(after.scale).toBe(before.scale);
  });

  it('success: the compensation is in screen px, so it scales with the zoom', () => {
    const after = rebaseViewport({ x: 0, y: 0, scale: 2 }, { rowShift: 3, pitchY: 72 });
    expect(after.y).toBe(3 * 72 * 2);
  });

  it('failure: no shift leaves the camera untouched', () => {
    const vp = { x: 11, y: 22, scale: 1.5 };
    expect(rebaseViewport(vp, { rowShift: 0, pitchY: 72 })).toEqual(vp);
  });
});

describe('RebuildScheduler', () => {
  it('success: a burst of requests produces one rebuild, with the last range', async () => {
    const built: number[] = [];
    const s = new RebuildScheduler(async (r: StaffRebuild) => {
      built.push(seatOf(r));
    }, 20);
    for (let i = 0; i < 10; i += 1) s.request(slide(i * 24));
    await new Promise((r) => setTimeout(r, 60));
    expect(built).toEqual([216]);
  });

  it('failure: a request that arrives mid-build is not dropped, it is queued', async () => {
    const built: number[] = [];
    // A deferred, not `let release = null` — TS narrows that to `null` because
    // the assignment happens inside a callback it cannot see running.
    const gate: { release: () => void } = { release: () => {} };
    const held = new Promise<void>((r) => {
      gate.release = r;
    });
    const s = new RebuildScheduler(async (r: StaffRebuild) => {
      built.push(seatOf(r));
      if (built.length === 1) await held;
    }, 5);
    s.request(slide(24));
    await new Promise((r) => setTimeout(r, 20));
    s.request(slide(48));
    await new Promise((r) => setTimeout(r, 20));
    gate.release();
    await new Promise((r) => setTimeout(r, 40));
    expect(built).toEqual([24, 48]);
  });

  it('failure: a build that throws is reported and does not wedge the scheduler', async () => {
    // The window is rebuilt by a worker and a WASM layout, either of which can
    // fail. plan-defense asked what the user sees then: the scene stays on the
    // window it already has, the reason is named, and the next gesture still
    // works — a scheduler that swallowed the throw would look identical to one
    // that quietly stopped rebuilding forever.
    const built: number[] = [];
    const errors: string[] = [];
    const s = new RebuildScheduler(
      async (r: StaffRebuild) => {
        built.push(seatOf(r));
        if (built.length === 1) throw new Error('layout worker died');
      },
      5,
      (e) => errors.push(e instanceof Error ? e.message : String(e)),
    );
    s.request(slide(24));
    await new Promise((r) => setTimeout(r, 30));
    expect(errors).toEqual(['layout worker died']);

    s.request(slide(48));
    await new Promise((r) => setTimeout(r, 30));
    expect(built).toEqual([24, 48]);
    expect(errors).toHaveLength(1);
  });

  it('failure: a throw drops the queued range instead of retrying it forever', async () => {
    const built: number[] = [];
    const s = new RebuildScheduler(
      async (r: StaffRebuild) => {
        built.push(seatOf(r));
        throw new Error('nope');
      },
      5,
      () => {},
    );
    s.request(slide(24));
    await new Promise((r) => setTimeout(r, 40));
    expect(built).toEqual([24]);
  });

  it('failure: stop() cancels a pending rebuild', async () => {
    const built: number[] = [];
    const s = new RebuildScheduler(async (r: StaffRebuild) => {
      built.push(seatOf(r));
    }, 20);
    s.request(slide(24));
    s.stop();
    await new Promise((r) => setTimeout(r, 60));
    expect(built).toEqual([]);
  });

  it('success: run() rebuilds ahead of the quiet period and resolves once it landed', async () => {
    const built: number[] = [];
    const s = new RebuildScheduler(async (r: StaffRebuild) => {
      await new Promise((done) => setTimeout(done, 10));
      built.push(seatOf(r));
    }, 10_000);
    await s.run(slide(24));
    // No wait after the await: an explicit destination is not a gesture, so
    // there is nothing to coalesce and nothing to wait out.
    expect(built).toEqual([24]);
  });

  it('failure: run() waits for a build in flight instead of overlapping it', async () => {
    // The reason the scheduler exists: `setData` rebuilds the search index
    // asynchronously, so two overlapping rebuilds can land out of order.
    const events: string[] = [];
    const s = new RebuildScheduler(async (r: StaffRebuild) => {
      events.push(`start ${seatOf(r)}`);
      await new Promise((done) => setTimeout(done, 30));
      events.push(`end ${seatOf(r)}`);
    }, 5);
    s.request(slide(24));
    await new Promise((r) => setTimeout(r, 15));
    await s.run(slide(48));
    expect(events).toEqual(['start 24', 'end 24', 'start 48', 'end 48']);
  });

  it('failure: run() supersedes a pan that was queued but never started', async () => {
    const built: number[] = [];
    const s = new RebuildScheduler(async (r: StaffRebuild) => {
      built.push(seatOf(r));
    }, 20);
    s.request(slide(24));
    await s.run(slide(48));
    await new Promise((r) => setTimeout(r, 60));
    expect(built).toEqual([48]);
  });

  it('failure: a failed run() is thrown to the caller, not swallowed into onError', async () => {
    // A gesture that failed to rebuild is dropped silently on purpose; an index
    // somebody typed has an author waiting to be told it did not happen.
    const errors: unknown[] = [];
    const s = new RebuildScheduler(
      async () => {
        throw new Error('layout worker died');
      },
      5,
      (e) => errors.push(e),
    );
    await expect(s.run(slide(24))).rejects.toThrow('layout worker died');
    expect(errors).toEqual([]);
  });

  it('failure: a failed run() does not wedge the rebuilds after it', async () => {
    const built: number[] = [];
    const s = new RebuildScheduler(async (r: StaffRebuild) => {
      built.push(seatOf(r));
      if (built.length === 1) throw new Error('nope');
    }, 5);
    await expect(s.run(slide(24))).rejects.toThrow('nope');
    await s.run(slide(48));
    expect(built).toEqual([24, 48]);
  });

  it('success: a jump reaches the builder as a jump, not as a start index', async () => {
    // The union is the scheduler's contract now: the two moves share a queue
    // precisely because they must not both be in `setData` at once, and the
    // builder is the only place that knows they are different moves.
    const seen: StaffRebuild[] = [];
    const s = new RebuildScheduler(async (r: StaffRebuild) => {
      seen.push(r);
    }, 5);
    s.request(slide(24));
    await s.run({ kind: 'jump', focusIndex: 500_000 });
    expect(seen).toEqual([{ kind: 'jump', focusIndex: 500_000 }]);
  });

  it('failure: run() after stop() builds nothing', async () => {
    const built: number[] = [];
    const s = new RebuildScheduler(async (r: StaffRebuild) => {
      built.push(seatOf(r));
    }, 5);
    s.stop();
    await s.run(slide(24));
    expect(built).toEqual([]);
  });
});
