import { test, expect, type Page } from '@playwright/test';

/**
 * Promote overlay in `near-visible` mode — every visible card is raised into
 * HTML above the near threshold, none below it (T87, acceptance rows 1-5, 8).
 *
 * The mode is opt-in via `?promote=near-visible`, so the default selection
 * behaviour, and the e2e that pins it, keep their meaning.
 *
 * Rows about the threshold run on `Staff · 1M`, which keeps the **default** LOD
 * bands (near at 1.2). The mockup tabs override `midMax` to 0.5, so asserting
 * the real rule there would have measured the override instead.
 */

const PROMOTE_ROOT = '[data-org-hierarchy-promote-root]';

async function openTab(page: Page, name: string): Promise<void> {
  await page.goto('/?e2e=1&promote=near-visible');
  await page.getByRole('button', { name }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
}

/**
 * Wait for the overlay to finish a rebuild, rather than for a guessed number of
 * milliseconds.
 *
 * While the camera moves the layer carries a catch-up transform, and a full sync
 * clears it. An empty transform therefore means "the rebuild for the current
 * camera has happened". Sleeping a fixed 400 ms instead made these tests fail
 * under a fully parallel local run — the settle simply landed later — which is a
 * property of the harness, not of the feature.
 */
async function waitForSettle(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const el = document.querySelector<HTMLElement>('[data-org-hierarchy-promote-root]');
          return el ? el.style.transform : 'missing';
        }),
      { timeout: 20_000 },
    )
    .toBe('');
}

async function setZoom(page: Page, zoom: number): Promise<void> {
  await page.evaluate((z) => {
    const bridge = (window as unknown as { __demoE2e?: { setZoom?(v: number): void } }).__demoE2e;
    if (!bridge?.setZoom) throw new Error('__demoE2e.setZoom missing — load page with ?e2e=1');
    bridge.setZoom(z);
  }, zoom);
  await waitForSettle(page);
}

function cards(page: Page) {
  return page.locator(`${PROMOTE_ROOT} [data-promote-card]`);
}

/** Nodes Pixi has stopped drawing — the canvas half of the swap. */
async function hiddenInPixi(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const b = (window as unknown as { __demoE2e: { getPromotedNodeIds(): string[] } }).__demoE2e;
    return b.getPromotedNodeIds();
  });
}

test.describe('promote · near-visible', () => {
  test('rows 1 and 2: cards above the near threshold, none below it', async ({ page }) => {
    await openTab(page, 'Staff · 1M');

    await setZoom(page, 1.4);
    const near = await cards(page).count();
    expect(near).toBeGreaterThan(1);
    // Every card in HTML is a node Pixi stopped drawing, and nothing else is
    // hidden. Counting only the DOM would miss a node hidden without a card.
    expect((await hiddenInPixi(page)).length).toBe(near);

    await setZoom(page, 0.8);
    // Below `near` the canvas cards are schematic; HTML chrome there would cost
    // without buying anything readable.
    await expect(cards(page)).toHaveCount(0);
    expect(await hiddenInPixi(page)).toEqual([]);

    await setZoom(page, 1.4);
    await expect(cards(page)).toHaveCount(near);
  });

  test('row 3: the host draws by entity type', async ({ page }) => {
    await openTab(page, 'Staff · Figma');
    await setZoom(page, 1.4);

    const modes = await page
      .locator(`${PROMOTE_ROOT} [data-promote-mode]`)
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-promote-mode')));

    // Three treatments of the same slot from one component: filled to the edges,
    // letterboxed, and no picture at all.
    expect(new Set(modes)).toEqual(new Set(['cover', 'contain', 'text']));
  });

  test('row 5: a card panned off screen goes back to being drawn by the canvas', async ({
    page,
  }) => {
    await openTab(page, 'Staff · 1M');
    await setZoom(page, 1.4);
    const before = await cards(page).evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-promote-card')),
    );
    expect(before.length).toBeGreaterThan(1);

    await page.evaluate(() => {
      const bridge = (
        window as unknown as { __demoE2e?: { setViewport?(v: { x: number }): void } }
      ).__demoE2e;
      bridge?.setViewport?.({ x: -20_000 });
    });
    await waitForSettle(page);

    const after = await cards(page).evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-promote-card')),
    );
    expect(after).not.toEqual(before);
    for (const id of after) expect(before).not.toContain(id);

    // The half that matters, and that the DOM cannot show: those seats are no
    // longer hidden, so Pixi is drawing them again. Without this the test only
    // proved the card disappeared, which is also what a hole in the scene looks
    // like.
    const hidden = await hiddenInPixi(page);
    for (const id of before) expect(hidden).not.toContain(id);
  });

  test('row 4: a bigger screen shows more cards at the same zoom', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await openTab(page, 'Staff · 1M');
    await setZoom(page, 1.4);
    const small = await cards(page).count();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await setZoom(page, 1.4);
    const large = await cards(page).count();

    // The limit is zoom, not a card count: a better monitor may show more, and
    // that is the intended behaviour rather than a leak.
    expect(large).toBeGreaterThan(small);
  });

  test('row 8: crossing the threshold repeatedly does not accumulate nodes', async ({ page }) => {
    await openTab(page, 'Staff · 1M');
    await setZoom(page, 1.4);
    const baseline = await cards(page).count();

    for (let i = 0; i < 10; i += 1) {
      await setZoom(page, 0.8);
      await setZoom(page, 1.4);
    }

    // Ten round trips must leave the layer exactly as it started; a leak here
    // would grow silently across a long session.
    //
    // The generous timeout is not a weaker assertion — the count still has to be
    // exactly the baseline. It is there because under a fully parallel local run
    // the last settle can land after the default 5 s, and this test has failed
    // that way twice while passing on its own. CI runs single-worker, so the
    // contention cannot happen there; the timeout keeps the local run honest
    // rather than papering over a real leak.
    await expect(cards(page)).toHaveCount(baseline, { timeout: 20_000 });
    await expect(page.locator(PROMOTE_ROOT)).toHaveCount(1);
  });
});
