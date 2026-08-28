import { test, expect } from '@playwright/test';

// T87.0 TEMPORARY — measurement, not a test. Deleted once the number lands.
test('K0 — real promote sync cost on Staff · 1M', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: 'Staff · 1M' }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(2000);

  for (const zoom of [2.14, 1.71, 1.37, 0.52, 1.2, 1.2]) {
    const out = await page.evaluate(async (z) => {
      const w = window as unknown as {
        __demoE2e: { measurePromoteSync(z?: number, n?: number): unknown };
      };
      return w.__demoE2e.measurePromoteSync(z, 40);
    }, zoom);
    console.log(`\n=== zoom target ${zoom} ===\n` + JSON.stringify(out, null, 2));
  }
  expect(true).toBe(true);
});
