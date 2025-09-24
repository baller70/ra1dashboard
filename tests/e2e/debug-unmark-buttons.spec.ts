import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

// Debug: list all button names after manual mark to find the Unmark/Revert control

test('debug: list buttons after manual mark', async ({ page, request }) => {
  const parent = await getKevinParent(request);
  const payments = await getPaymentsForParent(request, parent.id || parent._id);
  const target = pickPaymentForOneTime(payments) || payments[0];
  const paymentId = target._id || target.id;

  await page.goto(`/payments/${paymentId}`);
  await expect(page.getByRole('heading', { name: /PAYMENT DETAILS/i })).toBeVisible({ timeout: 15000 });

  const pendingRow = page.locator('div', { hasText: 'Pending' }).filter({ has: page.getByRole('button', { name: 'Mark as Paid' }) }).first();
  const hasPending = await pendingRow.count();
  const targetRow = hasPending ? pendingRow : page.locator('div').filter({ has: page.getByRole('button', { name: 'Mark as Paid' }) }).first();
  await targetRow.getByRole('button', { name: 'Mark as Paid' }).click();
  await expect(page.getByRole('heading', { name: /Mark Installment .* as Paid/i })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Mark as Paid' }).click();
  await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible({ timeout: 20000 });

  // Dump visible button names
  const allButtons = page.getByRole('button');
  const count = await allButtons.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const btn = allButtons.nth(i);
    if (await btn.isVisible().catch(() => false)) {
      const name = await btn.getAttribute('aria-label');
      const text = await btn.innerText().catch(() => '');
      names.push((name || text || '').trim());
    }
  }
  console.log('Visible buttons after mark:', names.filter(Boolean));

  // Also try to find any button near the first Paid row
  const paidRow = page.locator('div', { hasText: /Paid/i }).first();
  const paidButtons = paidRow.getByRole('button');
  const paidCount = await paidButtons.count();
  const paidNames: string[] = [];
  for (let i = 0; i < paidCount; i++) {
    const btn = paidButtons.nth(i);
    if (await btn.isVisible().catch(() => false)) {
      const name = await btn.getAttribute('aria-label');
      const text = await btn.innerText().catch(() => '');
      paidNames.push((name || text || '').trim());
    }
  }
  console.log('Buttons within first Paid row:', paidNames.filter(Boolean));
});

