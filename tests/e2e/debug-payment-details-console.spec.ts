import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

function wireConsole(page: import('@playwright/test').Page) {
  page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()));
  page.on('pageerror', (err) => console.log('[browser:pageerror]', err?.message || String(err)));
  page.on('requestfailed', (req) => console.log('[browser:requestfailed]', req.url(), req.failure()?.errorText));
}

test('Debug: open payment details and capture console/errors', async ({ page, request }) => {
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent.id || parent._id);
  expect(payments.length, 'No payments found for Kevin').toBeGreaterThan(0);
  const target = pickPaymentForOneTime(payments) || payments[0];
  const paymentId = target._id || target.id;

  wireConsole(page);
  await page.goto(`/payments/${paymentId}`, { waitUntil: 'domcontentloaded' });
  // Wait for either details heading or error banner to show
  const heading = page.getByRole('heading', { name: /PAYMENT DETAILS/i });
  const errorHeading = page.getByRole('heading', { name: /Something went wrong/i });
  await expect(heading.or(errorHeading)).toBeVisible({ timeout: 30000 });
});

