import { expect, test } from '@playwright/test';

interface DemoE2eBridge {
  collapseOrg(orgId: string): Promise<void> | undefined;
  getStaffExpandedOrgIds(): string[];
  focusTestId(testId: string): Promise<boolean> | undefined;
  getStaffLayoutEdges(): Promise<Array<{ fromId: string; toId: string; kind: string }>>;
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

/** Fixed mount size — toolbar height drifts with Linux font fallback (Segoe UI missing → wrap/metrics), which used to yield 810 vs snapshot 804 and fail CI. */
const MOCKUP_MOUNT = { width: 1280, height: 800 } as const;

async function pinDiagramMount(page: import('@playwright/test').Page): Promise<void> {
  await page.addStyleTag({
    content: `
      #diagram-mount.diagram-mount {
        flex: 0 0 ${MOCKUP_MOUNT.height}px !important;
        height: ${MOCKUP_MOUNT.height}px !important;
        max-height: ${MOCKUP_MOUNT.height}px !important;
        width: ${MOCKUP_MOUNT.width}px !important;
      }
    `,
  });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  const box = await page.locator('#diagram-mount').boundingBox();
  expect(box?.width).toBe(MOCKUP_MOUNT.width);
  // Bounding box is exact; element screenshots can round ±1px without clip.
  expect(box?.height).toBeGreaterThanOrEqual(MOCKUP_MOUNT.height - 1);
  expect(box?.height).toBeLessThanOrEqual(MOCKUP_MOUNT.height + 1);
}

test.describe('mockup tabs visual + hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?e2e=1');
    await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });
    await pinDiagramMount(page);
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
      const box = await mount.boundingBox();
      expect(box).toBeTruthy();
      // Subpixel toolbar height (e.g. y=96.15625) makes element screenshots 801px tall;
      // page clip with integer origin keeps baselines size-stable across font metrics.
      await expect(page).toHaveScreenshot(`${tab.slug}.png`, {
        maxDiffPixelRatio: 0.04,
        animations: 'disabled',
        clip: {
          x: Math.round(box!.x),
          y: Math.round(box!.y),
          width: MOCKUP_MOUNT.width,
          height: MOCKUP_MOUNT.height,
        },
      });
    });
  }

  test('Orgs · GoJS: right-click opens context menu', async ({ page }) => {
    await openMockupTab(page, 'Orgs · GoJS');
    const hq = page.getByTestId('node-mockup-hq');
    await expect(hq).toBeVisible({ timeout: 15_000 });
    await hq.click({ button: 'right' });
    await expect(page.getByTestId('org-context-menu')).toBeVisible();
    await expect(page.locator('#status')).toContainText('context · organization');
  });

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

  test('Staff · Figma: edge inventory matches fixture', async ({ page }) => {
    await openMockupTab(page, 'Staff · Figma');
    const edges = await page.evaluate(async () => {
      const bridge = (window as unknown as { __demoE2e?: DemoE2eBridge }).__demoE2e;
      return bridge?.getStaffLayoutEdges() ?? [];
    });
    const sorted = edges
      .map((e) => ({ kind: e.kind, fromId: e.fromId, toId: e.toId }))
      .sort((a, b) =>
        `${a.kind}:${a.fromId}:${a.toId}`.localeCompare(`${b.kind}:${b.fromId}:${b.toId}`),
      );
    expect(sorted).toEqual([
      { kind: 'admin', fromId: 'pos-1z', toId: 'pos-sup' },
      { kind: 'admin', fromId: 'pos-head', toId: 'pos-1z' },
      { kind: 'admin', fromId: 'pos-head', toId: 'pos-2z' },
      { kind: 'admin', fromId: 'pos-head', toId: 'pos-ops' },
      { kind: 'admin', fromId: 'pos-sup', toId: 'pos-vac' },
      { kind: 'admin', fromId: 'pos-u-h', toId: 'pos-u-2' },
      { kind: 'admin', fromId: 'pos-u-h', toId: 'pos-u-sup' },
      { kind: 'cross-tier', fromId: 'pos-head', toId: 'unit-current' },
      { kind: 'dotted', fromId: 'pos-1z', toId: 'pos-u-h' },
    ]);
  });
});
