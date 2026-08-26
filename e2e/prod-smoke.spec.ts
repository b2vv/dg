import { expect, test, type Page } from '@playwright/test';

/**
 * Post-deploy smoke — runs against the LIVE deployment, not a local preview.
 * Config: playwright.prod.config.ts (no webServer). Run: `npm run test:prod`.
 *
 * Deliberately narrow. Bounds and failure cases are already covered by the
 * local e2e suite; re-running them here costs more than it tells us. What only
 * the real deployment can show is a stale build, a broken asset path under the
 * /dg/ base, and behaviour under real volume and latency.
 *
 * Why this file does NOT reuse `demoBridge.ts`: those helpers navigate with
 * `page.goto('/?e2e=1')`, and a leading slash DROPS the base path — against
 * `https://b2vv.github.io/dg/` it resolves to the domain root, which is a 404.
 * Locally that is invisible, because the preview server is served at `/`.
 * Paths here are base-relative (no leading slash) for that reason.
 */

const TAB_READY_TIMEOUT = 90_000;

async function openTab(page: Page, name: string, timeout = TAB_READY_TIMEOUT): Promise<void> {
  await page.goto('?e2e=1');
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout });
}

test.describe('post-deploy smoke', () => {
  test('the live build loads and reports which bundle is serving', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    const response = await page.goto('');
    expect(response?.status(), 'live URL must answer 200').toBe(200);

    // "Which build actually opened" — cache and CDN serve stale bundles more
    // often than it feels, so the answer belongs in the report, not in a guess.
    const bundles = await page.locator('script[src]').evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLScriptElement).getAttribute('src') ?? '').filter(Boolean),
    );
    expect(bundles.length, 'demo must ship at least one script bundle').toBeGreaterThan(0);
    console.log(`[post-deploy] serving bundles: ${bundles.join(', ')}`);

    await expect(page.getByRole('button', { name: 'Flat orgs', exact: true })).toBeVisible();
    expect(consoleErrors, 'no console errors on first paint').toEqual([]);
  });

  test('flat orgs renders a diagram with reachable anchors', async ({ page }) => {
    await openTab(page, 'Flat orgs');

    await expect(page.getByTestId('node-root')).toBeVisible();
    await expect(page.getByTestId('diagram-ready')).toBeVisible();
    await expect(page.locator('[data-org-hierarchy-test-anchors] button')).not.toHaveCount(0);
  });

  test('100k orgs still becomes ready on real hardware and latency', async ({ page }) => {
    await openTab(page, '100k orgs');
    await expect(page.getByTestId('diagram-ready')).toBeVisible();
  });
});
