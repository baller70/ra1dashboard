import { test, expect } from '@playwright/test';

// UI-only smoke that does not rely on API helpers
// Navigates via /payments to a details page, then exercises manual mark/unmark

test('Payments list -> details -> manual mark/unmark smoke', async ({ page }) => {
  // 1) Open payments list
  await page.goto('/payments', { waitUntil: 'domcontentloaded' });

  // 2) Wait for the list to render
  await expect(page.getByRole('heading', { name: /Latest Payments by Parent/i })).toBeVisible({ timeout: 30000 });

  // 3) Click the first View Details & History
  const viewButtons = page.getByRole('link', { name: /View Details & History/i });
  await expect(viewButtons.first()).toBeVisible();
  await viewButtons.first().click();

  // 4) On details page
  await expect(page.getByRole('heading', { name: /PAYMENT DETAILS/i })).toBeVisible({ timeout: 30000 });

  // 5) Find a row with Mark as Paid
  const markBtn = page.getByRole('button', { name: 'Mark as Paid' }).first();
  await expect(markBtn, 'Mark as Paid button not visible').toBeVisible({ timeout: 15000 });
  await markBtn.click();

  // 6) Confirm in dialog
  await expect(page.getByRole('button', { name: 'Confirm Mark as Paid' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Mark as Paid' }).click();

  // 7) Expect Paid appears
  await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible({ timeout: 20000 });

  // 8) Revert via Unmark if available
  const unmarkBtn = page.getByRole('button', { name: 'Unmark' }).first();
  if (await unmarkBtn.isVisible().catch(() => false)) {
    await unmarkBtn.click();
    await expect(page.getByRole('button', { name: 'Confirm Revert' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Revert' }).click();
    await expect(page.getByText('Pending', { exact: true }).first()).toBeVisible({ timeout: 20000 });
  }
});

