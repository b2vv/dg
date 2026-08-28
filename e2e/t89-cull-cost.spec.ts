import { test, expect, type Page } from '@playwright/test';

/**
 * T89 TEMPORARY — measurement, not a test.
 *
 * Culling can only pay for objects it removes from the frame. The sweep already
 * showed the 1M tab has 0% of its nodes off screen at the zoom it opens at, so
 * the question is what a frame costs as a function of how many nodes are drawn —
 * measured by zooming, which changes the visible count without changing anything
 * else about the scene.
 *
 * If frame cost barely moves between 639 drawn and 28 drawn, culling has nothing
 * to win and the task should be closed rather than implemented.
 */

test.use({
  launchOptions: process.env.REAL_GPU ? { args: ['--use-angle=metal'] } : {},
});

interface Sample {
  zoom: number;
  visible: number;
  p50: number;
  p95: number;
  over33: number;
}

async function open(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1920, height: 1080 });
  // No promote layer: with it on, the count came from getPromotedNodeIds and the
  // frame included the DOM cards — that measures the overlay's cost, not how many
  // nodes Pixi draws, which is the only thing culling could change.
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: 'Staff · 1M' }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(800);
}

/**
 * Repaint continuously for a fixed number of frames and time each one.
 *
 * A nudge to the camera each frame is what forces a real repaint — the renderer
 * paints on demand (T84), so a still scene costs nothing and would measure an
 * idle rAF loop instead of the draw.
 */
async function paintFrames(page: Page, zoom: number, frames: number): Promise<Sample> {
  return page.evaluate(
    async ({ zoom, frames }) => {
      const bridge = (
        window as unknown as {
          __demoE2e: {
            setZoom(z: number): void;
            setViewport(v: { x?: number; y?: number }): void;
          };
        }
      ).__demoE2e;
      bridge.setZoom(zoom);
      await new Promise((r) => setTimeout(r, 500));

      const times: number[] = [];
      let last = performance.now();
      let i = 0;
      await new Promise<void>((resolve) => {
        const tick = (): void => {
          const now = performance.now();
          times.push(now - last);
          last = now;
          i += 1;
          // One pixel of pan per frame: enough to force a repaint, too little to
          // change which nodes are on screen.
          bridge.setViewport({ x: (i % 2 === 0 ? 1 : -1) * 1 });
          if (i < frames) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });

      const s = times.slice(3).sort((a, b) => a - b);
      const at = (q: number): number => s[Math.min(s.length - 1, Math.floor(s.length * q))] ?? 0;
      const r = (n: number): number => Number(n.toFixed(2));
      return {
        zoom,
        visible: 0, // filled by the caller from the sweep's measured counts
        p50: r(at(0.5)),
        p95: r(at(0.95)),
        over33: s.filter((d) => d > 33.3).length,
      };
    },
    { zoom, frames },
  );
}

test('T89 — frame cost against how many nodes are drawn', async ({ page }) => {
  test.setTimeout(180_000);
  await open(page);

  const samples: Sample[] = [];
  // Descending, then one repeat of the first — the repeat catches warm-up, which
  // has distorted the first reading in every measurement on this project so far.
  // Visible counts measured in the sweep (report §2б). The two ends are what
  // matter: at 0.287 every node is on screen so culling can remove nothing, and
  // at 2.14 only 28 are on screen while 611 sit outside it.
  const counts: Record<string, number> = {
    '0.287': 639,
    '0.52': 361,
    '1.2': 78,
    '2.14': 28,
  };
  for (const zoom of [0.287, 0.52, 1.2, 2.14, 0.287]) {
    const sample = await paintFrames(page, zoom, 60);
    samples.push({ ...sample, visible: counts[String(zoom)] ?? -1 });
  }

  console.log('\n=== T89 frame cost vs drawn nodes ===\n' + JSON.stringify(samples, null, 2));
  expect(samples.length).toBe(5);
});
