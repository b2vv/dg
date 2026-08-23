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

  const status = () => page.locator('#status').textContent();

  const clickAt = async (nx: number, ny: number, ctrl = false) => {
    const x = box.x + box.width * nx;
    const y = box.y + box.height * ny;
    if (ctrl) await page.keyboard.down('Control');
    await page.mouse.click(x, y);
    if (ctrl) await page.keyboard.up('Control');
    await page.waitForTimeout(300);
  };

  const findSingleSelectClick = async () => {
    for (let ny = 0.15; ny <= 0.75; ny += 0.05) {
      for (let nx = 0.15; nx <= 0.85; nx += 0.05) {
        await clickAt(nx, ny);
        if ((await status())?.match(/1 selected/i)) return { nx, ny };
      }
    }
    throw new Error('T67 e2e: no canvas point selects exactly one card');
  };

  const findCtrlAddClick = async (base: { nx: number; ny: number }) => {
    for (let ny = 0.15; ny <= 0.75; ny += 0.05) {
      for (let nx = 0.15; nx <= 0.85; nx += 0.05) {
        if (Math.hypot(nx - base.nx, ny - base.ny) < 0.08) continue;
        await clickAt(base.nx, base.ny);
        expect(await status()).toMatch(/1 selected/i);
        await clickAt(nx, ny, true);
        if ((await status())?.match(/2 selected/i)) return { nx, ny };
      }
    }
    throw new Error('T67 e2e: no ctrl+click adds a second card');
  };

  const findCanvasClearClick = async () => {
    for (const [nx, ny] of [
      [0.05, 0.05],
      [0.95, 0.05],
      [0.05, 0.95],
      [0.4, 0.85],
      [0.6, 0.85],
    ] as const) {
      await clickAt(nx, ny);
      if ((await status())?.match(/0 selected/i)) return;
    }
    throw new Error('T67 e2e: no canvas point clears selection');
  };

  const first = await findSingleSelectClick();
  const second = await findCtrlAddClick(first);
  expect(await status()).toMatch(/2 selected/i);

  await clickAt(second.nx, second.ny, true);
  expect(await status()).toMatch(/1 selected/i);

  await findCanvasClearClick();
  expect(await status()).toMatch(/0 selected/i);
});
