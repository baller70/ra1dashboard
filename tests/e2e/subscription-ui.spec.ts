import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

test('Kevin: subscription UI (no creation)', async ({ page, request }) => {
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent._id || parent.id);
  test.skip(!payments?.length, 'No payments found for Kevin');
  const payment = pickPaymentForOneTime(payments);
  test.skip(!payment, 'No suitable payment');

  const paymentId = String(payment._id || payment.id);
  await page.goto(`/payments/${paymentId}`);
  await expect(page.getByText(/PAYMENT DETAILS/i)).toBeVisible();

  // Open Quick Actions → payment options dialog
  await page.getByRole('button', { name: /Choose payment option/i }).click();
  await page.screenshot({ path: 'test-results/screenshots/payment-options-open.png', fullPage: true });

  // Verify schedule options are present without submitting
  await expect(page.getByRole('heading', { name: 'Full Payment' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quarterly' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Monthly' })).toBeVisible();

  // Close dialog (escape or outside click)
  await page.keyboard.press('Escape');
});

