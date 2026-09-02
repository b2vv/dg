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

  /** Vertices in every `data-dept` ring of an exported SVG, ascending. */
  async function deptRingVertices(page: Page, tab: string): Promise<number[]> {
    await openTab(page, tab);
    const download = page.waitForEvent('download');
    await page.locator('#export-svg').click();
    const file = await download;
    const svgText = await (await import('node:fs/promises')).readFile((await file.path())!, 'utf8');
    await expect(page.locator('#status')).toContainText('export');
    return [...svgText.matchAll(/<path d="([^"]+)"[^>]*data-dept=/g)]
      .map((m) => (m[1]!.match(/[ML]/g) ?? []).length)
      .sort((a, b) => a - b);
  }

  test('export: the Flood tab exports flood geometry, not a silent button-group copy', async ({
    page,
  }) => {
    // The previous version of this test asserted that `data-dept` paths exist.
    // They always do: that attribute is written by the shared stroke layer for
    // **either** engine (`svgExport.ts:340,412,460`), so the assertion could not
    // fail for the reason its name gave — while guarding the exact regression
    // that has already shipped twice (T80, T3/H1).
    //
    // What actually separates the two is the shape language. Measured, not
    // assumed: button-group rings carry rounded corners and come out at 20-26
    // vertices; cell-flood traces the polyomino orthogonally and comes out at
    // 4-8. A rounded rectangle cannot be four points.
    const flood = await deptRingVertices(page, 'Staff · Flood');
    expect(flood.length).toBeGreaterThan(0);
    expect(flood[0]).toBeLessThanOrEqual(8);

    // The other half of the guard: if button-group ever starts emitting rings
    // this simple, the discriminator above is dead and this line says so rather
    // than letting the Flood test pass for the wrong reason.
    const buttonGroup = await deptRingVertices(page, 'Staff · Magnetic');
    expect(buttonGroup.length).toBeGreaterThan(0);
    expect(buttonGroup[0]).toBeGreaterThanOrEqual(12);
  });

  test('export: PDF is a real PDF, not a renamed image', async ({ page }) => {
    // The only export with no through-test until now, and the one most likely to
    // be subtly wrong: there is no jspdf here — `pdfExport.ts` writes the object
    // table, the xref and the trailer by hand.
    await openTab(page, 'Staff · Figma');

    const download = page.waitForEvent('download');
    await page.locator('#export-pdf').click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('org-diagram.pdf');
    const bytes = await (await import('node:fs/promises')).readFile((await file.path())!);

    expect(bytes.length).toBeGreaterThan(1_000);
    // Header, and a trailer that actually terminates the file — a truncated
    // write passes a size check and opens in nothing.
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(bytes.subarray(-32).toString('latin1')).toContain('%%EOF');
    // The xref offset the trailer promises must land inside the file.
    const tail = bytes.subarray(-256).toString('latin1');
    const startxref = Number(/startxref\s+(\d+)/.exec(tail)?.[1]);
    expect(Number.isFinite(startxref)).toBe(true);
    expect(startxref).toBeLessThan(bytes.length);
    expect(bytes.subarray(startxref, startxref + 4).toString('latin1')).toBe('xref');

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
