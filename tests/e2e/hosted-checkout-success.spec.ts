import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

// This test drives the full hosted Stripe Checkout page and completes with test card 4242 4242 4242 4242.
// It runs against the live Vercel baseURL defined in playwright.config.ts.

test('Kevin: full hosted checkout success (live Stripe test)', async ({ page, request }) => {
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent._id || parent.id);
  test.skip(!payments?.length, 'No payments found for Kevin');
  const payment = pickPaymentForOneTime(payments);
  test.skip(!payment, 'No suitable payment');

  const paymentId = String(payment._id || payment.id);
  const amount = Number(payment.amount || 0);
  const amountCents = Math.round(amount * 100) || 100;

  // Create a Stripe Checkout session via the app API
  const checkoutRes = await request.post('/api/stripe/one-time', {
    data: { parentId: String(parent._id || parent.id), paymentId, amount: amountCents, description: `One-time payment for ${parent.name}` }
  });
  expect(checkoutRes.ok()).toBeTruthy();
  const { url } = await checkoutRes.json();
  expect(url).toContain('stripe.com');

  // Go to hosted checkout
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: 'test-results/screenshots/hosted-checkout-loaded.png', fullPage: true });

  // Fill email if present
  const emailField = page.locator('input[type="email"], input[name="email"], input[id="email"]');
  if (await emailField.first().isVisible().catch(() => false)) {
    await emailField.first().fill(parent.email || 'kevin+e2e@example.com');
  }

  // Helper to fill a field that might be inside any Stripe iframe
  async function fillInFrames(selector: string, value: string) {
    const direct = page.frameLocator('iframe').locator(selector).first();
    if (await direct.isVisible().catch(() => false)) { await direct.fill(value); return true; }
    for (const frame of page.frames()) {
      const el = frame.locator(selector).first();
      if (await el.isVisible().catch(() => false)) { await el.fill(value); return true; }
    }
    return false;
  }

  await fillInFrames('input[placeholder*="Card number" i], input[name="cardnumber"]', '4242 4242 4242 4242');
  await fillInFrames('input[placeholder*="MM / YY" i], input[name="exp-date"], input[name="exp-date-input"]', '12 / 34');
  await fillInFrames('input[placeholder*="CVC" i], input[name="cvc"], input[name="security-code"]', '123');

  // Cardholder name (if present)
  const nameInput = page.locator('input[autocomplete="cc-name"], input[name="name"], input[placeholder*="Name" i]');
  if (await nameInput.first().isVisible().catch(() => false)) {
    await nameInput.first().fill(parent.name || 'Kevin Houston');
  }

  // Submit/Pay
  const payButton = page.getByRole('button', { name: /Pay|Complete|Subscribe|Pay now|Pay \$/i }).first();
  await payButton.click().catch(async () => {
    await page.waitForTimeout(1000);
    await payButton.click().catch(() => {});
  });

  // Handle possible 3DS/verification challenge inside an iframe
  const possible3DSButtons = /Complete authentication|Authorize|Complete|Submit|Continue/i;
  const deadline = Date.now() + 90_000; // total budget 90s
  let redirected = false;

  while (Date.now() < deadline && !redirected) {
    // If already back to app, break
    if (/ra1dashboard\.vercel\.app\/payments\/.+\?status=success/i.test(page.url())) {
      redirected = true; break;
    }

    // Try clicking a challenge button inside any frame
    let clicked = false;
    for (const frame of page.frames()) {
      const btn = frame.getByRole('button', { name: possible3DSButtons }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); clicked = true; break; }
      const anyBtn = frame.locator('button').filter({ hasText: possible3DSButtons }).first();
      if (await anyBtn.isVisible().catch(() => false)) { await anyBtn.click().catch(() => {}); clicked = true; break; }
    }

    // Wait a bit and check for redirect
    await page.waitForTimeout(1000);
    if (/ra1dashboard\.vercel\.app\/payments\/.+\?status=success/i.test(page.url())) {
      redirected = true; break;
    }

    // Also try a more generous wait for URL change
    try {
      await page.waitForURL(/ra1dashboard\.vercel\.app\/payments\/.+\?status=success/i, { timeout: 2000 });
      redirected = true; break;
    } catch {}
  }

  // Final assert: we must be on app success page
  await expect(page).toHaveURL(/ra1dashboard\.vercel\.app\/payments\/.+\?status=success/i, { timeout: 10_000 });
  await page.screenshot({ path: 'test-results/screenshots/hosted-return-success.png', fullPage: true });

  await expect(page.getByText(/PAYMENT DETAILS/i)).toBeVisible();
  await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible({ timeout: 15000 });
});

