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
