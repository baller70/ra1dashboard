import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

// Stripe Integration Smoke Test (uses Stripe test card numbers)
// Base URL is taken from PLAYWRIGHT_BASE_URL; auto-discovers a payment for Kevin

async function tryFillInstallmentDialog(page: import('@playwright/test').Page) {
  // Wait briefly for the dialog or its fields to appear
  await Promise.race([
    page.getByRole('dialog', { name: /Pay Installment/i }).waitFor({ state: 'visible', timeout: 12000 }).catch(() => {}),
    page.getByRole('textbox', { name: /Card Number/i }).waitFor({ state: 'visible', timeout: 12000 }).catch(() => {}),
  ]);

  const cardNumber = page.getByRole('textbox', { name: /Card Number/i });
  if (!(await cardNumber.isVisible().catch(() => false))) return false;

  // Use test card only in non-production environments
  const cardNum = process.env.VERCEL_ENV === 'production' ? '4000000000000002' : '4242 4242 4242 4242';
  await cardNumber.fill(cardNum);
  await page.getByRole('textbox', { name: /Cardholder Name/i }).fill('Kevin Houston');
  await page.getByRole('textbox', { name: /Expiry Date/i }).fill('12/34');
  await page.getByRole('textbox', { name: /CVV/i }).fill('123');
  // Trigger validation
  await page.keyboard.press('Tab');
  await page.screenshot({ path: 'test-results/screenshots/stripe-smoke-installment-dialog.png', fullPage: true });

  const payBtn = page.getByRole('button', { name: /Pay \$/ });
  await expect(payBtn).toBeEnabled({ timeout: 15000 });
  await payBtn.click();
  return true;
}

// MAIN smoke test

test('Stripe integration smoke: renders Connected, pays with test card, status becomes Paid', async ({ page, request }) => {
  // Auto-discover a suitable payment for Kevin
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent._id || parent.id);
  test.skip(!payments?.length, 'No payments found for Kevin');
  const payment = pickPaymentForOneTime(payments) || payments[0];
  const PAYMENT_ID = String(payment._id || payment.id);

  await page.goto(`/payments/${PAYMENT_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/PAYMENT DETAILS/i)).toBeVisible();

  // Verify Stripe is connected in Quick Actions
  const stripeTile = page.getByRole('heading', { name: /STRIPE INTEGRATION/i }).first();
  await expect(stripeTile).toBeVisible();
  await expect(page.getByText(/Connected/i)).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/stripe-smoke-connected.png', fullPage: true });

  // Prefer the "Pay Now" path in the Next Payment Due section first
  const payNowFirst = page.getByRole('button', { name: /^Pay Now$/ }).first();
  if (await payNowFirst.isVisible().catch(() => false)) {
    await payNowFirst.click();
  } else if (await page.getByRole('button', { name: /Choose payment option/i }).isVisible().catch(() => false)) {
    // Fallback: open options and proceed via Process Payment
    await page.getByRole('button', { name: /Choose payment option/i }).click();
    await page.getByRole('heading', { name: 'Credit/Debit Card' }).click();
    await page.getByRole('heading', { name: 'Full Payment' }).click();
    const proc = page.getByRole('button', { name: /^Process Payment$/ });
    await expect(proc).toBeEnabled({ timeout: 8000 });
    await proc.click();
  }

  // Wait specifically for the installment dialog to appear
  await page.getByRole('dialog', { name: /Pay Installment/i }).waitFor({ state: 'visible', timeout: 20000 });

  // Fill and submit the dialog (Stripe test card values)
  const usedDialog = await tryFillInstallmentDialog(page);
  if (!usedDialog) throw new Error('Installment payment dialog not found after trigger.');

  // Expect page to show Paid
  await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'test-results/screenshots/stripe-smoke-paid.png', fullPage: true });
});

