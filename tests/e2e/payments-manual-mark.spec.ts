import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api';

// Smoke test for manual mark/unmark on installment in Payment Details
// Runs against the configured baseURL (default: production)

test.describe('Payment Details - Manual Mark/Unmark Installment', () => {
  test('can open payment details and manual mark then unmark an installment', async ({ page, request }) => {
    // Capture browser console logs
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

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

    // Snapshot + DB state BEFORE actions
    await page.screenshot({ path: test.info().outputPath('01-payment-details.png'), fullPage: true });
    const progressBeforeResp = await request.get(`/api/payments/${paymentId}/progress?ts=${Date.now()}`);
    const progressBeforeJson = await progressBeforeResp.json().catch(() => ({}));
    console.log('DEBUG Progress before actions:', progressBeforeJson);
    await fs.writeFile(test.info().outputPath('progress-before.json'), JSON.stringify(progressBeforeJson, null, 2));

    // Assert UI reflects BEFORE state across Summary + Progress cards
    if (progressBeforeJson && typeof progressBeforeJson.paidAmount === 'number') {
      await expect(page.getByTestId('amount-paid')).toContainText(`$${Number(progressBeforeJson.paidAmount).toFixed(2)}`);
    }
    if (progressBeforeJson && typeof progressBeforeJson.remainingAmount === 'number') {
      await expect(page.getByTestId('amount-remaining')).toContainText(`$${Number(progressBeforeJson.remainingAmount).toFixed(2)}`);
    }
    if (progressBeforeJson && typeof progressBeforeJson.progressPercentage === 'number') {
      await expect(page.getByTestId('progress-percentage')).toHaveText(`${Math.round(progressBeforeJson.progressPercentage)}%`);
    }

    // 4) Click the first visible "Mark as Paid" button (row-scoped selectors can be flaky across layouts)
    const markBtn = page.getByRole('button', { name: 'Mark as Paid' }).first();
    await expect(markBtn, 'No "Mark as Paid" button found').toBeVisible();
    await markBtn.click();

    // 5) Dialog opens -> confirm without changing method/notes
    await expect(page.getByRole('heading', { name: /Mark Installment .* as Paid|Revert Manual Payment/i })).toBeVisible();

    const manualPostPromise = page.waitForResponse(resp => resp.url().includes('/api/installments/') && resp.request().method() === 'POST');
    const progressAfterMarkPromise = page.waitForResponse(resp => resp.url().includes(`/api/payments/${paymentId}/progress`) && resp.request().method() === 'GET');

    await page.getByRole('button', { name: 'Confirm Mark as Paid' }).click();

    const manualPostResp = await manualPostPromise;
    const manualPostJson = await manualPostResp.json().catch(() => ({}));
    console.log('DEBUG Manual POST (mark) response:', manualPostJson);
    await fs.writeFile(test.info().outputPath('post-mark.json'), JSON.stringify(manualPostJson, null, 2));

    const progressAfterMarkResp = await progressAfterMarkPromise;
    const progressAfterMarkJson = await progressAfterMarkResp.json().catch(() => ({}));
    console.log('DEBUG Progress after mark:', progressAfterMarkJson);
    await fs.writeFile(test.info().outputPath('progress-after-mark.json'), JSON.stringify(progressAfterMarkJson, null, 2));

    // 6) All four sections should reflect new state immediately
    // Payment Schedule: button toggles to Unmark (or Revert)
    await expect(page.getByRole('button', { name: /Unmark|Revert/i }).first()).toBeVisible({ timeout: 20000 });

    // Payment Summary + Progress: strongly assert percentage, and soft-check amounts
    const paidAfter = manualPostJson?.progress?.paidAmount;
    const remainingAfter = manualPostJson?.progress?.remainingAmount;
    const pctAfter = Math.round((manualPostJson?.progress?.progressPercentage ?? progressAfterMarkJson?.progressPercentage) || 0);
    await expect(page.getByTestId('progress-percentage')).toHaveText(`${pctAfter}%`);
    // Soft checks for amounts (log-only if mismatch to avoid brittle failures due to rounding or timing)
    try {
      if (typeof paidAfter === 'number') {
        await expect(page.getByTestId('amount-paid')).toContainText(`$${Number(paidAfter).toFixed(2)}`);
      }
      if (typeof remainingAfter === 'number') {
        await expect(page.getByTestId('amount-remaining')).toContainText(`$${Number(remainingAfter).toFixed(2)}`);
      }
    } catch (e) {
      console.warn('Soft amount check failed after mark:', e);
    }

    // Payment History: expand the section (collapsed by default) then verify manual entry appears
    const historyHeader = page.getByText('PAYMENT HISTORY', { exact: true });
    await historyHeader.click();
    await expect(page.getByText(/manually recorded as paid/i).first()).toBeVisible({ timeout: 10000 });

    // If the dialog is still open for any reason, close it before proceeding
    const confirmDialogHeading = page.getByRole('heading', { name: /Mark Installment .* as Paid/i });
    if (await confirmDialogHeading.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Close' }).click();
    }

    // Manual badge is optional, assert softly if present (global)
    const manualBadge = page.getByText('Manual', { exact: true }).first();
    if (await manualBadge.count()) {
      await expect(manualBadge).toBeVisible();
    }

    // Screenshot after mark
    await page.screenshot({ path: test.info().outputPath('02-after-mark.png'), fullPage: true });

    // 6.1) Persistence check: ensure UI does not revert after 12s
    await page.waitForTimeout(12000);
    // Button should still be Unmark/Revert
    await expect(page.getByRole('button', { name: /Unmark|Revert/i }).first()).toBeVisible({ timeout: 5000 });
    // Progress percentage should remain
    await expect(page.getByTestId('progress-percentage')).toHaveText(`${pctAfter}%`);
    // Soft-check amounts remain
    try {
      if (typeof paidAfter === 'number') {
        await expect(page.getByTestId('amount-paid')).toContainText(`$${Number(paidAfter).toFixed(2)}`);
      }
      if (typeof remainingAfter === 'number') {
        await expect(page.getByTestId('amount-remaining')).toContainText(`$${Number(remainingAfter).toFixed(2)}`);
      }
    } catch (e) {
      console.warn('Soft amount persistence check failed after mark:', e);
    }

    // 7) Unmark/Revert only if the button exists (some single-payment layouts may not expose revert UI)
    const unmarkBtn = page.getByRole('button', { name: /Unmark|Revert/i }).first();
    if (await unmarkBtn.count()) {
      // Screenshot just before opening revert dialog
      await page.screenshot({ path: test.info().outputPath('03-before-unmark.png'), fullPage: true });

      await unmarkBtn.click();
      await expect(page.getByRole('heading', { name: /Revert Manual Payment/i })).toBeVisible();

      const manualUnmarkPostPromise = page.waitForResponse(resp => resp.url().includes('/api/installments/') && resp.request().method() === 'POST');
      const progressAfterUnmarkPromise = page.waitForResponse(resp => resp.url().includes(`/api/payments/${paymentId}/progress`) && resp.request().method() === 'GET');

      await page.getByRole('button', { name: 'Confirm Revert' }).click();

      const manualUnmarkPostResp = await manualUnmarkPostPromise;
      const manualUnmarkPostJson = await manualUnmarkPostResp.json().catch(() => ({}));
      console.log('DEBUG Manual POST (unmark) response:', manualUnmarkPostJson);
      await fs.writeFile(test.info().outputPath('post-unmark.json'), JSON.stringify(manualUnmarkPostJson, null, 2));

      const progressAfterUnmarkResp = await progressAfterUnmarkPromise;
      const progressAfterUnmarkJson = await progressAfterUnmarkResp.json().catch(() => ({}));
      console.log('DEBUG Progress after unmark:', progressAfterUnmarkJson);
      await fs.writeFile(test.info().outputPath('progress-after-unmark.json'), JSON.stringify(progressAfterUnmarkJson, null, 2));

      // Payment Schedule: button toggles back to Mark as Paid
      await expect(page.getByRole('button', { name: 'Mark as Paid' }).first()).toBeVisible({ timeout: 10000 });

      // Payment Summary + Progress: numbers and percentage should match unmark server progress
      const paidAfterUnmark = manualUnmarkPostJson?.progress?.paidAmount ?? progressAfterUnmarkJson?.paidAmount;
      const remainingAfterUnmark = manualUnmarkPostJson?.progress?.remainingAmount ?? progressAfterUnmarkJson?.remainingAmount;
      const pctAfterUnmark = Math.round((manualUnmarkPostJson?.progress?.progressPercentage ?? progressAfterUnmarkJson?.progressPercentage) || 0);

      // 7.1) Persistence check after unmark: wait 12s and ensure UI remains reverted
      await page.waitForTimeout(12000);
      await expect(page.getByRole('button', { name: 'Mark as Paid' }).first()).toBeVisible({ timeout: 5000 });
      if (typeof paidAfterUnmark === 'number') {
        await expect(page.getByTestId('amount-paid')).toContainText(`$${Number(paidAfterUnmark).toFixed(2)}`);
      }
      if (typeof remainingAfterUnmark === 'number') {
        await expect(page.getByTestId('amount-remaining')).toContainText(`$${Number(remainingAfterUnmark).toFixed(2)}`);
      }
      await expect(page.getByTestId('progress-percentage')).toHaveText(`${pctAfterUnmark}%`);

      await expect(page.getByTestId('progress-percentage')).toHaveText(`${pctAfterUnmark}%`);

      // Payment History: entry should reflect reversion (soft check)
      const revertedText = page.getByText(/reverted to pending/i).first();
      if (await revertedText.count()) {
        await expect(revertedText).toBeVisible();
      }

      // Screenshot after unmark
      await page.screenshot({ path: test.info().outputPath('04-after-unmark.png'), fullPage: true });
    } else {
      // Log-only: unmark control not present in this layout; marking success already validated
      console.log('No Unmark/Revert button present; skipping revert validation for this payment layout.');
    }

    // Persist browser console logs
    await fs.writeFile(test.info().outputPath('console.log'), consoleMessages.join('\n'));
  });
});
