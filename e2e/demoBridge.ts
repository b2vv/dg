import type { Page } from '@playwright/test';

/** Playwright wrappers — bridge methods must run inside the browser (functions don't cross evaluate). */

export async function expandOrg(page: Page, orgId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const bridge = (window as unknown as { __demoE2e?: { expandOrg?(org: string): Promise<void> } })
      .__demoE2e;
    if (!bridge?.expandOrg) throw new Error('__demoE2e.expandOrg missing — load page with ?e2e=1');
    await bridge.expandOrg(id);
  }, orgId);
}

export async function clickOrg(page: Page, orgId: string): Promise<void> {
  await page.evaluate((id) => {
    const bridge = (window as unknown as { __demoE2e?: { clickOrg?(org: string): void } }).__demoE2e;
    if (!bridge?.clickOrg) throw new Error('__demoE2e.clickOrg missing — load page with ?e2e=1');
    bridge.clickOrg(id);
  }, orgId);
}

export async function getScaleWindowStart(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const bridge = (window as unknown as { __demoE2e?: { getScaleWindowStart?(): number | null } })
      .__demoE2e;
    if (!bridge?.getScaleWindowStart) throw new Error('__demoE2e.getScaleWindowStart missing');
    return bridge.getScaleWindowStart();
  });
}

export async function openFlatOrgs(page: Page): Promise<void> {
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: 'Flat orgs' }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 30_000 });
}

export async function open100kOrgs(page: Page): Promise<void> {
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: '100k orgs' }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
}
