import { expect, test } from '@playwright/test';

/**
 * T67 Phase 1 — multi-select via Pixi canvas (NOT e2e anchors).
 * With ?e2e=1, invisible anchors call focusByTestId → replace-only selection.
 */
test('T67: ctrl+click multi-select without e2e anchors', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  expect(page.url()).not.toContain('e2e=1');
  await expect(page.locator('[data-org-hierarchy-test-anchors]')).toHaveCount(0);
  await page.waitForTimeout(2500);

  const box = await page.locator('#diagram-mount canvas').first().boundingBox();
  if (!box) throw new Error('canvas bounding box missing');

  const clickAt = async (nx: number, ny: number, ctrl = false) => {
    const x = box.x + box.width * nx;
    const y = box.y + box.height * ny;
    if (ctrl) await page.keyboard.down('Control');
    await page.mouse.click(x, y);
    if (ctrl) await page.keyboard.up('Control');
    await page.waitForTimeout(400);
  };

  await clickAt(0.3, 0.3);
  expect(await page.locator('#status').textContent()).toMatch(/1 selected/i);

  await clickAt(0.5, 0.3, true);
  expect(await page.locator('#status').textContent()).toMatch(/2 selected/i);

  await clickAt(0.5, 0.3, true);
  expect(await page.locator('#status').textContent()).toMatch(/1 selected/i);

  await clickAt(0.4, 0.7);
  expect(await page.locator('#status').textContent()).toMatch(/0 selected/i);
});
