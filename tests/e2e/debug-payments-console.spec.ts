import { test, expect } from '@playwright/test';

const PATH = '/payments';

function wireConsole(page: import('@playwright/test').Page) {
  page.on('console', (msg) => {
    // Mirror console output to test stdout for debugging
    // eslint-disable-next-line no-console
    console.log(`[browser:${msg.type()}]`, msg.text());
  });
  page.on('pageerror', (err) => {
    // eslint-disable-next-line no-console
    console.log('[browser:pageerror]', err?.message || String(err));
  });
  page.on('requestfailed', (req) => {
    // eslint-disable-next-line no-console
    console.log('[browser:requestfailed]', req.url(), req.failure()?.errorText);
  });
}

test('Debug payments -> navigate to details and capture console', async ({ page }) => {
  wireConsole(page);

  await page.goto(PATH, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: 'test-results/screenshots/debug-payments-list.png', fullPage: true });

  // Try to click first details link if present
  const details = page.getByRole('link', { name: /View Details & History/i }).first();
  if (await details.isVisible().catch(() => false)) {
    await details.click();
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'test-results/screenshots/debug-payment-details.png', fullPage: true });
    // Assert either heading or the error banner to explicitly capture
    const heading = page.getByRole('heading', { name: /PAYMENT DETAILS/i });
    const errorHeading = page.getByRole('heading', { name: /Something went wrong/i });
    await expect(heading.or(errorHeading)).toBeVisible({ timeout: 30000 });
  } else {
    // eslint-disable-next-line no-console
    console.log('[debug] No details link visible on /payments');
  }
});

