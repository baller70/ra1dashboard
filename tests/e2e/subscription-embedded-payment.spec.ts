import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

// Runs the embedded Stripe payment form on the Payment Detail page (no hosted redirect)
// Uses Stripe test card 4242 4242 4242 4242 to complete the payment end-to-end.

test('Kevin: embedded payment element completes successfully (no redirect)', async ({ page, request }) => {
  const paymentIdEnv = process.env.PAYMENT_ID;

  let parent: any = null;
  let paymentId: string;

  if (paymentIdEnv) {
    // Use the explicit payment id provided by the runner
    paymentId = String(paymentIdEnv);
  } else {
    // Discover Kevin + an unpaid payment via live API
    parent = await getKevinParent(request);
    const payments = await getPaymentsForParent(request, parent._id || parent.id);
    test.skip(!payments?.length, 'No payments found for Kevin');
    const payment = pickPaymentForOneTime(payments);
    test.skip(!payment, 'No suitable unpaid payment for embedded test');
    paymentId = String(payment._id || payment.id);
  }

  // Go to the Payment Detail page (embedded form lives here)
  await page.goto(`/payments/${paymentId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/PAYMENT DETAILS/i)).toBeVisible();

  // Some implementations mount the Payment Element only after opening a dialog or clicking a CTA.
  const openFormTriggers = [
    /Make Payment/i,
    /Pay Now/i,
    /Pay/i,
    /Checkout/i,
    /Card/i,
    /Credit|Debit/i,
  ];
  for (const name of openFormTriggers) {
    const btn = page.getByRole('button', { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  // Wait for Stripe Payment Element iframes to mount
  // Try broad match, then frame title-based probe
  const iframeAppeared = await page.waitForSelector('iframe', { timeout: 20000 }).catch(() => null);
  if (!iframeAppeared) {
    // Try clicking any "Add card"/"Enter card" links/buttons
    const alt = page.getByRole('button', { name: /Add card|Enter card|Card details|Enter payment/i }).first();
    if (await alt.isVisible().catch(() => false)) {
      await alt.click().catch(() => {});
      await page.waitForSelector('iframe', { timeout: 20000 });
    }
  }

  // Helper to fill inputs that might be inside any Stripe iframe variant
  async function fillInAnyFrame(selector: string, value: string) {
    const fl = page.frameLocator('iframe').locator(selector).first();
    if (await fl.isVisible().catch(() => false)) { await fl.fill(value); return true; }
    for (const frame of page.frames()) {
      const el = frame.locator(selector).first();
      if (await el.isVisible().catch(() => false)) { await el.fill(value); return true; }
    }
    return false;
  }

  // Common field variants across Card Element and Payment Element
  // Use appropriate test card based on environment
  const testCard = process.env.VERCEL_ENV === 'production' ? '4000 0000 0000 0002' : '4242 4242 4242 4242';
  await fillInAnyFrame('input[placeholder*="Card number" i], input[name="cardnumber"], input[id="Field-numberInput"]', testCard);
  await fillInAnyFrame('input[placeholder*="MM / YY" i], input[name="exp-date"], input[id="Field-expiryInput"]', '12 / 34');
  await fillInAnyFrame('input[placeholder*="CVC" i], input[name="cvc"], input[id="Field-cvcInput"], input[id="Field-securityCodeInput"]', '123');

  // Optional fields if your form asks for name and postal code
  const nameValue = parent?.name || 'Kevin Houston';
  const nameFieldFilled = await fillInAnyFrame('input[autocomplete="cc-name"], input[name="name"], input[id="Field-nameInput"]', nameValue);
  if (!nameFieldFilled) {
    const namePageField = page.locator('input[autocomplete="cc-name"], input[name="name"], input[placeholder*="Name" i]');
    if (await namePageField.first().isVisible().catch(() => false)) await namePageField.first().fill(nameValue);
  }
  await fillInAnyFrame('input[name="postal"], input[placeholder*="ZIP" i], input[placeholder*="Postal" i], input[id="Field-postalCodeInput"]', '10001');

  // Click the pay/submit button on the page (outside the iframe)
  const payButton = page.getByRole('button', { name: /Pay|Pay now|Submit|Make Payment|Complete/i }).first();
  await expect(payButton).toBeVisible();
  await payButton.click();

  // Handle any potential 3DS challenge if presented in an iframe
  const challengeDeadline = Date.now() + 90_000;
  while (Date.now() < challengeDeadline) {
    if ((await page.getByText('Paid', { exact: true }).count().catch(() => 0)) > 0) break;
    let clicked = false;
    for (const frame of page.frames()) {
      const approve = frame.getByRole('button', { name: /Complete authentication|Authorize|Complete|Submit|Continue/i }).first();
      if (await approve.isVisible().catch(() => false)) { await approve.click().catch(() => {}); clicked = true; break; }
    }
    if (!clicked) await page.waitForTimeout(1000);
  }

  // Expect the page to reflect payment success without a redirect
  await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: 'test-results/screenshots/embedded-payment-success.png', fullPage: true });
});

