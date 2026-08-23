import { expect, test } from '@playwright/test';

test.describe('flat orgs root expand', () => {
  test('click root anchor expands children without empty canvas', async ({ page }) => {
    await page.goto('/?e2e=1');
    await page.getByRole('button', { name: 'Flat orgs' }).click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 30_000 });

    const root = page.getByTestId('node-root');
    await expect(root).toBeVisible();
    await root.click();

    await expect(page.getByTestId('node-org-2')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('diagram-ready')).toBeVisible();
    await expect(page.locator('[data-org-hierarchy-test-anchors] button')).not.toHaveCount(0);
  });
});
