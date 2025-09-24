import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

// Debug the Mark as Paid dialog submission and capture network responses

test('debug: mark as paid dialog and network', async ({ page, request }) => {
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent.id || parent._id);
  const target = pickPaymentForOneTime(payments) || payments[0];
  const paymentId = target._id || target.id;

  const logs: string[] = [];
  page.on('console', (msg) => {
    logs.push(`[console] ${msg.type()}: ${msg.text()}`);
  });

  // Track all API requests during the dialog submit
  const requests: { url: string; method: string; status?: number; body?: any; }[] = [];
  page.on('requestfinished', async (req) => {
    const url = req.url();
    const method = req.method();
    if (url.includes('/api/') || url.includes('/installments') || url.includes('/payments/')) {
      try {
        const res = await req.response();
        const status = res?.status();
        requests.push({ url, method, status });
      } catch {}
    }
  });

  await page.goto(`/payments/${paymentId}`);
  await expect(page.getByRole('heading', { name: /PAYMENT DETAILS/i })).toBeVisible({ timeout: 15000 });

  // Choose a Pending row with Mark as Paid
  const pendingRow = page.locator('div', { hasText: 'Pending' }).filter({ has: page.getByRole('button', { name: 'Mark as Paid' }) }).first();
  const targetRow = (await pendingRow.count()) ? pendingRow : page.locator('div').filter({ has: page.getByRole('button', { name: 'Mark as Paid' }) }).first();

  await targetRow.getByRole('button', { name: 'Mark as Paid' }).click();

  // Fill minimal dialog if inputs exist (method select + notes)
  const notes = page.getByPlaceholder('Notes');
  if (await notes.count()) {
    await notes.fill('Playwright debug note');
  }

  // Confirm
  await expect(page.getByRole('heading', { name: /Mark Installment .* as Paid/i })).toBeVisible();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/') || res.url().includes('/installments/') || res.url().includes('/payments/'), { timeout: 20000 }).catch(() => null),
    page.getByRole('button', { name: 'Confirm Mark as Paid' }).click(),
  ]);

  // If dialog remains with an error, capture it
  const errorToast = page.getByText(/error|failed|unable/i).first();
  const hasError = await errorToast.isVisible().catch(() => false);

  // eslint-disable-next-line no-console
  console.log('Mark-as-Paid debug -> response matched?', !!response);
  // eslint-disable-next-line no-console
  console.log('Collected console logs:', logs);
  // eslint-disable-next-line no-console
  console.log('Observed API requests:', requests);
  // eslint-disable-next-line no-console
  console.log('Error visible?', hasError);

  // Still allow page to proceed to Paid
  await expect.soft(page.getByText('Paid', { exact: true }).first()).toBeVisible({ timeout: 20000 });
});

