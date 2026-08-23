import { expect, test } from '@playwright/test';

test.describe('100k orgs scale', () => {
  test('search org-50000 shows node in viewport', async ({ page }) => {
    await page.goto('/?e2e=1');
    await page.getByRole('button', { name: '100k orgs' }).click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 60_000 });

    await page.getByPlaceholder('Alice… / org-50000').fill('org-50000');
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('node-org-50000')).toBeVisible({ timeout: 15_000 });
  });

  test('collapse all keeps matrix nodes visible', async ({ page }) => {
    await page.goto('/?e2e=1');
    await page.getByRole('button', { name: '100k orgs' }).click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: 'Collapse all' }).click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-org-hierarchy-test-anchors] button').first()).toBeVisible();
  });

  test('click org-0 in window focuses without full reload', async ({ page }) => {
    await page.goto('/?e2e=1');
    await page.getByRole('button', { name: '100k orgs' }).click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 60_000 });

    const org0 = page.getByTestId('node-org-0');
    await expect(org0).toBeVisible();
    await org0.click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 2_000 });
    await expect(org0).toBeVisible();
    await expect(page.locator('#status')).not.toContainText('search', { timeout: 1_000 });
  });

  test('search org-90000 recenters window on target org', async ({ page }) => {
    await page.goto('/?e2e=1');
    await page.getByRole('button', { name: '100k orgs' }).click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 60_000 });

    await page.getByPlaceholder('Alice… / org-50000').fill('org-90000');
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('node-org-90000')).toBeVisible({ timeout: 30_000 });
  });
});
