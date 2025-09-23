import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

const RUN_STRIPE_HOSTED = process.env.RUN_STRIPE_HOSTED === 'true';

test('Kevin: one-time payment success flow (Vercel)', async ({ page, request }) => {
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent._id || parent.id);
  test.skip(!payments?.length, 'No payments found for Kevin');
  const payment = pickPaymentForOneTime(payments);
  test.skip(!payment, 'No suitable payment');

  const paymentId = String(payment._id || payment.id);
  const amount = Number(payment.amount || 0);
  const amountCents = Math.round(amount * 100) || 100;

  const checkoutRes = await request.post('/api/stripe/one-time', {
    data: { parentId: String(parent._id || parent.id), paymentId, amount: amountCents, description: `One-time payment for ${parent.name}` }
  });
  expect(checkoutRes.ok()).toBeTruthy();
  const { url, sessionId } = await checkoutRes.json();
  expect(url).toContain('stripe.com');

  if (RUN_STRIPE_HOSTED) {
    await page.goto(url);
    await page.screenshot({ path: 'test-results/screenshots/stripe-checkout-loaded.png', fullPage: true });
  }

  await page.goto(`/payments/${paymentId}?status=success&session_id=${encodeURIComponent(sessionId || 'test_session')}`);
  await page.screenshot({ path: 'test-results/screenshots/return-success.png', fullPage: true });

  await expect(page.getByText(/PAYMENT DETAILS/i)).toBeVisible();
  // Use exact label and first() to avoid strict mode violation
  await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible({ timeout: 15000 });
});

