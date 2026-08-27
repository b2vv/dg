import { defineConfig, devices } from '@playwright/test';

/**
 * Post-deploy smoke against a LIVE deployment — no webServer, nothing is built here.
 * Target defaults to GitHub Pages; override with PROD_URL to smoke any other environment.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /prod-smoke\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // The network is the flaky part here, not the app; one retry separates a blip from a regression.
  retries: 1,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 120_000,
  use: {
    // `||`, not `??`: the workflow sets PROD_URL from a dispatch input, and an
    // automatic run has no inputs — so the variable arrives defined and empty.
    // `??` accepted that empty string as a URL and every scheduled smoke died on
    // "Cannot navigate to invalid URL", looking like a broken deploy for weeks.
    baseURL: process.env.PROD_URL || 'https://b2vv.github.io/dg/',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
});
