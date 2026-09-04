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
 *
 * Two of the rows have a second branch that only exists where the browser refuses
 * a software WebGL context. Run them there with:
 *
 *   SOFTWARE_GL=1 npx playwright test e2e/renderer-choice.spec.ts
 */

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`?e2e=1${query}`);
  // No explicit waitFor timeout: the per-test budget in playwright.config.ts is
  // 60s, so a larger number here would only ever be decoration.
  await page.getByTestId('diagram-ready').waitFor();
}

function bridge(page: Page) {
  return {
    probe: (renderer?: string) =>
      page.evaluate((r) => {
        const b = (
          window as unknown as {
            __demoE2e?: {
              probeSecondDiagram(x?: string): Promise<{ kind: string | null; error: string | null }>;
            };
          }
        ).__demoE2e;
        if (!b) throw new Error('__demoE2e missing — load with ?e2e=1');
        return b.probeSecondDiagram(r);
      }, renderer),
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
  page.evaluate(
    () =>
      !!document
        .querySelector<HTMLCanvasElement>('#diagram-mount canvas')
        ?.getContext('webgl2'),
  );

/**
 * What the browser itself says, asked without touching our code or Pixi's cache:
 * does it grant a WebGL context it would not have to emulate? This is the
 * independent source of truth the engine assertions are measured against — using
 * `getRendererKind()` for both sides would only prove the SDK agrees with itself.
 */
const browserGrantsRealWebgl = (page: Page) =>
  page.evaluate(
    () =>
      !!document
        .createElement('canvas')
        .getContext('webgl2', { failIfMajorPerformanceCaveat: true }),
  );

/**
 * Asked the same way the SDK asks, but by hand: is the driver behind WebGL a
 * software rasteriser? Since T98 this — not the caveat hint above — is what
 * decides `'auto'`, because the hint is inconsistent (the same Chromium refused
 * a software context on macOS and granted one in a GPU-less container).
 *
 * Deliberately re-derived here from the raw string rather than imported from
 * `detectSoftwareRenderer.ts`: importing the answer would only prove the SDK
 * agrees with itself.
 */
const browserDrawsInSoftware = (page: Page) =>
  page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    if (!gl || !info) return false;
    const name = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? '').toLowerCase();
    return [
      'swiftshader',
      'llvmpipe',
      'softpipe',
      'microsoft basic render',
      'software adapter',
      'software rasterizer',
      'apple software renderer',
    ].some((marker) => name.includes(marker));
  });

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

  test('row 5: two diagrams, and each gets the engine its own config asked for', async ({
    page,
  }) => {
    await open(page);
    const pinned = await bridge(page).probe('canvas');
    expect(pinned).toEqual({ kind: 'canvas', error: null });

    // The auto neighbour must land on its own verdict, not wherever the pinned
    // one went. Since T98 that verdict comes from the renderer's *name*: a known
    // software rasteriser means canvas, and only an unrecognised one falls back
    // to what the browser is willing to grant.
    const auto = await bridge(page).probe(undefined);
    const expected = (await browserDrawsInSoftware(page))
      ? 'canvas'
      : (await browserGrantsRealWebgl(page))
        ? 'webgl'
        : 'canvas';
    expect(auto.kind).toBe(expected);

    // …and the pinned one is unmoved by the neighbour that came after it.
    expect(await bridge(page).probe('canvas')).toEqual({ kind: 'canvas', error: null });
  });

  test('row 6: a pinned webgl never silently appears where webgl was refused', async ({
    page,
  }) => {
    await open(page);
    const auto = await bridge(page).probe(undefined);
    const pinnedWebgl = await bridge(page).probe('webgl');

    // ⚠️ The condition is *can this page get a WebGL context at all*, and since
    // T98 that is no longer the same question as "what did auto choose".
    // Auto now steps aside on a software rasteriser the browser is perfectly
    // willing to hand out — and by asking Pixi for canvas outright it stops
    // seeding Pixi's page-wide WebGL verdict, so the later pin gets a fresh
    // answer instead of an inherited refusal.
    const webglObtainable = await page.evaluate(
      () => !!document.createElement('canvas').getContext('webgl2'),
    );

    if (!webglObtainable) {
      // Nothing can produce WebGL here. What a pin must never do is report
      // 'webgl' anyway — it has to fail out loud.
      expect(pinnedWebgl.kind).not.toBe('webgl');
      expect(pinnedWebgl.error).toContain("renderer 'webgl'");
    } else {
      // A pin is a pin: `'webgl'` accepts a software context on purpose
      // (docs/USAGE.md § renderer), even where auto declined it.
      expect(pinnedWebgl.kind).toBe('webgl');
      expect(pinnedWebgl.error).toBeNull();
      if (await browserDrawsInSoftware(page)) {
        // The case this row exists for after T98: the two disagree, and both
        // are right — auto protected the frame rate, the pin was honoured.
        expect(auto.kind).toBe('canvas');
      }
    }
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
    // Height 480, not "as much as fits": the clip is truncated to whatever the
    // page has left below the mount, and that differs by a few pixels between
    // the Playwright docker image and a plain CI runner (different fonts wrap
    // the toolbar differently). A clip that fits in both is the same picture in
    // both; one that asks for more is a different size and fails on size alone.
    //
    // The clip starts below the scene caption, which overlays the top-left of
    // the canvas and spells out how many seats the window holds. That number is
    // viewport-derived, so it moved twice in one afternoon while the hairlines
    // it sits next to did not — and each move cost a re-record of a baseline
    // that is not about captions.
    //
    // ⚠️ This does NOT make the baseline immune to layout work, and pretending
    // otherwise would be worse than leaving it alone: the wall itself is drawn
    // from the same arithmetic, so widening the gaps between seats or changing
    // how the window is sized legitimately changes this picture. When that
    // happens the baseline is re-recorded, not argued with. Only linux
    // baselines are committed, so the source is the `playwright-actual`
    // artifact from the CI run that failed — check the three attempts are
    // byte-identical before trusting it.
    // The height comes down by the same 100, not kept at 480: the clip was
    // already sized to end where the page does, so sliding it down and keeping
    // its height pulled the help bar into the frame — the very strip whose font
    // wrapping the paragraph above says to stay out of.
    const CAPTION_BAND = 100;
    await expect(page).toHaveScreenshot('staff-1m-canvas-zoomed-out.png', {
      maxDiffPixelRatio: 0.04,
      animations: 'disabled',
      clip: {
        x: Math.round(box!.x),
        y: Math.round(box!.y) + CAPTION_BAND,
        width: 1200,
        height: 480 - CAPTION_BAND,
      },
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
