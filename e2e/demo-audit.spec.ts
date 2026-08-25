import { expect, test } from '@playwright/test';

/**
 * T33 — the demo audit checklist, as assertions instead of eyeballing.
 * The visual items (contour coverage, edge routing, zoom crispness) live in the
 * screenshot baselines; these are the structural ones.
 */
test.describe('demo audit (T33)', () => {
  test('cold load requests nothing that 404s', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
    });
    await page.goto('/');
    await page.waitForTimeout(2500);
    expect(failed).toEqual([]);
  });

  test('contour sliders are enabled only where departments are contours', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2500);
    // Both sliders, not just Padding — they are enabled and disabled together.
    const disabled = async () =>
      Promise.all([
        page.locator('#padding-control').getAttribute('data-disabled'),
        page.locator('#smooth-control').getAttribute('data-disabled'),
      ]);
    const openTab = async (name: string) => {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('#status')).not.toContainText('Loading', { timeout: 60_000 });
    };

    // Variant B paints magnetic contours.
    expect(await disabled()).toEqual(['false', 'false']);

    // Department cards, not contours — the sliders must go quiet.
    for (const name of ['Staff · Figma', 'Staff tree']) {
      await openTab(name);
      expect(await disabled(), name).toEqual(['true', 'true']);
    }

    // Every tab whose departments are contours keeps them live.
    for (const name of ['Staff · Magnetic', 'Staff · Flood', 'Staff · GoJS']) {
      await openTab(name);
      expect(await disabled(), name).toEqual(['false', 'false']);
    }
  });

  test('tab state follows the content, and search does not leak between tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2500);
    const search = page.locator('#search-input');
    await search.fill('Олена');
    await search.press('Enter');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Flat orgs', exact: true }).click();
    await expect(page.locator('#status')).toContainText(/flat|Flat/, { timeout: 60_000 });
    // Exactly one tab is active, and it is the one that was clicked.
    const active = page.locator('.tabs button.active');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText('Flat orgs');
    // The query from the previous tab is not silently still in effect.
    await expect(page.locator('#status')).not.toContainText('Олена');
  });

  test('one set of on-diagram zoom controls', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2500);
    await expect(page.locator('.zoom-fab')).toHaveCount(1);
    await expect(page.locator('.zoom-fab button')).toHaveCount(3);
  });
});
