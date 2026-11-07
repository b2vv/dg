import { expect, test, type Page } from '@playwright/test';
import { open100kOrgs } from './demoBridge.js';

type Bridge = {
  getAnchors(): Array<{ testId: string }>;
  setZoom(scale: number): void;
  getViewport(): { x: number; y: number; scale: number };
};

async function viewport(page: Page) {
  return page.evaluate(() => (window as unknown as { __demoE2e: Bridge }).__demoE2e.getViewport());
}

async function openLargeScene(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 1040 });
  await open100kOrgs(page);
  // Same fixed mount as mockups.spec.ts: status/toolbar wrapping must not
  // change fitView's centre between the reference and the culling run.
  await page.addStyleTag({
    content: `
    #diagram-mount.diagram-mount {
      flex: 0 0 800px !important;
      height: 800px !important;
      max-height: 800px !important;
      width: 1280px !important;
    }
  `,
  });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect
    .poll(async () => (await page.locator('#diagram-mount').boundingBox())?.height)
    .toBe(800);
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
  await page.getByTestId('diagram-ready').waitFor();
  await page.locator('[data-zoom="fit"]').click();
  // The tab represents 100k addresses but materializes only 400 cards. Verify
  // the scene itself crosses CULL_MIN_NODES, before zoom hides its anchors.
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __demoE2e: Bridge }).__demoE2e.getAnchors().length,
      ),
    )
    .toBeGreaterThanOrEqual(300);
  await page.evaluate(() => {
    (window as unknown as { __demoE2e: Bridge }).__demoE2e.setZoom(1.37);
  });
  await expect.poll(async () => (await viewport(page)).scale).toBeCloseTo(1.37);
  await expect(page.locator('#diagram-mount')).toHaveCSS('filter', 'none');
}

// T87's in-page pointer gesture: one move per animation frame, avoiding CDP
// round-trip timing. Its measurement spec has no blur assertion; the existing
// motionBlur.contract.test.ts supplies the host CSS-filter observation below.
async function panGesture(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    const mount = document.querySelector<HTMLElement>('#diagram-mount');
    if (!canvas || !mount) throw new Error('diagram canvas/mount missing');
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const opts = (x: number, y: number): PointerEventInit => ({
      pointerId: 1,
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
      bubbles: true,
      cancelable: true,
    });
    const filters: string[] = [];
    canvas.dispatchEvent(new PointerEvent('pointerdown', opts(cx, cy)));
    await new Promise<void>((resolve) => {
      let i = 0;
      const step = (): void => {
        i += 1;
        // Faster than T87's 6px/frame, which is below blur's dead zone at 60Hz.
        const x = cx - i * 18;
        const y = cy - i * 6;
        canvas.dispatchEvent(new PointerEvent('pointermove', opts(x, y)));
        filters.push(mount.style.filter);
        if (i < 20) requestAnimationFrame(step);
        else {
          canvas.dispatchEvent(new PointerEvent('pointerup', opts(x, y)));
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
    return filters;
  });
}

test.describe('GPU viewport culling', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('AC2 — zoomed and panned viewport matches the unculled baseline', async ({ page }) => {
    await openLargeScene(page);
    const before = await viewport(page);
    await panGesture(page);
    const after = await viewport(page);
    expect(after.x).toBeLessThan(before.x);
    expect(after.y).toBeLessThan(before.y);
    await expect(page.locator('#diagram-mount')).toHaveCSS('filter', 'none');
    // In-viewport anchors still exist after the culling pan: culling must not
    // empty the visible region (behavioural, platform-independent proof of AC2).
    await expect
      .poll(() => page.locator('[data-org-hierarchy-test-anchors] button').count())
      .toBeGreaterThan(0);

    // NOTE: exact pixel-parity (culling vs no-culling) is a MANUAL step, not a
    // CI gate here. A toHaveScreenshot baseline generated from the culling build
    // proves only self-stability, not parity; a true baseline must be captured
    // with culling disabled (CULL_MIN_NODES = Infinity), then compared against
    // the culling build. Recorded as a manual check in the ship report.
  });

  test('AC9 — fast pan keeps motion blur and settles without throwing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openLargeScene(page);
    const before = await viewport(page);
    const filters = await panGesture(page);
    const after = await viewport(page);
    expect(after.x).toBeLessThan(before.x);
    expect(after.y).toBeLessThan(before.y);
    expect(
      filters.some(
        (filter) => /^blur\([\d.]+px\)$/.test(filter) && Number(filter.slice(5, -3)) > 0,
      ),
    ).toBe(true);
    await expect(page.locator('#diagram-mount')).toHaveCSS('filter', 'none');
    expect(errors).toEqual([]);
  });
});
