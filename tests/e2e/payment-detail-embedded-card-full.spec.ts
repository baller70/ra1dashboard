import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

// E2E: Payment Details -> Payment Options dialog -> Credit/Debit Card (Full Payment) on-page (embedded)
// Uses native inputs (no hosted checkout). Assumes Stripe test mode.

test('Kevin: embedded card full payment on Payment Details completes (no checkout)', async ({ page, request }) => {
  // 1) Resolve Kevin and a pending/overdue payment id
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent._id || parent.id);
  test.skip(!payments?.length, 'No payments found for Kevin');
  const payment = pickPaymentForOneTime(payments) || payments[0];
  const paymentId = String(payment._id || payment.id);

  // 2) Open Payment Details
  await page.goto(`/payments/${paymentId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /PAYMENT DETAILS/i })).toBeVisible({ timeout: 30000 });

  // 3) Open Payment Options dialog
  const chooseBtn = page.getByRole('button', { name: /Choose payment option/i });
  await expect(chooseBtn).toBeVisible({ timeout: 15000 });
  await chooseBtn.click();

  // 4) Select Credit/Debit Card + Full Payment
  await page.getByRole('heading', { name: 'Credit/Debit Card' }).click();
  await page.getByRole('heading', { name: 'Full Payment' }).click();

  // 5) Fill native card + billing inputs
  await page.getByLabel('Cardholder Name *').fill('Kevin Van Houston');
  await page.getByLabel('Card Number *').fill('4242 4242 4242 4242');
  await page.getByLabel('Expiry Date *').fill('12/34');
  await page.getByLabel('CVV *').fill('123');
  await page.getByLabel('Street Address *').fill('123 Test St');
  await page.getByLabel('City *').fill('New York');
  await page.getByLabel('State *').fill('NY');
  await page.getByLabel('Postal Code *').fill('10001');

  // 6) Process payment (button is enabled once fields are valid)
  const processBtn = page.getByRole('button', { name: 'Process Credit Card Payment' });
  await expect(processBtn).toBeEnabled({ timeout: 15000 });
  await page.screenshot({ path: test.info().outputPath('embedded-card-form-filled.png'), fullPage: true });
  await processBtn.click();

  // 7) Expect success: page shows Paid on at least one row, and remains stable
  await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: test.info().outputPath('embedded-card-success.png'), fullPage: true });
});

