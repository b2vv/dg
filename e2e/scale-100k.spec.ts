import { expect, test } from '@playwright/test';
import { clickOrg, getScaleWindowStart, open100kOrgs } from './demoBridge.js';

test.describe('100k orgs scale', () => {
  test('search org-50000 shows node in viewport', async ({ page }) => {
    await open100kOrgs(page);

    await page.getByPlaceholder('Alice… / org-50000').fill('org-50000');
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('node-org-50000')).toBeVisible({ timeout: 15_000 });
  });

  test('collapse all keeps matrix nodes visible', async ({ page }) => {
    await open100kOrgs(page);

    await page.getByRole('button', { name: 'Collapse all' }).click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-org-hierarchy-test-anchors] button').first()).toBeVisible();
  });

  test('click org-0 in window via demo handler keeps same window', async ({ page }) => {
    await open100kOrgs(page);

    const startBefore = await getScaleWindowStart(page);
    expect(startBefore).toBe(0);

    await clickOrg(page, 'org-0');

    const startAfter = await getScaleWindowStart(page);
    expect(startAfter).toBe(startBefore);
    await expect(page.getByTestId('node-org-0')).toBeVisible();
  });

  test('search org-90000 recenters window on target org', async ({ page }) => {
    await open100kOrgs(page);

    await page.getByPlaceholder('Alice… / org-50000').fill('org-90000');
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('node-org-90000')).toBeVisible({ timeout: 30_000 });
  });
});
