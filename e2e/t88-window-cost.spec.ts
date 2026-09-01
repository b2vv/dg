import { expect, test, type Page } from '@playwright/test';

/**
 * T88.8 — the measurement gate.
 *
 * Not a test: nothing here asserts a product behaviour. It produces the four
 * numbers `plan.md` §3 step 6 asks for — the reserve, the rebuild threshold,
 * the cost of `setData` on a window with overlapping ids and without, and the
 * pan cost to compare against the T88.0 baseline — and those numbers decide
 * whether T88.11 (skeletons), T88.12 (`spliceData`) and T88.13 (blur) exist.
 *
 * Run: `npm run measure:window`. Kept out of the default suite for the same
 * reason as `node-compare`: it is slow, it is single-worker by construction
 * (a second Chromium on the same cores changes every millisecond it reports),
 * and a red harness in CI says nothing about the product.
 */

// Same door as the T87 harness: a plain run measures software rendering, and
// the T88.0 baseline was taken in both environments — a verdict from only one
// of them would be a verdict about SwiftShader.
test.use({
  launchOptions: process.env.REAL_GPU ? { args: ['--use-angle=metal'] } : {},
});

/**
 * Staff · 1M wall geometry — mirrored from `tabConfigs.STAFF_1M_CELL`.
 *
 * Copied rather than imported: the e2e suite is typechecked by its own tsconfig
 * and does not reach into `packages/`. If the tab's gaps change, this changes.
 */
const COLS = 24;
const PITCH_Y = 88;
const RESERVE_SCREENS = 1;

interface RebuildRecord {
  kind: 'slide' | 'jump';
  ms: number;
  buildMs: number;
  mappedMs: number;
  from: number;
  to: number;
  size: number;
}

interface Bridge {
  getViewport(): { x: number; y: number; scale: number };
  setViewport(v: { x?: number; y?: number; scale?: number }): void;
  getStaffRebuilds(): RebuildRecord[];
  getSceneCounts(): { positions: number; reportLines: number };
}

const rebuilds = (page: Page): Promise<RebuildRecord[]> =>
  page.evaluate(() => (window as unknown as { __demoE2e: Bridge }).__demoE2e.getStaffRebuilds());

const viewport = (page: Page): Promise<{ x: number; y: number; scale: number }> =>
  page.evaluate(() => (window as unknown as { __demoE2e: Bridge }).__demoE2e.getViewport());

/**
 * How much of the new window the old one already held.
 *
 * This is the split the gate exists to make: heavy overlap is the case where
 * `setData` rebuilds the search index over ids it already had, and a jump is
 * the case where it does not.
 */
function overlapRatio(r: RebuildRecord): number {
  const aStart = r.from;
  const aEnd = r.from + r.size;
  const bStart = r.to;
  const bEnd = r.to + r.size;
  const shared = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
  return Number((shared / r.size).toFixed(3));
}

function summarize(label: string, records: RebuildRecord[]): void {
  if (records.length === 0) {
    console.log(`MEASURE ${label}: no rebuilds recorded`);
    return;
  }
  const ms = records.map((r) => r.ms).sort((a, b) => a - b);
  const at = (q: number): number => ms[Math.min(ms.length - 1, Math.floor(ms.length * q))] ?? 0;
  console.log(
    `MEASURE ${label} ${JSON.stringify({
      count: records.length,
      p50: at(0.5),
      p95: at(0.95),
      max: ms[ms.length - 1],
      windowSeats: records[records.length - 1]?.size ?? 0,
      overlap: records.map((r) => overlapRatio(r)),
      // Where the milliseconds actually are — T88.12 cuts at whichever of these
      // is the big one, and cutting at the wrong one buys nothing.
      buildMs: records.map((r) => r.buildMs),
      indexMs: records.map((r) => r.mappedMs),
      renderMs: records.map((r) => r.ms - r.mappedMs),
    })}`,
  );
}

