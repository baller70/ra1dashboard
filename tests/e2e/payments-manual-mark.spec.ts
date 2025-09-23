import { test, expect } from '@playwright/test';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

// Smoke test for manual mark/unmark on installment in Payment Details
// Assumes baseURL points to the Vercel Preview of this branch

test.describe('Payment Details - Manual Mark/Unmark Installment', () => {
  test('can open payment details and manual mark then unmark an installment', async ({ page, request }) => {
    // 1) Resolve Kevin parent and pick a payment id via API (no UI auth needed)
    const parent = await getKevinParent(request);
    const payments = await getPaymentsForParent(request, parent.id || parent._id);
    expect(payments.length, 'No payments found for Kevin').toBeGreaterThan(0);
    const target = pickPaymentForOneTime(payments) || payments[0];
    const paymentId = target._id || target.id;

    // 2) Open payment details page
    await page.goto(`/payments/${paymentId}`);

    // 3) Wait for Payment Details to render; then look for any Mark as Paid button
    await expect(page.getByRole('heading', { name: /PAYMENT DETAILS/i })).toBeVisible({ timeout: 15000 });

    // 4) Find first unpaid row and click "Mark as Paid" (installments or equivalent section)
    // Strategy: locate a row that contains text "Pending" and has a button "Mark as Paid"
    const pendingRow = page.locator('div', { hasText: 'Pending' }).filter({ has: page.getByRole('button', { name: 'Mark as Paid' }) }).first();

    // If nothing pending, fallback: look for any row that has "Mark as Paid" regardless of badge text
    const hasPending = await pendingRow.count();
    const targetRow = hasPending ? pendingRow : page.locator('div').filter({ has: page.getByRole('button', { name: 'Mark as Paid' }) }).first();
    await expect(targetRow, 'No row with Mark as Paid found').toHaveCount(1);

    await targetRow.getByRole('button', { name: 'Mark as Paid' }).click();

    // 5) Dialog opens -> confirm without changing method/notes
    await expect(page.getByRole('heading', { name: /Mark Installment as Paid|Revert Manual Payment/i })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Mark as Paid' }).click();

    // 6) Expect status to flip to Paid and show Manual badge (if present in UI)
    await expect(targetRow.getByText('Paid')).toBeVisible({ timeout: 10000 });
    // Manual badge is optional, assert softly if present
    const manualBadge = targetRow.getByText('Manual');
    if (await manualBadge.count()) {
      await expect(manualBadge).toBeVisible();
    }

    // 7) Unmark to revert
    await targetRow.getByRole('button', { name: 'Unmark' }).click();
    await expect(page.getByRole('heading', { name: /Revert Manual Payment/i })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Revert' }).click();

    // 8) Expect status to be Pending again
    await expect(targetRow.getByText('Pending')).toBeVisible({ timeout: 10000 });
  });
});

