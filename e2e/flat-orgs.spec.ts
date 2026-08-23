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

  test('org-2 expand via API (+) and card click keeps subtree in viewport', async ({ page }) => {
    await page.goto('/?e2e=1');
    await page.getByRole('button', { name: 'Flat orgs' }).click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 30_000 });

    await page.evaluate(async () => {
      const bridge = (window as unknown as { __demoE2e?: { expandOrg(id: string): Promise<void> } })
        .__demoE2e;
      await bridge?.expandOrg('org-1');
    });
    await expect(page.getByTestId('node-org-2')).toBeVisible({ timeout: 10_000 });

    await page.evaluate(async () => {
      const bridge = (window as unknown as { __demoE2e?: { expandOrg(id: string): Promise<void> } })
        .__demoE2e;
      await bridge?.expandOrg('org-2');
    });
    await expect(page.getByTestId('node-org-3')).toBeVisible({ timeout: 10_000 });

    const org2 = page.getByTestId('node-org-2');
    await org2.click();
    await expect(org2).toBeVisible();
    await expect(page.getByTestId('node-org-3')).toBeVisible();
    await expect(page.getByTestId('diagram-ready')).toBeVisible();
  });
});
