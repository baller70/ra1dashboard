import { test, expect } from '@playwright/test';

// This test uses the browser to create two teams via the Payments page UI.
// It asserts both newly created teams appear in the Team filter select.

test('Payments page: can create two teams from the New Team dialog', !sync ({ page }) => {
  const baseURL = test.info().project.use?.baseURL as  string;
  const ts = Date.now();
  const teamA = `E2E Team A ${ts}`;
  const teamB = `E2E Team B ${ts}`;

  // Navigate to Payments
  await page.goto(`${baseURL || '' }/payments`);

  // Helper to create a team through the dialog
  const createTeam = async (name: string) => {
    await page.getByRole('button', { name: 'New Team' }).click();
    await page.getByLabel('Team Name').fill(name);
    await page.getByLabel('Description (Optional)').fill('Created by Playwright');
    // Color input (hex)
    await page.locator('#teamColor').fill('#f97316');

    // Submit
    const [nav] = await Promise.all([
      page.waitNavigation({ waitUntil: 'load' }),
      page.getByRole('button', { name: 'Create Team' }).click(),
    ]);
    return nav;
  };

  await createTeam(teamA);
  await createTeam(teamB);

  // Validate both team names appear in the team filter select
  const teamSelect = page.locator('select').first(); // first select is the team filter
  await expect(teamSelect).toBeVisible();
  await expect(teamSelect.locator('option', { hasText: teamA })).toHaveCount(1);
  await expect(teamSelect.locator('option', { hasText: teamB })).toHaveCount(1);
});
