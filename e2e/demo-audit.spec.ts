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

  // Acceptance row 22: a rebuild outlives the tab that asked for it.
  test('a tab switch mid-rebuild does not leave the old window on the new tab', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/?e2e=1');
    await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Staff · 1M', exact: true }).click();
    await expect(page.locator('[data-window-start]')).toHaveCount(1, { timeout: 60_000 });

    // Start a rebuild, then leave before it can land. RebuildScheduler.stop()
    // cancels what has not begun and lets an in-flight job finish, so the tail
    // resolves against a scene that belongs to another tab by then.
    await page.evaluate(() => {
      const b = (window as unknown as {
        __demoE2e: { getViewport(): { x: number; y: number; scale: number }; setViewport(v: object): void };
      }).__demoE2e;
      const vp = b.getViewport();
      b.setViewport({ ...vp, y: vp.y - 60_000 });
    });
    await page.waitForTimeout(180);
    await page.getByRole('button', { name: 'Staff tree', exact: true }).click();
    await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
    await page.waitForTimeout(4000);

    // The markers describe a window; on a tab that has none they must be absent
    // rather than stale. They used to survive every tab switch, race or no race.
    await expect(page.locator('[data-window-start]')).toHaveCount(0);
    await expect(page.locator('#status')).not.toContainText('staff · window');
  });

  test('one set of on-diagram zoom controls', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2500);
    await expect(page.locator('.zoom-fab')).toHaveCount(1);
    await expect(page.locator('.zoom-fab button')).toHaveCount(3);
  });
});
