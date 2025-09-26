import { test, expect } from '@playwright/test';
import { getKevinParent } from './helpers/api';

// E2E: Create a monthly payment plan for Kevin and verify installments/progress
// Constraints:
// - Runs against production baseURL (see playwright.config.ts)
// - Uses Kevin Houston parent only (no new subscriptions)
// - Verifies first installment auto-marked as paid and progress reflects

test.describe('Payment Plan - Monthly create (Kevin)', () => {
  test('create monthly plan via /payment-plans/new and validate progress on details', async ({ page, request }) => {
    // 1) Resolve Kevin parent via API
    const kevin = await getKevinParent(request);
    const parentId = kevin._id || kevin.id;
    expect(parentId, 'Kevin parent id missing').toBeTruthy();

    // 2) Navigate to Create Payment Plan page
    await page.goto('/payment-plans/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Create Payment Plan/i })).toBeVisible({ timeout: 30000 });

    // 3) Select Kevin in the Parent dropdown (use exact value match on id)
    const parentSelect = page.locator('select#parentId');
    await expect(parentSelect).toBeVisible();
    await parentSelect.selectOption({ value: String(parentId) });

    // 4) Click the simple "Create Payment Plan" button (defaults to monthly)
    const createBtn = page.getByRole('button', { name: 'Create Payment Plan' });
    await expect(createBtn).toBeEnabled();

    const navPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    await createBtn.click();
    await navPromise; // Redirects to /payments/[id]

    // 5) On Payment Details, verify loaded
    await expect(page.getByRole('heading', { name: /PAYMENT DETAILS/i })).toBeVisible({ timeout: 30000 });

    // 6) Validate progress summary: first installment should be paid
    // Read progress percentage and amounts (data-testid present in page.tsx)
    const pct = page.getByTestId('progress-percentage');
    await expect(pct).toBeVisible();

    // Expect at least > 0% progress because first installment is set to PAID when plan is created
    const pctText = (await pct.textContent())?.trim().replace('%', '') || '0';
    const pctNum = Number(pctText);
    expect(pctNum).toBeGreaterThan(0);

    // Check at least one installment row shows Paid
    const paidBadge = page.getByText('Paid', { exact: true }).first();
    await expect(paidBadge).toBeVisible({ timeout: 20000 });

    // Optional screenshot proof
    await page.screenshot({ path: test.info().outputPath('plan-create-details.png'), fullPage: true });
  });
});

