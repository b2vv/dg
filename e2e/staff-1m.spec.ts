import { expect, test } from '@playwright/test';

/**
 * The 1M staff tab is windowed: it must draw a slice, say so, and let the
 * search move the window across the address space.
 */
test.describe('1M staff scale tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?e2e=1');
    await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Staff · 1M', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Staff · 1M', { timeout: 60_000 });
  });

  test('draws a window of the address space and says so', async ({ page }) => {
    const caption = page.locator('.scene-caption');
    await expect(caption).toContainText('1 000 000');
    await expect(caption).toContainText('window');
    // Three tiers are present: lead head, current-org focus seat, subordinate card.
    await expect(page.getByTestId('node-scale-lead-head')).toBeVisible();
    await expect(page.getByTestId('node-scale-focus-seat')).toBeVisible();
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
    // Tier 3 lives past 700 004 — the window cannot centre there.
    await search.fill('pos-900000');
    await search.press('Enter');
    await expect(page.locator('#status')).toContainText(/subordinate tier/, { timeout: 60_000 });
    await expect(page.getByTestId('node-scale-focus-seat')).toHaveCount(0);
  });

  test('a name query that is not in the window says so instead of lying', async ({ page }) => {
    const search = page.locator('#search-input');
    await search.fill('Nonexistent Person');
    await search.press('Enter');
    await expect(page.locator('#status')).toContainText(/not in the window|hits in the current window/, {
      timeout: 30_000,
    });
  });
});

test.describe('the window follows the camera (T88)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?e2e=1');
    await page.getByRole('button', { name: 'Staff · 1M' }).click();
    await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
  });

  test('panning past the edge materializes seats nobody asked for', async ({ page }) => {
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
        let i = 0;
        const step = (): void => {
          i += 1;
          // Dragging the content up brings lower parts of the wall into view,
          // which is where the higher seat indices live.
          canvas.dispatchEvent(new PointerEvent('pointermove', opts(cx, cy - i * 14)));
          if (i < 60) requestAnimationFrame(step);
          else {
            canvas.dispatchEvent(new PointerEvent('pointerup', opts(cx, cy - i * 14)));
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    });

    // The rebuild is debounced and async — this attribute is the only thing in
    // the DOM that says it happened, which is why T88.5 puts it there.
    await expect
      .poll(async () => Number(await mount.getAttribute('data-window-start')), { timeout: 15_000 })
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
      document.querySelector('canvas')!.setAttribute('data-t88-probe', 'original');
    });

    // Zoom away from what `fitView` would choose, so a refit is a visible number
    // rather than a claim: at the fit scale, refitting and not refitting agree.
    await page.evaluate(() => {
      const b = (window as unknown as { __demoE2e: Bridge }).__demoE2e;
      const vp = b.getViewport();
      b.setViewport({ ...vp, scale: vp.scale * 0.4 });
    });
    // The zoom is a camera move too — let the slide it triggers finish first.
    await page.waitForTimeout(900);
    const before = await viewport();

    const search = page.locator('#search-input');
    await search.fill('pos-500000');
    await search.press('Enter');
    await expect(page.getByTestId('node-scale-focus-seat')).toBeVisible({ timeout: 30_000 });

    expect(await page.locator('canvas').first().getAttribute('data-t88-probe')).toBe('original');
    const after = await viewport();
    expect(after.scale).toBeCloseTo(before.scale, 5);
    // It did move: a jump that changed nothing would pass the two checks above.
    await expect(page.locator('[data-window-start]')).not.toHaveAttribute('data-window-start', '0');
  });
});
