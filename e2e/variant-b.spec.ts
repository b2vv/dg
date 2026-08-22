import { expect, test } from '@playwright/test';

test.describe('variant B context menu', () => {
  test('context menu opens on CEO anchor', async ({ page }) => {
    await page.goto('/?e2e=1');
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 30_000 });

    const ceo = page.getByTestId('node-ceo');
    await expect(ceo).toBeVisible({ timeout: 10_000 });
    await ceo.click({ button: 'right' });

    await expect(page.getByTestId('org-context-menu')).toBeVisible();
  });
});
