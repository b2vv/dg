import { test, expect, type Page } from '@playwright/test';

/**
 * T87.10 TEMPORARY — measurement, not a test. Acceptance row 9.
 *
 * Measures a real drag gesture on the canvas (not a scripted setViewport loop),
 * with the promote layer on and off. The difference is the number that matters:
 * on its own, "panning costs N ms" says nothing about what this feature costs.
 */

// Headless Chromium draws WebGL through SwiftShader by default, so an absolute
// frame time from a plain run describes software rendering. REAL_GPU=1 asks
// ANGLE for the actual device, which is the only way to tell the environment's
// cost apart from the application's.
test.use({
  launchOptions: process.env.REAL_GPU ? { args: ['--use-angle=metal'] } : {},
});

interface FrameStats {
  frames: number;
  p50: number;
  p95: number;
  max: number;
  fps50: number;
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
    // The first frames include the gesture's own start-up; drop them so the
    // number describes steady panning rather than the click that began it.
    const s = w.__frames.slice(3).sort((a, b) => a - b);
    const at = (q: number): number => s[Math.min(s.length - 1, Math.floor(s.length * q))] ?? 0;
    const round = (n: number): number => Number(n.toFixed(2));
    return {
      frames: s.length,
      p50: round(at(0.5)),
      p95: round(at(0.95)),
      max: round(s[s.length - 1] ?? 0),
      fps50: round(1000 / (at(0.5) || 1)),
      over33: s.filter((d) => d > 33.3).length,
    };
  });
}

/**
 * The gesture runs **inside the page**, one move per animation frame.
 *
 * Driving it with `page.mouse.move` measured Playwright instead of the app: each
 * call is a CDP round trip, and the first run produced exactly 60 frames over
 * 33 ms for exactly 60 move calls — with the promote layer *off* as well as on.
 * A real gesture delivers at most one coalesced move per frame, which is what
 * this reproduces.
 */
async function panGesture(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('no canvas');
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
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
    canvas.dispatchEvent(new PointerEvent('pointerdown', opts(cx, cy)));
    await new Promise<void>((resolve) => {
      let i = 0;
      const step = (): void => {
        i += 1;
        const x = cx - i * 6;
        const y = cy - i * 2;
        canvas.dispatchEvent(new PointerEvent('pointermove', opts(x, y)));
        if (i < 60) {
          requestAnimationFrame(step);
        } else {
          canvas.dispatchEvent(new PointerEvent('pointerup', opts(x, y)));
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  });
}

async function open(page: Page, promote: boolean): Promise<void> {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/?e2e=1${promote ? '&promote=near-visible' : ''}`);
  await page.getByRole('button', { name: 'Staff · 1M' }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
  await page.evaluate(() => {
    const b = (window as unknown as { __demoE2e: { setZoom(v: number): void } }).__demoE2e;
    b.setZoom(1.37);
  });
  await page.waitForTimeout(800);
}

test('K6 — frame cost of panning with and without the promote layer', async ({ page }) => {
  test.setTimeout(180_000);

  // Measured in both orders. The first reading of anything in this codebase has
  // been warm-up more than once (T87.0), and here the cold run is also the one
  // that decides whether the feature looks free or expensive.
  const measure = async (promote: boolean): Promise<FrameStats> => {
    await open(page, promote);
    await startRecording(page);
    await panGesture(page);
    return stopRecording(page);
  };

  const withoutFirst = await measure(false);
  const withSecond = await measure(true);
  const withFirst = await measure(true);
  const withoutSecond = await measure(false);

  console.log(
    '\n=== K6 pan ===\n' +
      JSON.stringify(
        {
          order1: { without: withoutFirst, with: withSecond },
          order2: { with: withFirst, without: withoutSecond },
        },
        null,
        2,
      ),
  );

  // Crossing the threshold, measured both ways. Crossing it also makes Pixi
  // re-render the scene at a new LOD, so without the second reading there is no
  // telling whose spike it is.
  const crossThreshold = async (promote: boolean): Promise<FrameStats> => {
    await open(page, promote);
    await startRecording(page);
    for (let i = 0; i < 6; i += 1) {
      await page.evaluate(
        (z) => {
          const b = (window as unknown as { __demoE2e: { setZoom(v: number): void } }).__demoE2e;
          b.setZoom(z);
        },
        i % 2 === 0 ? 0.9 : 1.37,
      );
      await page.waitForTimeout(250);
    }
    return stopRecording(page);
  };

  const crossWithout = await crossThreshold(false);
  const crossWith = await crossThreshold(true);

  // Same wait as `promote-near` row 5, for the same reason: since T88 a zoom on
  // Staff · 1M triggers a window rebuild, and the renderer clears the scene
  // while it runs. Counting once, right after the gesture, counts the wipe.
  const promoteCards = page.locator('[data-org-hierarchy-promote-root] [data-promote-card]');
  await expect.poll(() => promoteCards.count(), { timeout: 60_000 }).toBeGreaterThan(1);
  const cards = await promoteCards.count();
  const renderer = await page.evaluate(() => {
    const b = (window as unknown as { __demoE2e: { getRendererKind(): string | null } }).__demoE2e;
    return b.getRendererKind();
  });

  console.log(
    '\n=== K6 threshold crossing ===\n' +
      JSON.stringify({ renderer, cards, without: crossWithout, with: crossWith }, null, 2),
  );

  expect(cards).toBeGreaterThan(1);
});