/** Open the tab and wait for the mount-time rebuild to stop moving. */
async function openStaffTab(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?e2e=1');
  await page.locator('[data-testid="diagram-ready"]').waitFor({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Staff · 1M', exact: true }).click();
  await expect(page.locator('[data-window-start]')).toHaveCount(1, { timeout: 60_000 });
}

/**
 * Wait for the rebuild log to reach `atLeast` records, or give up and say so.
 *
 * Waiting on `data-window-start` is not enough for the mount measurement: the
 * marker is written by `reload()` with the *initial* window, sits unchanged
 * while the mount-time slide runs, and reads as settled the whole time. On a
 * fast machine that reported a 629-seat scene and zero rebuilds — the state
 * before the thing being measured.
 */
async function waitForRebuilds(page: Page, atLeast: number, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await rebuilds(page)).length >= atLeast) return;
    await page.waitForTimeout(150);
  }
}

/**
 * Wait until the window stops moving — and until there *is* one.
 *
 * The empty string has to be excluded explicitly. On a fast machine the mount
 * measurement read the attribute before it existed, saw two equal blanks, and
 * called that settled: it reported a 629-seat scene (the initial 600-seat
 * window) and zero rebuilds, which is the state before the thing being measured.
 */
async function settled(page: Page): Promise<string> {
  const mount = page.locator('[data-window-start]');
  let last = '';
  for (let i = 0; i < 60; i += 1) {
    const now = (await mount.getAttribute('data-window-start')) ?? '';
    if (now !== '' && now === last) return now;
    last = now;
    await page.waitForTimeout(150);
  }
  return last;
}

