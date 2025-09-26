import { test, expect } from '@playwright/test';

// This test uses the actual browser to create two teams via the Payments page UI.
// It asserts both newly created teams appear in the Team filter select.

test('Payments page: can create two teams from the New Team dialog', async ({ page }) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? '';
  const ts = Date.now();
  const teamA = `E2E Team A ${ts}`;
  const teamB = `E2E Team B ${ts}`;

  // Navigate to Payments
  await page.goto(`${baseURL}/payments`);

  // Helper to create a team through the dialog
  const createTeam = async (name: string) => {
    await page.getByRole('button', { name: 'New Team' }).click();
    await page.getByLabel('Team Name').fill(name);
    await page.getByLabel('Description (Optional)').fill('Created by Playwright');
    // Color input (hex)
    await page.locator('#teamColor').fill('#f97316');

    // Submit (no full-page navigation; dialog closes and list refreshes)
    const createBtn = page.getByRole('button', { name: 'Create Team' });
    await createBtn.click();
    // While in-flight, button is disabled and shows "Creating…"
    await expect(createBtn).toBeDisabled();
    // Dialog closes on success; wait for the New Team button to be visible again
    await expect(page.getByRole('button', { name: 'New Team' })).toBeVisible();
    // Give the client-side refresh a moment to re-render team list
    await page.waitForTimeout(500);
    return;
  };

  await createTeam(teamA);
  await createTeam(teamB);

  // Validate both team names appear in the team filter select
  const teamSelect = page.locator('select').first(); // first select is the team filter
  await expect(teamSelect).toBeVisible();
  await expect(teamSelect.locator('option', { hasText: teamA })).toHaveCount(1);
  await expect(teamSelect.locator('option', { hasText: teamB })).toHaveCount(1);
});

