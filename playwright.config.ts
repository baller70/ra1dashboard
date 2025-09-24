import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://ra1dashboard.vercel.app';

// Allow overriding headless/video/trace via env to capture full artifacts on demand
// PW_HEADLESS=false to run headed; PW_VIDEO=on to always save video; PW_TRACE=on to always save trace
const HEADLESS = process.env.PW_HEADLESS ? process.env.PW_HEADLESS !== 'false' : true;
const VIDEO = (process.env.PW_VIDEO as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry' | undefined) || 'retain-on-failure';
const TRACE = (process.env.PW_TRACE as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry' | undefined) || 'on-first-retry';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    headless: HEADLESS,
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    screenshot: 'on',
    trace: TRACE,
    video: VIDEO,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

