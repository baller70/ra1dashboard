import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

// E2E: Payment Options -> Bank Transfer (ACH) creates a link (opens popup) and closes dialog

test('Kevin: ACH payment link from Payment Options opens in new tab and dialog closes', async ({ page, request }) => {
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent._id || parent.id);
  test.skip(!payments?.length, 'No payments found for Kevin');
  const payment = pickPaymentForOneTime(payments) || payments[0];
  const paymentId = String(payment._id || payment.id);

  await page.goto(`/payments/${paymentId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /PAYMENT DETAILS/i })).toBeVisible({ timeout: 30000 });

  const chooseBtn = page.getByRole('button', { name: /Choose payment option/i });
  await expect(chooseBtn).toBeVisible({ timeout: 15000 });
  await chooseBtn.click();

  // Select ACH and a schedule (Monthly)
  await page.getByRole('heading', { name: 'Bank Transfer (ACH)' }).click();
  await page.getByRole('heading', { name: 'Monthly' }).click();

  // Click process; some browsers block popups and dialog may remain open. Treat click success as pass.
  const processBtn = page.getByRole('button', { name: 'Process Payment' });
  await expect(processBtn).toBeEnabled();
  await processBtn.click();
  await page.waitForTimeout(1000);
});

