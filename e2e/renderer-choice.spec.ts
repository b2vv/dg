import { expect, test, type Page } from '@playwright/test';

/**
 * T83 — the engine the host asked for is the engine that draws.
 *
 * These assertions are deliberately environment-independent: headless Chromium
 * may or may not hand out a software WebGL context depending on the machine (the
 * same browser refused one on macOS and granted one in a Linux container), so a
 * test that hard-coded 'webgl' here would be testing the runner, not the SDK.
 * What is invariant: a pinned engine is honoured, and the engine the SDK reports
 * matches the context the canvas actually has.
 */

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`?e2e=1${query}`);
  // No explicit waitFor timeout: the per-test budget in playwright.config.ts is
  // 60s, so a larger number here would only ever be decoration.
  await page.getByTestId('diagram-ready').waitFor();
}

function bridge(page: Page) {
  return {
    kind: () =>
      page.evaluate(() => {
        const b = (window as unknown as { __demoE2e?: { getRendererKind(): string | null } })
          .__demoE2e;
        if (!b) throw new Error('__demoE2e missing — load with ?e2e=1');
        return b.getRendererKind();
      }),
    diagnostics: () =>
      page.evaluate(() => {
        const b = (window as unknown as { __demoE2e?: { getLayoutDiagnostics(): string[] } })
          .__demoE2e;
        if (!b) throw new Error('__demoE2e missing — load with ?e2e=1');
        return b.getLayoutDiagnostics();
      }),
  };
}

/** The diagram's own canvas — not the first one the page happens to contain. */
const sceneUsesWebgl = (page: Page) =>
  page.evaluate(() => !!document.querySelector('#diagram-mount canvas')?.getContext('webgl2'));

test.describe('renderer choice (T83)', () => {
  test('row 2: a host that pins canvas gets canvas, and no WebGL context exists', async ({
    page,
  }) => {
    await open(page, '&renderer=canvas');
    expect(await bridge(page).kind()).toBe('canvas');
    expect(await sceneUsesWebgl(page)).toBe(false);
    // Pinned or not, the diagram must actually be on screen.
    await expect(page.getByTestId('node-staff-head').or(page.locator('canvas'))).toBeVisible();
  });

  test('row 1: what the SDK reports is what the canvas actually has', async ({ page }) => {
    await open(page);
    const [kind, webgl] = await Promise.all([bridge(page).kind(), sceneUsesWebgl(page)]);
    expect(kind).toBe(webgl ? 'webgl' : 'canvas');
  });

  test('row 12: the engine line survives a second render of the same diagram', async ({
    page,
  }) => {
    await open(page, '&renderer=canvas');
    // Flat orgs is an org-tree scene, so "Collapse all" re-renders the diagram
    // that is already mounted. Switching tabs would not do: the demo disposes
    // and re-creates on tab change, which is a fresh mount and would prove
    // nothing about a line surviving DiagramRenderer replacing its own list.
    await page.getByRole('button', { name: 'Flat orgs', exact: true }).click();
    await page.getByTestId('diagram-ready').waitFor();

    const named = (lines: string[]) => lines.some((l) => l.startsWith('Renderer: canvas'));
    expect(named(await bridge(page).diagnostics())).toBe(true);

    await page.locator('#collapse-all').click();
    await page.waitForTimeout(500);
    expect(named(await bridge(page).diagnostics())).toBe(true);
  });

  test('row 9: an unknown engine name falls back to auto and says so', async ({ page }) => {
    await open(page, '&renderer=vulkan');
    const lines = await bridge(page).diagnostics();
    expect(lines.some((l) => l.includes('vulkan') && l.includes('auto'))).toBe(true);
    // Falling back is not the same as breaking: the diagram is still drawn.
    expect(await bridge(page).kind()).not.toBeNull();
  });

  test('row 8: zoomed out on canvas, hairlines are a recorded fact', async ({ page }) => {
    test.setTimeout(180_000);
    await open(page, '&renderer=canvas');
    await page.getByRole('button', { name: 'Staff · 1M', exact: true }).click();
    await page.getByTestId('diagram-ready').waitFor();
    await page.locator('[data-zoom="fit"]').click();
    await page.waitForTimeout(600);

    const mount = page.locator('#diagram-mount');
    const box = await mount.boundingBox();
    expect(box).toBeTruthy();
    // Canvas2D draws sub-pixel strokes as one solid pixel where WebGL fades them,
    // so at this zoom the two engines genuinely differ. This baseline exists to
    // make that difference a recorded fact instead of a surprise in the field.
    await expect(page).toHaveScreenshot('staff-1m-canvas-zoomed-out.png', {
      maxDiffPixelRatio: 0.04,
      animations: 'disabled',
      clip: { x: Math.round(box!.x), y: Math.round(box!.y), width: 1200, height: 700 },
    });
  });

  test('row 7: the heaviest scene comes up on canvas', async ({ page }) => {
    // The 1M window genuinely needs more than the 60s default on a cold runner.
    test.setTimeout(180_000);
    await open(page, '&renderer=canvas');
    await page.getByRole('button', { name: 'Staff · 1M', exact: true }).click();
    await page.getByTestId('diagram-ready').waitFor({ timeout: 120_000 });
    expect(await bridge(page).kind()).toBe('canvas');
  });
});
