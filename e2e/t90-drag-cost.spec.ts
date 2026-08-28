import { test, expect, type Page } from '@playwright/test';

/**
 * T90 TEMPORARY — measurement, not a test.
 *
 * The claim under test: dragging a seat card is not smooth because crossing a
 * grid cell boundary triggers ContourPainter.refresh(true), which synchronously
 * rebuilds the paint rings for every department.
 *
 * Two drags are compared over the same number of frames: one that stays inside a
 * single cell (no preview rebuild) and one that crosses cells repeatedly. If the
 * hypothesis is right the second is markedly worse; if the two match, the cause
 * is elsewhere and the task needs rewriting rather than fixing.
 */

// Headless Chromium draws WebGL through SwiftShader by default, so an absolute
// frame time here describes software rendering. REAL_GPU=1 asks ANGLE for the
// actual device — the only way to tell the environment's cost from the app's
// (learned in T87.10, where the same scene was 11 ms on hardware and 107 ms on
// software).
test.use({
  launchOptions: process.env.REAL_GPU ? { args: ['--use-angle=metal'] } : {},
});

interface FrameStats {
  frames: number;
  p50: number;
  p95: number;
  max: number;
  over33: number;
}

async function startRecording(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __recording: boolean };
    w.__frames = [];
    w.__recording = true;
    let last = performance.now();
    const tick = (): void => {
      const now = performance.now();
      w.__frames.push(now - last);
      last = now;
      if (w.__recording) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopRecording(page: Page): Promise<FrameStats> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __recording: boolean };
    w.__recording = false;
    const s = w.__frames.slice(3).sort((a, b) => a - b);
    const at = (q: number): number => s[Math.min(s.length - 1, Math.floor(s.length * q))] ?? 0;
    const r = (n: number): number => Number(n.toFixed(2));
    return {
      frames: s.length,
      p50: r(at(0.5)),
      p95: r(at(0.95)),
      max: r(s[s.length - 1] ?? 0),
      over33: s.filter((d) => d > 33.3).length,
    };
  });
}

/**
 * Drag inside the page, one move per animation frame — a CDP round trip per
 * move would measure Playwright rather than the app (learned in T87.10).
 *
 * `amplitude` is how far each step travels: small enough and the pointer never
 * leaves its starting cell, large enough and it crosses one on nearly every
 * frame.
 */
async function dragGesture(
  page: Page,
  origin: { x: number; y: number },
  amplitude: number,
  steps: number,
): Promise<void> {
  await page.evaluate(
    async ({ origin, amplitude, steps }) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('no canvas');
      const opts = (x: number, y: number): PointerEventInit => ({
        pointerId: 1,
        pointerType: 'mouse',
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(new PointerEvent('pointerdown', opts(origin.x, origin.y)));
      await new Promise<void>((resolve) => {
        let i = 0;
        const step = (): void => {
          i += 1;
          // Back and forth, so a long drag never leaves the scene.
          const offset = Math.sin(i * 0.5) * amplitude;
          canvas.dispatchEvent(new PointerEvent('pointermove', opts(origin.x + offset, origin.y)));
          if (i < steps) {
            requestAnimationFrame(step);
          } else {
            canvas.dispatchEvent(new PointerEvent('pointerup', opts(origin.x + offset, origin.y)));
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    },
    { origin, amplitude, steps },
  );
}

async function open(page: Page, tab: string): Promise<void> {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: tab }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(600);
}

test('T90 — drag frame cost, inside one cell vs crossing cells', async ({ page }) => {
  test.setTimeout(180_000);

  const measure = async (
    amplitude: number,
    tab = 'Variant B',
    testId = 'node-ceo',
  ): Promise<FrameStats> => {
    await open(page, tab);
    const anchor = page.locator(`[data-testid="${testId}"]`);
    await expect(anchor).toBeVisible();
    const box = (await anchor.boundingBox())!;
    const origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await startRecording(page);
    await dragGesture(page, origin, amplitude, 60);
    return stopRecording(page);
  };

  // Measured in both orders — the first reading here has been warm-up before.
  const insideFirst = await measure(6);
  const crossingSecond = await measure(160);
  const crossingFirst = await measure(160);
  const insideSecond = await measure(6);

  // The complaint was about dragging in general; Variant B is a small scene, so
  // the heavy one has to be measured too before concluding anything.
  const heavyInside = await measure(6, 'Staff · 1M', 'node-scale-focus-seat');
  const heavyCrossing = await measure(160, 'Staff · 1M', 'node-scale-focus-seat');

  console.log(
    '\n=== T90 drag · Staff 1M ===\n' +
      JSON.stringify({ insideOneCell: heavyInside, crossingCells: heavyCrossing }, null, 2),
  );

  console.log(
    '\n=== T90 drag ===\n' +
      JSON.stringify(
        {
          order1: { insideOneCell: insideFirst, crossingCells: crossingSecond },
          order2: { crossingCells: crossingFirst, insideOneCell: insideSecond },
        },
        null,
        2,
      ),
  );

  expect(insideFirst.frames).toBeGreaterThan(10);
});
