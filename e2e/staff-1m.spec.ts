import { expect, test } from '@playwright/test';

/**
 * The 1M staff tab is windowed: it must draw a slice, say so, and let the
 * search move the window across the address space.
 */
test.describe('1M staff scale tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // Pin removed with T108: the canvas path no longer eats the search answer,
    // so these rows can go back to `'auto'` and once again exercise whatever
    // engine the environment actually gives them.
    await page.goto('/?e2e=1');
    await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Staff · 1M', exact: true }).click();
    // The window marker, not the status line. The tab label is transient: the
    // mount-time slide overwrites it a few seconds later, and `click()` does not
    // resolve while the main thread is busy building the window — so the first
    // poll can land after the label is already gone. The marker only ever
    // appears on this tab and never goes away again.
    await expect(page.locator('[data-window-start]')).toHaveCount(1, { timeout: 60_000 });
  });

  test('draws a window of the address space and says so', async ({ page }) => {
    const caption = page.locator('.scene-caption');
    await expect(caption).toContainText('1 000 000');
    await expect(caption).toContainText('window');

    // Presence, not visibility. These anchors exist only for nodes **in view**,
    // and after the mount-time slide the camera sits deep in tier 2 with the
    // lead block far above it — so «is the lead head visible» was really «did
    // the slide land yet», and it answered differently on CI than here.
    // `focusTestId` asks the scene whether the node exists and takes the camera
    // to it, which is the question this test means to ask.
    const focusByTestId = (testId: string) =>
      page.evaluate((id) => {
        const b = (window as unknown as { __demoE2e: { focusTestId(t: string): Promise<boolean> | undefined } }).__demoE2e;
        return b.focusTestId(id) ?? false;
      }, testId);

    // Polled, not asked once: a rebuild may be in flight at the instant of the
    // call, and «the scene was busy» is not «the tier is missing».
    await expect.poll(() => focusByTestId('scale-lead-head'), { timeout: 30_000 }).toBe(true);

    // Presence is the assertion; visibility is deliberately not. Focusing the
    // lead head moves the camera into tier-1 territory, which is a settled
    // camera change, which makes the window slide there, which rebases the
    // camera again. Asking «and is it on screen now» races a feedback loop this
    // feature is built out of — it held on a fast machine and never on CI.

    // Tier 3 the same way. The tier-2 focus marker is deliberately not checked
    // here: the mount-time slide rebuilds the window by range rather than around
    // a focus, so the marker is gone by design — the search tests below cover it
    // where it does exist.
    await expect.poll(() => focusByTestId('scale-sub-first'), { timeout: 30_000 }).toBe(true);
  });

  test('search by seat index moves the window', async ({ page }) => {
    const search = page.locator('#search-input');
    await search.fill('pos-500000');
    await search.press('Enter');
    // The window status, not the tab label: since T88.6 the jump goes through
    // `setData`, and the tab label was written by the reload that no longer runs.
    await expect(page.locator('#status')).toContainText('window', { timeout: 60_000 });
    // The window re-centred: the focus seat exists again, around the new index.
    await expect(page.getByTestId('node-scale-focus-seat')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.scene-caption')).toContainText('window');
  });

  test('an index outside tier 2 is reported, not silently re-centred', async ({ page }) => {
    const search = page.locator('#search-input');
    // This is row 14's literal case (`pos-900000` from the plan), and it takes
    // the other camera branch: with nothing to aim at, the jump goes to the
    // start of the window it did materialize. The scene must survive that too.
    await page.evaluate(() => {
      document.querySelector('canvas')!.setAttribute('data-canvas-identity', 'original');
    });
    // Tier 3 lives past 700 004 — the window cannot centre there.
    await search.fill('pos-900000');
    await search.press('Enter');
    await expect(page.locator('#status')).toContainText(/subordinate tier/, { timeout: 60_000 });
    await expect(page.getByTestId('node-scale-focus-seat')).toHaveCount(0);
    expect(await page.locator('canvas').first().getAttribute('data-canvas-identity')).toBe(
      'original',
    );
  });

  test('a name query that is not in the window says so instead of lying', async ({ page }) => {
    const search = page.locator('#search-input');
    await search.fill('Nonexistent Person');
    await search.press('Enter');
    await expect(page.locator('#status')).toContainText(/0 hits in 1 000 000 seats/, {
      timeout: 30_000,
    });
  });

  // Acceptance rows 3 and 11. The name is «Morgan Nguyen», not the «Morgan
  // Blake» of spec.md: only 40 of the 100 generated pairs are reachable, and
  // Blake is not among them, so the spec's example matches nothing at all.
  test('rows 3 and 11: a name search reports every match and reaches them', async ({ page }) => {
    test.slow();
    const search = page.locator('#search-input');
    await search.fill('Morgan Nguyen');
    await search.press('Enter');

    const panel = page.getByTestId('search-results');
    await expect(panel).toBeVisible({ timeout: 30_000 });
    // The count is of the whole address space, not of the page — an array's
    // length could never carry it, which is why searchAll returns an object.
    await expect(page.getByTestId('search-total')).toHaveText('25 000');
    await expect(panel.locator('button.row')).toHaveCount(20);
    // The status counts what is on the list, not what this window can focus.
    // It said «showing 0» under twenty visible rows until the browser showed it.
    await expect(page.locator('#status')).toContainText('showing 20');

    // T99: it must still be there a moment later. Typing the query resizes the
    // visible area, which slides the window, which used to write over the answer
    // the user had just asked for — measured at 520 ms of life. State and
    // messages now write to different nodes, so the slide cannot reach this.
    await page.waitForTimeout(2500);
    await expect(page.locator('#status')).toContainText('showing 20');

    // Scrolling loads the next page rather than a spacer sized to 25 000 rows.
    await panel.locator('.rows').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(panel.locator('button.row')).toHaveCount(40, { timeout: 15_000 });

    // Row 3's second half: the camera has to end up on the seat, which means
    // the window must move to it first — a host hit names a seat the scene has
    // never materialised.
    const before = await page.locator('[data-window-start]').getAttribute('data-window-start');
    await panel.locator('button.row').first().click();
    await expect
      .poll(async () => page.locator('[data-window-start]').getAttribute('data-window-start'), {
        timeout: 30_000,
      })
      .not.toBe(before);
    await expect(page.getByTestId('node-scale-focus-seat')).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('the window follows the camera (T88)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Pin removed with T108: the canvas path no longer eats the search answer,
    // so these rows can go back to `'auto'` and once again exercise whatever
    // engine the environment actually gives them.
    await page.goto('/?e2e=1');
    await page.getByRole('button', { name: 'Staff · 1M' }).click();
    await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
  });

  test('panning past the edge materializes seats nobody asked for', async ({ page }) => {
    // Honestly slow rather than intermittently red: mounting a million-seat
    // address space on a software renderer takes most of the default budget on
    // its own, and a full run puts six of those on the same CPU.
    test.slow();
    const mount = page.locator('[data-window-start]');
    // Mounting fits the view, the camera settles, and the window re-slides to
    // match that zoomed-out frame. Reading `before` any earlier measures that
    // rebuild instead of the gesture.
    const stableStart = async (): Promise<number> => {
      let last = NaN;
      for (let i = 0; i < 40; i += 1) {
        const now = Number(await mount.getAttribute('data-window-start'));
        if (now === last) return now;
        last = now;
        await page.waitForTimeout(150);
      }
      return last;
    };
    const before = await stableStart();

    // Drag inside the page, one move per frame. Driving this with
    // page.mouse.move measures Playwright's round-trips, not the app (T87.10).
    //
    // Paced by the clock, not by a frame count. Counting frames ties the length
    // of the gesture to the frame rate, and on a software renderer under a full
    // run that made the drag alone outlast the whole test budget — a timeout
    // that says nothing about the window. The clock keeps the gesture the same
    // length in seconds and the same distance in pixels however few frames the
    // machine can spare; the final move is dispatched at the full distance so a
    // starved run ends up exactly where a fast one does.
    await page.evaluate(async () => {
      const canvas = document.querySelector('canvas')!;
      const r = canvas.getBoundingClientRect();
      const opts = (x: number, y: number) => ({
        clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1,
      });
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // 840 px is what 60 steps of 14 px added up to — the distance is the part
      // of the old gesture that the assertion actually depends on.
      const DISTANCE = 840;
      const DURATION_MS = 700;
      canvas.dispatchEvent(new PointerEvent('pointerdown', opts(cx, cy)));
      await new Promise<void>((resolve) => {
        const started = performance.now();
        const step = (): void => {
          const progress = Math.min(1, (performance.now() - started) / DURATION_MS);
          // Dragging the content up brings lower parts of the wall into view,
          // which is where the higher seat indices live.
          canvas.dispatchEvent(new PointerEvent('pointermove', opts(cx, cy - progress * DISTANCE)));
          if (progress < 1) requestAnimationFrame(step);
          else {
            canvas.dispatchEvent(new PointerEvent('pointerup', opts(cx, cy - DISTANCE)));
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    });

    // The rebuild is debounced and async — this attribute is the only thing in
    // the DOM that says it happened, which is why T88.5 puts it there.
    // 45s, not 15: the wait is a settle plus a debounce plus a rebuild that
    // §19 measures at ~1s alone, and under a fully parallel run the whole chain
    // stretches past fifteen. The assertion is unchanged — the window still has
    // to have moved — only the patience is.
    await expect
      .poll(async () => Number(await mount.getAttribute('data-window-start')), { timeout: 45_000 })
      .toBeGreaterThan(before);
    await expect(page.locator('#status')).toContainText('window');
  });

  test('sliding does not grow the scene without bound', async ({ page }) => {
    const counts = async () =>
      page.evaluate(() => {
        const b = (window as unknown as {
          __demoE2e: { getSceneCounts(): { positions: number; reportLines: number } };
        }).__demoE2e;
        return b.getSceneCounts();
      });
    await page.waitForTimeout(900); // let the mount-time rebuild settle first
    const before = await counts();

    for (let round = 0; round < 3; round += 1) {
      await page.evaluate((r) => {
        const b = (window as unknown as { __demoE2e: { getViewport(): { x: number; y: number; scale: number }; setViewport(v: object): void } }).__demoE2e;
        const vp = b.getViewport();
        b.setViewport({ ...vp, y: vp.y - 900 * (r + 1) });
      }, round);
      await page.waitForTimeout(400);
    }

    const after = await counts();
    // Evicting is the half that setData gives for free: a window that only
    // appended would walk toward a million rows of report lines.
    expect(after.positions).toBeLessThan(before.positions * 1.5);
    expect(after.reportLines).toBeLessThan(before.reportLines * 1.5);
  });

  // Acceptance rows 5 and 6: the ends of tier 2. The window must stop, keep a
  // screenful, and say which edge it is against.
  for (const edge of [
    { row: 5, name: 'the far end of tier 2', query: 'pos-700000', drag: -1, attr: 'data-window-end', value: '700004', says: 'end of tier 2' },
    { row: 6, name: 'the start of tier 2', query: 'pos-40', drag: 1, attr: 'data-window-start', value: '4', says: 'start of tier 2' },
  ]) {
    test(`row ${edge.row}: panning past ${edge.name} clamps instead of emptying`, async ({ page }) => {
      test.slow();
      const search = page.locator('#search-input');
      await search.fill(edge.query);
      await search.press('Enter');
      await expect(page.locator('[data-window-start]')).toHaveCount(1, { timeout: 60_000 });
      await page.waitForTimeout(1500);

      // Drive the camera at the wall until the window stops moving. A drag was
      // the first shape of this and never arrived: at the tab's zoom one gesture
      // covers a few rows of a 29 000-row wall, so it reported «not clamped yet»
      // rather than what happens at the clamp. The clamp is reached through the
      // same settled → resolveWindowRange path either way.
      const mount = page.locator('[data-window-start]');
      let last = '';
      for (let step = 0; step < 40; step += 1) {
        await page.evaluate((dir) => {
          const b = (window as unknown as {
            __demoE2e: { getViewport(): { x: number; y: number; scale: number }; setViewport(v: object): void };
          }).__demoE2e;
          const vp = b.getViewport();
          b.setViewport({ ...vp, y: vp.y + dir * 40_000 });
        }, edge.drag);
        await page.waitForTimeout(900);
        const now = (await mount.getAttribute(edge.attr)) ?? '';
        if (now !== '' && now === last) break;
        last = now;
      }

      // Poll to the clamp value, not «changed from before»: at a clamp it does
      // not change, so a difference assertion waits for something that will
      // never happen and reports a timeout instead of the state under test.
      await expect
        .poll(async () => page.locator('[data-window-start]').getAttribute(edge.attr), {
          timeout: 30_000,
        })
        .toBe(edge.value);

      // «Does not empty» has to be a number. Four lead seats, a pinned head and
      // the subordinate slice survive even a zero-width window, so anything at
      // or below that count is exactly the failure this row is about.
      const counts = await page.evaluate(() => {
        const b = (window as unknown as { __demoE2e: { getSceneCounts(): { positions: number } } }).__demoE2e;
        return b.getSceneCounts();
      });
      expect(counts.positions).toBeGreaterThan(100);
      await expect(page.locator('#status')).toContainText(edge.says);
    });
  }

  // Acceptance row 13: the band ahead of a fast gesture must be named.
  test('row 13: a fling says the scene is catching up instead of going quietly blank', async ({
    page,
  }) => {
    test.slow();
    await expect(page.locator('[data-window-start]')).toHaveCount(1, { timeout: 60_000 });
    await page.waitForTimeout(2000);

    // A fling, not a pan: the reserve exists to cover an ordinary gesture, and
    // row 13 is about the one that outruns it.
    await page.evaluate(async () => {
      const canvas = document.querySelector('canvas')!;
      const r = canvas.getBoundingClientRect();
      const opts = (x: number, y: number) => ({
        clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1,
      });
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      canvas.dispatchEvent(new PointerEvent('pointerdown', opts(cx, cy)));
      await new Promise<void>((resolve) => {
        const started = performance.now();
        const step = (): void => {
          const p = Math.min(1, (performance.now() - started) / 350);
          canvas.dispatchEvent(new PointerEvent('pointermove', opts(cx, cy - p * 3000)));
          if (p < 1) requestAnimationFrame(step);
          else {
            canvas.dispatchEvent(new PointerEvent('pointerup', opts(cx, cy - 3000)));
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    });

    // The wait has to be named while it lasts. Skeletons were the planned answer
    // and did not enter, so the status is the whole of «not silent».
    await expect(page.locator('#status')).toContainText('catching up to the camera', {
      timeout: 20_000,
    });
    // And it must not stay that way: the window lands and says where it is.
    await expect(page.locator('#status')).toContainText(/window \d+…\d+ \//, { timeout: 30_000 });
  });

  // Acceptance row 8: a resize moves nothing, but it changes how much fits.
  test('row 8: growing the viewport materialises more seats without a camera move', async ({
    page,
  }) => {
    test.slow();
    const mount = page.locator('[data-window-start]');
    const settled = async (): Promise<number> => {
      let last = NaN;
      for (let i = 0; i < 40; i += 1) {
        const now = Number(await mount.getAttribute('data-window-end'));
        if (now === last) return now;
        last = now;
        await page.waitForTimeout(200);
      }
      return last;
    };
    await settled();
    const before = await page.evaluate(() => {
      const b = (window as unknown as {
        __demoE2e: { getSceneCounts(): { positions: number }; getViewport(): { scale: number } };
      }).__demoE2e;
      return { counts: b.getSceneCounts(), viewport: b.getViewport() };
    });

    await page.setViewportSize({ width: 1440, height: 1600 });
    await page.waitForTimeout(2500);
    await settled();

    const after = await page.evaluate(() => {
      const b = (window as unknown as {
        __demoE2e: { getSceneCounts(): { positions: number }; getViewport(): { scale: number } };
      }).__demoE2e;
      return { counts: b.getSceneCounts(), viewport: b.getViewport() };
    });

    // A taller viewport shows more rows, so more seats have to exist to fill it.
    expect(after.counts.positions).toBeGreaterThan(before.counts.positions);
    // «Without a camera move» means the user did not move it — not that `y` is
    // untouched. The resize slides the window, and `rebaseViewport` then shifts
    // the camera by exactly that slide so the content stays put; asserting the
    // raw transform is unchanged would be asserting the compensation is broken.
    // What must not change is the zoom: a resize is not a zoom.
    expect(after.viewport.scale).toBe(before.viewport.scale);
  });

  // Acceptance row 10: zooming out is otherwise an unbounded request.
  test('row 10: a wide zoom is capped, and the status says so', async ({ page }) => {
    test.slow();
    await page.evaluate(() => {
      const b = (window as unknown as { __demoE2e: { setZoom(v: number): void } }).__demoE2e;
      b.setZoom(0.02);
    });
    await expect(page.locator('#status')).toContainText('capped', { timeout: 40_000 });

    const counts = await page.evaluate(() => {
      const b = (window as unknown as { __demoE2e: { getSceneCounts(): { positions: number } } }).__demoE2e;
      return b.getSceneCounts();
    });
    // The ceiling is 4 000 tier-2 seats; the scene adds the lead tier and the
    // subordinate slice on top, so the bound is «about the ceiling», not «under
    // it to the seat».
    expect(counts.positions).toBeLessThan(4200);
    await expect(page.locator('#status')).toContainText('not all of the view is materialised');
  });

  // Acceptance row 14: a jump must move the window, not the scene around it.
  test('a pos-N jump keeps the canvas and the zoom it was given', async ({ page }) => {
    type Bridge = {
      getViewport(): { x: number; y: number; scale: number };
      setViewport(v: object): void;
    };
    const viewport = () =>
      page.evaluate(() => (window as unknown as { __demoE2e: Bridge }).__demoE2e.getViewport());

    // Mark the live canvas. `reload()` empties the mount, so a recreated scene
    // cannot carry this attribute — it is the difference the row is about.
    await page.evaluate(() => {
      document.querySelector('canvas')!.setAttribute('data-canvas-identity', 'original');
    });

    // Zoom away from what `fitView` would choose, so a refit is a visible number
    // rather than a claim: at the fit scale, refitting and not refitting agree.
    await page.evaluate(() => {
      const b = (window as unknown as { __demoE2e: Bridge }).__demoE2e;
      const vp = b.getViewport();
      b.setViewport({ ...vp, scale: vp.scale * 0.4 });
    });
    // The zoom is a camera move too — let the slide it triggers finish first.
    const mount = page.locator('[data-window-start]');
    const settledStart = async (): Promise<string> => {
      let last = '';
      for (let i = 0; i < 40; i += 1) {
        const now = (await mount.getAttribute('data-window-start')) ?? '';
        if (now === last) return now;
        last = now;
        await page.waitForTimeout(150);
      }
      return last;
    };
    const startBefore = await settledStart();
    const before = await viewport();

    const search = page.locator('#search-input');
    await search.fill('pos-500000');
    await search.press('Enter');

    // The barrier, and the proof that anything happened at all: the window
    // start is the one thing in the DOM that says the jump landed. Waiting on
    // the focus seat alone would rest on the mount-time slide having already
    // wiped the previous one — true today, and a sleep away from not being.
    await expect
      .poll(async () => await mount.getAttribute('data-window-start'), { timeout: 30_000 })
      .not.toBe(startBefore);
    await expect(page.getByTestId('node-scale-focus-seat')).toBeVisible({ timeout: 30_000 });

    expect(await page.locator('canvas').first().getAttribute('data-canvas-identity')).toBe(
      'original',
    );
    const after = await viewport();
    expect(after.scale).toBeCloseTo(before.scale, 5);
  });
});
