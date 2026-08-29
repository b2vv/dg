import { expect, test } from '@playwright/test';

/**
 * Mandatory node interaction contract — work/tasks/NODE-interactions-contract.md
 * E2E smoke: context menu opens via test anchors (same path as Pixi right-click host wiring).
 */

interface ContextMenuCase {
  tab: string;
  anchor: string;
  kind: 'organization' | 'person' | 'position';
  /** Extra preparation some tabs need before the anchor exists. */
  setup?: string;
}

const CONTEXT_MENU_CASES: readonly ContextMenuCase[] = [
  { tab: 'Orgs · Figma', anchor: 'mockup-root', kind: 'organization' },
  { tab: 'Orgs · GoJS', anchor: 'mockup-hq', kind: 'organization' },
  { tab: 'Staff · Figma', anchor: 'staff-head', kind: 'person' },
  { tab: 'Staff · GoJS', anchor: 'staff-head', kind: 'person' },
  { tab: 'Staff · Figma', anchor: 'staff-vacant', kind: 'position' },
  { tab: 'Variant B', anchor: 'ceo', kind: 'person', setup: 'variant-b' },
  { tab: 'Flat orgs', anchor: 'root', kind: 'organization', setup: 'flat-orgs' },
];

async function openTab(
  page: import('@playwright/test').Page,
  tab: string,
  setup?: string,
): Promise<void> {
  if (setup === 'variant-b') {
    await page.getByRole('button', { name: 'Variant B', exact: true }).click();
  } else if (setup === 'flat-orgs') {
    await page.getByRole('button', { name: 'Flat orgs', exact: true }).click();
  } else {
    await page.getByRole('button', { name: tab, exact: true }).click();
  }
  await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(400);
}

test.describe('NODE interactions contract (e2e)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?e2e=1');
    await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });
  });

  for (const spec of CONTEXT_MENU_CASES) {
    test(`CTX: ${spec.tab} · ${spec.anchor} right-click opens menu`, async ({ page }) => {
      await openTab(page, spec.tab, spec.setup);
      const anchor = page.getByTestId(`node-${spec.anchor}`);
      await expect(anchor).toBeVisible({ timeout: 15_000 });
      await anchor.click({ button: 'right' });
      await expect(page.getByTestId('org-context-menu')).toBeVisible();
      await expect(page.locator('#status')).toContainText(`context · ${spec.kind}`);
    });
  }

  test('CTX-5: right-click does not change selection status to click handler', async ({ page }) => {
    await openTab(page, 'Orgs · GoJS');
    const hq = page.getByTestId('node-mockup-hq');
    await expect(hq).toBeVisible();
    await hq.click({ button: 'right' });
    await expect(page.getByTestId('org-context-menu')).toBeVisible();
    const statusAfterMenu = await page.locator('#status').textContent();
    expect(statusAfterMenu).toContain('context · organization');
    expect(statusAfterMenu).not.toMatch(/selected · 1/i);
  });
});
