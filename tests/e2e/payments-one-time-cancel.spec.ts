import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent } from './helpers/api';

test('Kevin: one-time payment cancel/error flow (Vercel)', async ({ page, request }) => {
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent._id || parent.id);
  test.skip(!payments?.length, 'No payments found for Kevin');

  // Choose a payment that is NOT already paid; skip if none exist
  const candidate = payments.find((p: any) => (p.status || '').toLowerCase() !== 'paid');
  test.skip(!candidate, 'All Kevin payments are already paid; cancel flow not applicable');

  const paymentId = String(candidate._id || candidate.id);

  // Simulate cancel return from hosted Checkout
  await page.goto(`/payments/${paymentId}?status=cancelled`);
  await page.screenshot({ path: 'test-results/screenshots/return-cancelled.png', fullPage: true });

  await expect(page.getByText(/PAYMENT DETAILS/i)).toBeVisible();

  // We consider cancel successful if the page does NOT show a success banner
  await expect(page.getByText(/Payment Successful|Payment Completed/i)).toHaveCount(0);

  // And the UI still offers a way to pay (indicating it remains unpaid)
  const payCta = page.getByRole('button', { name: /Pay|Checkout|Make Payment/i }).first();
  await expect(payCta).toBeVisible({ timeout: 5000 });
});

