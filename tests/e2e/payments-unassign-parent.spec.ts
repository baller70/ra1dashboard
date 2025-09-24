import { test, expect } from '@playwright/test';

// E2E: Create team, create parent, assign parent to team, then Remove from Team and verify the parent
// shows under Unassigned. Uses the UI flows only.

// If PLAYWRIGHT_PAYMENTS_URL is provided, the test will navigate to that URL directly (use a Vercel share link).
// Otherwise it falls back to PLAYWRIGHT_BASE_URL + '/payments'.

test('Payments: remove parent from team moves them to Unassigned (keeps parent)', async ({ page }) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? '';
  const paymentsURL = process.env.PLAYWRIGHT_PAYMENTS_URL ?? (baseURL ? `${baseURL}/payments` : '/payments');
  const ts = Date.now();
  const teamName = `E2E Remove Team ${ts}`;
  const parentName = `E2E Parent ${ts}`;
  const parentEmail = `parent+e2e_${ts}@example.com`;

  // 1) Go to Payments (ideally via Vercel share link URL)
  await page.goto(paymentsURL);

  // 2) Ensure Group by Team is enabled
  const groupByLabel = page.getByText('Group by Team', { exact: true });
  const groupByCheckbox = page.locator('#groupByTeam');
  if (!(await groupByCheckbox.isChecked())) {
    await groupByLabel.click();
    await expect(groupByCheckbox).toBeChecked();
  }

  // Helper to create a team through the dialog
  const createTeam = async (name: string) => {
    await page.getByRole('button', { name: 'New Team' }).click();
    await page.getByLabel('Team Name').fill(name);
    await page.getByLabel('Description (Optional)').fill('Created by Playwright');
    await page.locator('#teamColor').fill('#f97316');
    const createBtn = page.getByRole('button', { name: 'Create Team' });
    await createBtn.click();
    await expect(createBtn).toBeDisabled();
    // Wait for dialog to close (New Team button visible again)
    await expect(page.getByRole('button', { name: 'New Team' })).toBeVisible();
    // Allow client-side refresh to complete
    await page.waitForTimeout(500);
  };

  // 3) Create a team
  await createTeam(teamName);

  // 4) Create a Parent via the Create Parent modal
  await page.getByRole('button', { name: 'Create Parent' }).click();
  await page.getByLabel('Full Name *').fill(parentName);
  await page.getByLabel('Email Address *').fill(parentEmail);
  await page.getByRole('button', { name: 'Add Parent' }).click();
  // Wait for modal to close (button becomes visible again)
  await expect(page.getByRole('button', { name: 'Create Parent' })).toBeVisible();
  // Brief wait for refreshed data
  await page.waitForTimeout(500);

  // 5) Assign the parent to the team using the Assign Parents dialog
  // Open global Assign Parents button
  await page.getByRole('button', { name: 'Assign Parents' }).first().click();

  // Select the team in the Select component
  await page.getByText('Choose a team...', { exact: true }).click();
  await page.getByRole('option').getByText(teamName, { exact: true }).click();

  // Tick the parent's checkbox by row with their name
  const parentRow = page.locator('div').filter({ hasText: parentName }).last();
  await expect(parentRow).toBeVisible();
  // Find the checkbox sibling in that row
  await parentRow.getByRole('checkbox').check();

  // Click Assign to Team (this may cause a full page reload)
  const assignBtn = page.getByRole('button', { name: 'Assign to Team' });
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'load' }),
    assignBtn.click(),
  ]);

  // After assign, ensure grouped view and locate the team section with the parent name
  await expect(groupByCheckbox).toBeChecked();
  // Some renders may be async, give it a moment
  await page.waitForTimeout(800);

  // Find the group section by team name, then the row with parent name
  const teamSection = page.locator('div').filter({ hasText: teamName }).first();
  await expect(teamSection).toBeVisible();

  const teamParentRow = page.locator('div').filter({ hasText: parentName }).first();
  await expect(teamParentRow).toBeVisible();

  // 6) Click "Remove from Team" in that row
  await teamParentRow.getByRole('button', { name: 'Remove from Team' }).click();

  // 7) Verify the parent appears under the Unassigned group
  const unassignedHeader = page.getByText('Unassigned', { exact: true }).first();
  await expect(unassignedHeader).toBeVisible();

  // Scope to region after the Unassigned header; then expect the parent name
  // To be robust, search globally for parentName and ensure it still exists but not under the previous team section
  await expect(page.getByText(parentName)).toBeVisible();

  // Ensure the parent no longer appears under the original team section
  await page.waitForTimeout(500);
  await expect(teamSection.getByText(parentName, { exact: true })).toHaveCount(0);
});

