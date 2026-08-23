import { expect, test } from '@playwright/test';

interface DemoE2eBridge {
  collapseOrg(orgId: string): Promise<void> | undefined;
  getStaffExpandedOrgIds(): string[];
  focusTestId(testId: string): Promise<boolean> | undefined;
}

const MOCKUP_TABS = [
  { label: 'Orgs · Figma', slug: 'mockup-orgs-figma', anchor: 'mockup-root' },
  { label: 'Orgs · GoJS', slug: 'mockup-orgs-gojs', anchor: 'mockup-hq' },
  { label: 'Staff · Figma', slug: 'mockup-staff-figma', anchor: 'staff-head' },
  { label: 'Staff · GoJS', slug: 'mockup-staff-gojs', anchor: 'staff-head' },
] as const;

async function openMockupTab(
  page: import('@playwright/test').Page,
  label: string,
): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.locator('#status')).toContainText(label.split(' · ')[0], { timeout: 30_000 });
  await page.waitForTimeout(400);
}

function parseZoom(statusText: string): number {
  const m = statusText.match(/zoom\s+([\d.]+)/);
  expect(m).toBeTruthy();
  return Number(m![1]);
}

test.describe('mockup tabs visual + hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?e2e=1');
    await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });
  });

  for (const tab of MOCKUP_TABS) {
    test(`${tab.label}: near-LOD fit + anchor visible`, async ({ page }) => {
      await openMockupTab(page, tab.label);
      const status = await page.locator('#status').textContent();
      expect(parseZoom(status ?? '')).toBeGreaterThanOrEqual(0.55);
      await expect(page.getByTestId(`node-${tab.anchor}`)).toBeVisible({ timeout: 15_000 });
    });

    test(`${tab.label}: diagram screenshot`, async ({ page }) => {
      await openMockupTab(page, tab.label);
      const mount = page.locator('#diagram-mount');
      await expect(mount).toBeVisible();
      await expect(mount).toHaveScreenshot(`${tab.slug}.png`, {
        maxDiffPixelRatio: 0.04,
        animations: 'disabled',
      });
    });
  }

  test('Orgs · Figma: collapse mid hides peer divisions', async ({ page }) => {
    await openMockupTab(page, 'Orgs · Figma');
    await expect(page.getByTestId('node-mockup-mid')).toBeVisible();
    await expect(page.getByTestId('node-org-harbor')).toBeVisible();

    await page.evaluate(() => {
      const bridge = (window as unknown as { __demoE2e?: { collapseOrg(id: string): Promise<void> } })
        .__demoE2e;
      return bridge?.collapseOrg('org-mid');
    });
    await page.waitForTimeout(800);

    await expect(page.getByTestId('node-org-harbor')).toHaveCount(0);
    await expect(page.getByTestId('node-mockup-mid')).toBeVisible();
  });

  test('Staff · Figma: unit-current expanded by default', async ({ page }) => {
    await openMockupTab(page, 'Staff · Figma');
    await expect(page.getByTestId('node-staff-head')).toBeVisible();
    await expect(page.getByTestId('node-mockup-unit')).toBeVisible();

    const expanded = await page.evaluate(() => {
      const bridge = (window as unknown as { __demoE2e?: DemoE2eBridge }).__demoE2e;
      return bridge?.getStaffExpandedOrgIds() ?? [];
    });
    expect(expanded).toContain('unit-current');
  });
});
