import { expect, test } from '@playwright/test';
import { clickOrg, expandOrg, openFlatOrgs } from './demoBridge.js';

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

  test('org-1 expand (+ API) then org-2 demo click keeps subtree visible', async ({ page }) => {
    await openFlatOrgs(page);

    await expandOrg(page, 'org-1');
    await expect(page.getByTestId('node-org-2')).toBeVisible({ timeout: 10_000 });

    await expandOrg(page, 'org-2');
    await expect(page.getByTestId('node-org-3')).toBeVisible({ timeout: 10_000 });

    await clickOrg(page, 'org-2');
    await expect(page.getByTestId('node-org-2')).toBeVisible();
    await expect(page.getByTestId('node-org-3')).toBeVisible();
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
