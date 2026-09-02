import { test, type Page } from '@playwright/test';

/**
 * T92 — is Canvas2D cheaper than *software* WebGL for the same pan?
 *
 * The task's own gate («число з цільового заліза») cannot be met here: SwiftShader
 * in headless Chromium is not the customer's zero client, and the task says so.
 * What *can* be settled here is the one question whose answer does not depend on
 * which software stack it is — whether the lever T83 already built (`renderer:
 * 'canvas'`) is worth pulling when there is no GPU.
 *
 * Both arms run without `--use-angle`, so the WebGL arm is SwiftShader. Frames
 * are recorded the same way as `t87-motion` so the numbers are comparable to the
 * baseline recorded there.
 *
 * Measurement, not a test: it asserts nothing and is gated behind HARNESS=1.
 */

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

/** The same in-page gesture as `t87-motion`: one coalesced move per frame. */
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
        canvas.dispatchEvent(new PointerEvent('pointermove', opts(cx - i * 6, cy - i * 2)));
        if (i < 60) requestAnimationFrame(step);
        else {
          canvas.dispatchEvent(new PointerEvent('pointerup', opts(cx - i * 6, cy - i * 2)));
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  });
}

async function open(page: Page, renderer: 'webgl' | 'canvas' | 'auto'): Promise<string> {
  await page.setViewportSize({ width: 1920, height: 1080 });
  // `auto` means «pass nothing», which is what a host that never read the docs
  // gets — and therefore the only arm that describes the product's behaviour.
  await page.goto(renderer === 'auto' ? '/?e2e=1' : `/?e2e=1&renderer=${renderer}`);
  await page.getByRole('button', { name: 'Staff · 1M' }).click();
  await page.getByTestId('diagram-ready').waitFor({ timeout: 60_000 });
  await page.evaluate(() => {
    const b = (window as unknown as { __demoE2e: { setZoom(v: number): void } }).__demoE2e;
    b.setZoom(1.37);
  });
  await page.waitForTimeout(800);
  // What the page actually got — asking for canvas is not the same as having it.
  return page.evaluate(
    () =>
      (window as unknown as { __demoE2e: { getRendererKind(): string | null } }).__demoE2e.getRendererKind() ??
      'unknown',
  );
}

test('T92 — pan cost: software WebGL vs Canvas2D on the same scene', async ({ page }) => {
  test.setTimeout(240_000);

  const measure = async (renderer: 'webgl' | 'canvas' | 'auto') => {
    const kind = await open(page, renderer);
    await startRecording(page);
    await panGesture(page);
    const stats = await stopRecording(page);
    return { asked: renderer, got: kind, ...stats };
  };

  // Both orders: the first reading in this codebase has been warm-up more than
  // once, and here the cold arm is the one that decides the recommendation.
  const glFirst = await measure('webgl');
  const canvasSecond = await measure('canvas');
  // The arm that matters most: what a host gets without asking for anything.
  // `auto` sets `failIfMajorPerformanceCaveat`, which is best-effort — the same
  // Chromium has both refused and granted a software context (see
  // `resolveRendererPreference`). `got` records which one happened here.
  const autoFirst = await measure('auto');
  const canvasFirst = await measure('canvas');
  const glSecond = await measure('webgl');
  const autoSecond = await measure('auto');

  // eslint-disable-next-line no-console
  console.log(
    '\n=== T92 pan ===\n' +
      JSON.stringify(
        {
          order1: { webgl: glFirst, canvas: canvasSecond, auto: autoFirst },
          order2: { canvas: canvasFirst, webgl: glSecond, auto: autoSecond },
        },
        null,
        2,
      ),
  );
});
