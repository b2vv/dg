import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Prod-smoke ходить у живий деплой і має власний конфіг (`test:prod`).
  // Без цього рядка він біг і тут — проти локального preview, тобто перевіряв
  // не те, заради чого писався, і дублював локальну сюїту.
  //
  // Стенди — не тести: `node-compare` перевіряє, що файл записався, а
  // `t88-window-cost` міряє мілісекунди й нічого не стверджує про поведінку.
  // Обидва мають власні скрипти, обидва довгі, і `node-compare` ще й переписував
  // закомічені PNG на кожному повному прогоні, лишаючи брудне дерево.
  //
  // Прапорцем, а не безумовно: `testIgnore` сильніший за шлях у командному
  // рядку, тож без цієї гілки скрипти стендів знаходили б нуль тестів.
  // Prod-smoke обходиться без прапорця лише тому, що має окремий конфіг.
  testIgnore: process.env.HARNESS
    ? ['**/prod-smoke.spec.ts']
    : ['**/prod-smoke.spec.ts', '**/node-compare.spec.ts', '**/t88-window-cost.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
    // SOFTWARE_GL=1 runs the whole suite on an emulated GPU — the state a
    // thin/zero client is in. Only there does the browser refuse a WebGL context
    // it would have to emulate, which is the one condition under which T83's
    // acceptance row 6 (a pinned 'webgl' must fail rather than appear silently)
    // has anything to observe. Off by default: it is slower and it is not the
    // environment CI represents.
    launchOptions: process.env.SOFTWARE_GL
      ? { args: ['--use-gl=swiftshader', '--disable-gpu'] }
      : {},
  },
  webServer: {
    command: 'npm run build:demo && npm run preview -w @org-hierarchy/demo -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
