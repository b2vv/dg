import { expect, test } from '@playwright/test';
import { clickOrg, openFlatOrgs } from './demoBridge.js';

test.describe('flat orgs root expand', () => {
  test('click root anchor expands children without empty canvas', async ({ page }) => {
    await openFlatOrgs(page);

    const root = page.getByTestId('node-root');
    await expect(root).toBeVisible();
    await root.click();

    await expect(page.getByTestId('node-org-2')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('diagram-ready')).toBeVisible();
    await expect(page.locator('[data-org-hierarchy-test-anchors] button')).not.toHaveCount(0);
  });

  test('org-1 expand (via the anchor) then org-2 demo click keeps subtree visible', async ({
    page,
  }) => {
    await openFlatOrgs(page);

    // T115 крок 2: розгортання йде **через якір у DOM**, а не через
    // `__demoE2e.expandOrg`. Місток кликав `diagram.expandOrg` напряму, тобто
    // цей тест перевіряв метод SDK, а не той шлях, яким користувач і хост
    // насправді розгортають вузол.
    //
    // Свідок — поява `org-6`, дитини `org-2`: сам `node-org-2` видно **й до**
    // кліку, бо вкладка відкривається мінімумом (T97), а не матрицею.
    await expect(page.getByTestId('node-org-6')).toHaveCount(0);
    await page.getByTestId('node-org-2-expander').click();
    await expect(page.getByTestId('node-org-6')).toBeVisible({ timeout: 10_000 });

    await clickOrg(page, 'org-2');
    await expect(page.getByTestId('node-org-2')).toBeVisible();
    await expect(page.getByTestId('node-org-6')).toBeVisible();
    await expect(page.getByTestId('diagram-ready')).toBeVisible();
  });
});

/**
 * T97 in the demo: the org tabs open to a minimum, and a `?reveal=` link lands
 * on its target already expanded.
 *
 * Written after checking it by hand in Chrome — which is also where the status
 * message turned out to be overwritten by the one `reload()` writes after
 * `create()`, the same trap the staff tier note hit (T88 §25.1).
 */
test.describe('initial expand (T97)', () => {
  test('a deep link opens the path to its target and says so', async ({ page }) => {
    test.slow();
    await page.goto('/?e2e=1&reveal=org-9');
    await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Flat orgs', exact: true }).click();

    // The message survives the status `reload()` writes right after create().
    await expect(page.locator('#status')).toContainText('opened to org-9', { timeout: 60_000 });
  });

  test('a link to nothing keeps the minimum and names the reason', async ({ page }) => {
    test.slow();
    await page.goto('/?e2e=1&reveal=org-does-not-exist');
    await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Flat orgs', exact: true }).click();

    // A stale link is an ordinary thing for a URL to carry: no crash, no empty
    // screen, and something a person can read.
    await expect(page.locator('#status')).toContainText('is not in this data', { timeout: 60_000 });
    await expect(page.getByTestId('diagram-ready')).toBeVisible();
  });
});

test.describe('collapsed siblings lay out as a grid (T113)', () => {
  test('four collapsed children of the expanded root make two rows, not one', async ({ page }) => {
    // The defect the user reported, measured rather than eyeballed: `org-1` is
    // the root, `org-2`..`org-5` are its children, and every one of them ships
    // collapsed (`flatOrgs.ts`). Before T113 they were a single row the width
    // of the canvas.
    await openFlatOrgs(page);
    await page.getByTestId('node-root').click();
    await expect(page.getByTestId('node-org-2')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('diagram-ready')).toBeVisible();

    // One synchronous pass over the DOM rather than four `boundingBox()` calls:
    // the anchor layer rebuilds itself wholesale on every sync
    // (`createTestAnchorOverlay.ts` — `layer.replaceChildren()`), so a locator
    // resolved for the first card is detached by the time the fourth is read.
    const cells = await page.evaluate((ids) =>
      ids.map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), left: Math.round(r.left) };
      }),
    ['node-org-2', 'node-org-3', 'node-org-4', 'node-org-5']);

    expect(cells.every((c) => c !== null)).toBe(true);
    // ceil(sqrt(4)) = 2 columns, so two rows and two columns — not 1x4.
    expect(new Set(cells.map((c) => c!.top)).size).toBe(2);
    expect(new Set(cells.map((c) => c!.left)).size).toBe(2);
  });
});
