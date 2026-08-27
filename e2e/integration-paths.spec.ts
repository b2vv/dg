import { expect, test, type Page } from '@playwright/test';

/**
 * The paths a host integration actually uses — export, drag & drop, the mapper
 * entry and the promote overlay — none of which had e2e cover. Everything here
 * drives the demo the way a user does, not through the SDK API.
 */

/**
 * The `?e2e=1` anchor overlay sits **above** the canvas and swallows pointer
 * events, so a mouse drag would land on a div instead of the Pixi card — and
 * pass while proving nothing. Anchors stay visible (we read positions from
 * them); they just stop catching the mouse.
 */
async function letPointerReachCanvas(page: Page): Promise<void> {
  await page.addStyleTag({
    content: '[data-org-hierarchy-test-anchors], [data-org-hierarchy-test-anchors] * { pointer-events: none !important; }',
  });
}

async function openTab(page: Page, tab: string): Promise<void> {
  await page.getByRole('button', { name: tab, exact: true }).click();
  await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(400);
}

test.describe('host integration paths', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?e2e=1');
    await expect(page.locator('[data-testid="diagram-ready"]')).toBeVisible({ timeout: 60_000 });
  });

  test('export: SVG and PNG download real files from the live scene', async ({ page }) => {
    await openTab(page, 'Staff · Figma');

    const svgDownload = page.waitForEvent('download');
    await page.locator('#export-svg').click();
    const svg = await svgDownload;
    expect(svg.suggestedFilename()).toBe('org-diagram.svg');
    const svgPath = await svg.path();
    const svgText = await (await import('node:fs/promises')).readFile(svgPath!, 'utf8');
    // Not just «a file appeared»: it must be an SVG that carries the scene.
    expect(svgText.startsWith('<?xml')).toBe(true);
    expect(svgText).toContain('<svg xmlns=');
    expect(svgText.length).toBeGreaterThan(2_000);
    expect(svgText).toContain('</svg>');

    const pngDownload = page.waitForEvent('download');
    await page.locator('#export-png').click();
    const png = await pngDownload;
    expect(png.suggestedFilename()).toBe('org-diagram.png');
    const pngPath = await png.path();
    const bytes = await (await import('node:fs/promises')).readFile(pngPath!);
    expect(bytes.length).toBeGreaterThan(1_000);
    // PNG magic — a renamed blob would pass a size check but not this.
    expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);

    await expect(page.locator('#status')).toContainText('export');
  });

  test('export: the Flood tab exports contours, not a silent button-group copy', async ({ page }) => {
    await openTab(page, 'Staff · Flood');

    const download = page.waitForEvent('download');
    await page.locator('#export-svg').click();
    const file = await download;
    const svgText = await (await import('node:fs/promises')).readFile((await file.path())!, 'utf8');

    // Контури в файлі є — тобто рушій сцени доїхав до експорту, а не був підмінений.
    const deptPaths = [...svgText.matchAll(/data-dept="/g)].length;
    expect(deptPaths).toBeGreaterThan(0);
    await expect(page.locator('#status')).toContainText('export');
  });

  test('drag & drop: a seat card lands on the next cell and stays there', async ({ page }) => {
    await openTab(page, 'Variant B');
    await letPointerReachCanvas(page);

    const anchor = page.locator('[data-testid="node-ceo"]');
    await expect(anchor).toBeVisible();
    const before = (await anchor.boundingBox())!;

    // Drag one cell to the right; the drop snaps to the layout pitch.
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 140, before.y + before.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
    await page.waitForTimeout(600);

    const after = (await anchor.boundingBox())!;
    expect(after.x).toBeGreaterThan(before.x + 40);
    // The row must not drift while the column changes.
    expect(Math.abs(after.y - before.y)).toBeLessThan(12);
  });

  test('drag & drop: a click without movement leaves the card where it was', async ({ page }) => {
    await openTab(page, 'Variant B');
    await letPointerReachCanvas(page);

    const anchor = page.locator('[data-testid="node-ceo"]');
    const before = (await anchor.boundingBox())!;
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(400);

    const after = (await anchor.boundingBox())!;
    expect(Math.abs(after.x - before.x)).toBeLessThan(2);
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  });

  test('mapper: flat rows become a rendered diagram', async ({ page }) => {
    await openTab(page, 'Mapper');
    await expect(page.locator('#status')).toContainText(/Mapper|mapper/);

    // Rows → DiagramData → anchors: the mapper path is only proven by nodes on screen.
    const anchors = page.locator('[data-testid^="node-"]');
    await expect.poll(() => anchors.count(), { timeout: 30_000 }).toBeGreaterThan(0);
    await expect(page.locator('[data-node-kind="person"]').first()).toBeVisible();

    await page.locator('#load-sample-json').click();
    await expect(page.locator('#status')).not.toContainText('Error', { timeout: 30_000 });
    await expect.poll(() => anchors.count(), { timeout: 30_000 }).toBeGreaterThan(0);
  });

  test('promote: selecting a node puts an HTML card over the canvas', async ({ page }) => {
    await openTab(page, 'Staff · Figma');
    const promoteRoot = page.locator('[data-org-hierarchy-promote-root]');
    await expect(promoteRoot).toHaveCount(1);

    await page.locator('[data-testid="node-staff-head"]').click();
    await page.waitForTimeout(500);

    // The overlay is HTML above Pixi — that is exactly why it never reaches export.
    await expect.poll(() => promoteRoot.evaluate((el) => el.childElementCount), {
      timeout: 15_000,
    }).toBeGreaterThan(0);
    await expect(promoteRoot).toContainText(/\w/);
  });
});
