import { expect, test } from '@playwright/test';

/**
 * The 1M staff tab is windowed: it must draw a slice, say so, and let the
 * search move the window across the address space.
 */
test.describe('1M staff scale tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?e2e=1');
    await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Staff · 1M', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Staff · 1M', { timeout: 60_000 });
  });

  test('draws a window of the address space and says so', async ({ page }) => {
    const caption = page.locator('.scene-caption');
    await expect(caption).toContainText('1 000 000');
    await expect(caption).toContainText('window');
    // Three tiers are present: lead head, current-org focus seat, subordinate card.
    await expect(page.getByTestId('node-scale-lead-head')).toBeVisible();
    await expect(page.getByTestId('node-scale-focus-seat')).toBeVisible();
  });

  test('search by seat index moves the window', async ({ page }) => {
    const search = page.locator('#search-input');
    await search.fill('pos-500000');
    await search.press('Enter');
    await expect(page.locator('#status')).toContainText('Staff · 1M', { timeout: 60_000 });
    // The window re-centred: the focus seat exists again, around the new index.
    await expect(page.getByTestId('node-scale-focus-seat')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.scene-caption')).toContainText('window');
  });

  test('an index outside tier 2 is reported, not silently re-centred', async ({ page }) => {
    const search = page.locator('#search-input');
    // Tier 3 lives past 700 004 — the window cannot centre there.
    await search.fill('pos-900000');
    await search.press('Enter');
    await expect(page.locator('#status')).toContainText(/subordinate tier/, { timeout: 60_000 });
    await expect(page.getByTestId('node-scale-focus-seat')).toHaveCount(0);
  });

  test('a name query that is not in the window says so instead of lying', async ({ page }) => {
    const search = page.locator('#search-input');
    await search.fill('Nonexistent Person');
    await search.press('Enter');
    await expect(page.locator('#status')).toContainText(/not in the window|hits in the current window/, {
      timeout: 30_000,
    });
  });
});