test.describe('T88.8 — what a window rebuild costs', () => {
  test.slow();

  test('mount: what opening the tab costs before anybody touches it', async ({ page }) => {
    await openStaffTab(page);
    // Wait for the rebuild rather than for the marker to hold still: the
    // question is whether opening the tab costs one at all, so «none arrived
    // in fifteen seconds» has to be a possible answer, not a race.
    await waitForRebuilds(page, 1);
    await settled(page);
    const records = await rebuilds(page);
    // §3.4 of the report already named this one from the other side: `fitView`
    // zooms out, the camera settles, and the window re-slides under the frame
    // it was just given. Here it is as a number rather than an anecdote.
    summarize('mount', records);
    console.log(`MEASURE mount-rebuild-count ${records.length}`);
    const counts = await page.evaluate(
      () => (window as unknown as { __demoE2e: Bridge }).__demoE2e.getSceneCounts(),
    );
    console.log(`MEASURE mount-scene ${JSON.stringify(counts)}`);
  });

  test('slide: overlapping ids, the case the search index pays for', async ({ page }) => {
    await openStaffTab(page);
    await waitForRebuilds(page, 1);
    await settled(page);
    // Slice past what the mount cost rather than clearing the log: the bridge
    // hands out a copy, so emptying what it returns empties nothing.
    const before = (await rebuilds(page)).length;

    // Four deliberate camera moves, each far enough to move the window and
    // small enough to overlap what is already there — an ordinary pan.
    for (let i = 0; i < 4; i += 1) {
      await page.evaluate(() => {
        const b = (window as unknown as { __demoE2e: Bridge }).__demoE2e;
        const vp = b.getViewport();
        b.setViewport({ ...vp, y: vp.y - 1500 });
      });
      await settled(page);
    }
    const records = (await rebuilds(page)).slice(before);
    summarize('slide', records.filter((r) => r.kind === 'slide'));
    console.log(`MEASURE slide-rebuilds-per-move ${(records.length / 4).toFixed(2)}`);
  });

  test('jump: disjoint ids, no index to reuse', async ({ page }) => {
    await openStaffTab(page);
    await waitForRebuilds(page, 1);
    await settled(page);
    const before = (await rebuilds(page)).length;

    const search = page.locator('#search-input');
    await search.fill('pos-500000');
    await search.press('Enter');
    await settled(page);

    const records = (await rebuilds(page)).slice(before);
    summarize('jump', records.filter((r) => r.kind === 'jump'));
    // The follow-up the report predicted in §3.6: a centred window and a
    // camera-derived one are different frames, so the first settle after a
    // jump may ask for one more slide. This says whether it actually does.
    console.log(
      `MEASURE jump-followup-slides ${records.filter((r) => r.kind === 'slide').length}`,
    );
  });

  test('scale: does the cost follow the number of seats', async ({ page }) => {
    // The question §9.2 left open. If the cost is linear in seats then the
    // window size *is* a knob — the useful direction being down, not up — and
    // a smaller reserve buys frame time at the price of more rebuilds. If it
    // is flat, nothing about the reserve matters and only the renderer does.
    await openStaffTab(page);
    await waitForRebuilds(page, 1);
    await settled(page);
    const base = (await viewport(page)).scale;

    const points: Array<{ zoom: number; seats: number; ms: number; renderMs: number }> = [];
    for (const factor of [2, 1, 0.5, 0.25]) {
      const before = (await rebuilds(page)).length;
      await page.evaluate((z) => {
        const b = (window as unknown as { __demoE2e: Bridge }).__demoE2e;
        const vp = b.getViewport();
        b.setViewport({ ...vp, scale: z });
      }, base * factor);
      await waitForRebuilds(page, before + 1, 20_000);
      await settled(page);
      const last = (await rebuilds(page)).at(-1);
      if (last && (await rebuilds(page)).length > before) {
        points.push({
          zoom: Number((base * factor).toFixed(3)),
          seats: last.size,
          ms: last.ms,
          renderMs: last.ms - last.mappedMs,
        });
      }
    }
    console.log(`MEASURE scale ${JSON.stringify(points)}`);
  });

  test('reserve: does one screen of it survive a fast gesture', async ({ page }) => {
    await openStaffTab(page);
    await waitForRebuilds(page, 1);
    await settled(page);

    // A fling: the whole point of the reserve is to be ahead of one. Paced by
    // the clock so the gesture is the same on any frame rate.
    await page.evaluate(async () => {
      const canvas = document.querySelector('canvas')!;
      const r = canvas.getBoundingClientRect();
      const opts = (x: number, y: number) => ({
        clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1,
      });
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const DISTANCE = 2600;
      const DURATION_MS = 400;
      canvas.dispatchEvent(new PointerEvent('pointerdown', opts(cx, cy)));
      await new Promise<void>((resolve) => {
        const started = performance.now();
        const step = (): void => {
          const p = Math.min(1, (performance.now() - started) / DURATION_MS);
          canvas.dispatchEvent(new PointerEvent('pointermove', opts(cx, cy - p * DISTANCE)));
          if (p < 1) requestAnimationFrame(step);
          else {
            canvas.dispatchEvent(new PointerEvent('pointerup', opts(cx, cy - DISTANCE)));
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    });

    // From the end of the gesture, sample how far the camera is outside what is
    // materialized. Positive screens = the user is looking at nothing, which is
    // T88.11's entry condition; the time it lasts is T88.13's.
    const mount = page.locator('[data-window-start]');
    const started = Date.now();
    let worstScreens = 0;
    let emptyForMs = 0;
    let landedMs = -1;
    for (let i = 0; i < 120; i += 1) {
      const vp = await viewport(page);
      const start = Number(await mount.getAttribute('data-window-start'));
      const end = Number(await mount.getAttribute('data-window-end'));
      // The seats under the camera right now, by the same arithmetic
      // `resolveWindowRange` uses — minus the reserve, because the question is
      // what is on screen, not what was asked for.
      //
      // Rows are wall-relative, so the base is the snapped window start, not
      // the first seat of the tier. Using the tier's first seat reads every
      // position as if the wall began at the top of the address space, which
      // is how the first run of this harness reported 89 windows of emptiness.
      const wallBase = Math.floor(start / COLS) * COLS;
      const worldTop = -vp.y / vp.scale;
      const worldBottom = worldTop + 900 / vp.scale;
      const topSeat = wallBase + (Math.floor(worldTop / PITCH_Y) - 1) * COLS;
      const bottomSeat = wallBase + (Math.ceil(worldBottom / PITCH_Y) - 1) * COLS;
      const beyond = Math.max(0, bottomSeat - end, start - topSeat);
      const onScreen = Math.max(1, bottomSeat - topSeat);
      const screens = Number((beyond / onScreen).toFixed(3));
      if (screens > worstScreens) worstScreens = screens;
      if (screens > 0) emptyForMs = Date.now() - started;
      if (screens === 0 && landedMs < 0 && i > 2) landedMs = Date.now() - started;
      if (landedMs >= 0 && i > 10) break;
      await page.waitForTimeout(50);
    }
    console.log(
      `MEASURE reserve ${JSON.stringify({
        reserveScreens: RESERVE_SCREENS,
        worstBeyondWindows: worstScreens,
        emptyForMs,
        landedMs,
      })}`,
    );
    summarize('fling', (await rebuilds(page)).slice(1));
  });
});
