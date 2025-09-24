import { test, expect } from '@playwright/test';

/**
 * E2E: Assign existing parent (Kevin Houston) to a newly created team via the UI, verify grouping updates immediately;
 * then click "Remove from Team" to unassign and verify the parent moves to Unassigned and disappears from the team group.
 * Finally, verify persistence after a page reload.
 *
 * To target a Vercel Preview directly, set PLAYWRIGHT_PAYMENTS_URL to the full preview URL, e.g.:
 * PLAYWRIGHT_PAYMENTS_URL="https://...vercel.app/payments" npx playwright test tests/e2e/payments-team-assign-unassign-ui.spec.ts
 */

test('Payments: UI assignment and unassignment update grouping immediately and persist', async ({ page }) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? '';
  const paymentsURL = process.env.PLAYWRIGHT_PAYMENTS_URL ?? (baseURL ? `${baseURL}/payments` : '/payments');
  const ts = Date.now();
  const teamName = `E2E UI Team ${ts}`;
  const targetParentName = 'Kevin Houston';

  // Helper: find a team heading and ensure its section is expanded
  const expandGroupByName = async (name: string) => {
    const heading = page.getByRole('heading', { name: new RegExp(`^${name}\\s*\\(`) });
    await heading.scrollIntoViewIfNeeded();
    // Toggle twice to guarantee open state (Collapsible has only trigger)
    await heading.click();
    await heading.click();
    return heading;
  };

  // Helper: extract the numeric count from a group header (e.g., "Team A (3 parents)")
  const getGroupCount = async (name: string) => {
    const heading = page.getByRole('heading', { name: new RegExp(`^${name}\\s*\\(`) });
    const count = await heading.count();
    if (count === 0) return 0;
    const text = (await heading.first().textContent()) || '';
    const match = text.match(/\((\d+)\s+parent/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Navigate to Payments
  await page.goto(paymentsURL);

  // Ensure Group by Team is enabled
  const groupByLabel = page.getByText('Group by Team', { exact: true });
  const groupByCheckbox = page.locator('#groupByTeam');
  if (!(await groupByCheckbox.isChecked())) {
    await groupByLabel.click();
    await expect(groupByCheckbox).toBeChecked();
  }

  // Capture Unassigned count initially
  const unassignedName = 'Unassigned';
  await expect(page.getByRole('heading', { name: new RegExp(`^${unassignedName}\\s*\\(`) })).toBeVisible();
  const unassignedBefore = await getGroupCount(unassignedName);

  // Create a Team via the UI dialog
  await page.getByRole('button', { name: 'New Team' }).click();
  await page.getByLabel('Team Name').fill(teamName);
  await page.getByLabel('Description (Optional)').fill('Created by Playwright');
  await page.locator('#teamColor').fill('#f97316');
  const createBtn = page.getByRole('button', { name: /Create/ });
  await createBtn.click();
  await expect(page.getByRole('button', { name: 'New Team' })).toBeVisible();
  await page.waitForTimeout(500);

  // Open "Assign Parents" dialog
  await page.getByRole('button', { name: 'Assign Parents' }).click();

  // Select Team in the dialog (shadcn Select)
  await page.getByText('Choose a team...').click();
  // Scope to the dropdown content to avoid header matches
  const listbox = page.locator('[role="listbox"]').last();
  await expect(listbox).toBeVisible();
  await listbox.getByText(teamName, { exact: true }).click();

  // Select the target parent (Kevin Houston) from the list — click within the dialog to avoid background matches
  const dialog = page.getByRole('dialog', { name: 'Assign Parents to Team' });
  await expect(dialog).toBeVisible();
  const parentRow = dialog.locator('div', { hasText: targetParentName }).first();
  // Click the checkbox inside the row explicitly
  await parentRow.locator('[role="checkbox"], button[role="checkbox"]').first().click();

  // Submit assignment
  await dialog.getByRole('button', { name: 'Assign to Team' }).click();

  // Wait a moment for in-place refresh toast + fetchData
  await page.waitForTimeout(800);

  // Verify team group appears and contains the parent; counts updated
  const teamHeading = await expandGroupByName(teamName);
  const teamCountAfterAssign = await getGroupCount(teamName);
  const unassignedAfterAssign = await getGroupCount(unassignedName);

  // Scope assertions to the team group that has this heading
  const teamGroup = page.locator('div', { has: page.getByRole('heading', { name: new RegExp(`^${teamName}\\s*\\(`) }) }).first();
  await expect(teamGroup.getByText(targetParentName, { exact: true })).toBeVisible();
  expect(teamCountAfterAssign).toBeGreaterThanOrEqual(1);
  expect(unassignedAfterAssign).toBeGreaterThanOrEqual(Math.max(0, unassignedBefore - 1));

  // Click "Remove from Team" for this parent within the team section
  const teamRow = teamGroup.locator('div', { hasText: targetParentName }).first();
  await teamRow.getByRole('button', { name: /Remove from Team/ }).click();

  // Allow in-place refresh
  await page.waitForTimeout(800);

  // Verify moved to Unassigned and no longer in team group
  const teamCountAfterUnassign = await getGroupCount(teamName);
  const unassignedAfterUnassign = await getGroupCount(unassignedName);

  // Expand Unassigned to verify presence
  await expandGroupByName(unassignedName);
  const unassignedGroupNow = page.locator('div', { has: page.getByRole('heading', { name: new RegExp(`^${unassignedName}\\s*\\(`) }) }).first();
  await expect(unassignedGroupNow.getByText(targetParentName, { exact: true })).toBeVisible();

  expect(teamCountAfterUnassign).toBeLessThanOrEqual(teamCountAfterAssign - 1);
  expect(unassignedAfterUnassign).toBeGreaterThanOrEqual(unassignedAfterAssign + 1);

  // Persistence: reload and re-verify
  await page.reload();
  await expect(page.getByRole('heading', { name: new RegExp(`^${unassignedName}\\s*\\(`) })).toBeVisible();
  await expandGroupByName(unassignedName);
  // Scoped to Unassigned group
  const unassignedGroup = page.locator('div', { has: page.getByRole('heading', { name: new RegExp(`^${unassignedName}\\s*\\(`) }) }).first();
  await expect(unassignedGroup.getByText(targetParentName, { exact: true })).toBeVisible();
  // Team section should not contain the parent anymore; it may disappear entirely when empty
  const teamHeadingCount = await page.getByRole('heading', { name: new RegExp(`^${teamName}\\s*\\(`) }).count();
  if (teamHeadingCount > 0) {
    await expandGroupByName(teamName);
    const teamGroupAfter = page.locator('div', { has: page.getByRole('heading', { name: new RegExp(`^${teamName}\\s*\\(`) }) }).first();
    await expect(teamGroupAfter.getByText(targetParentName, { exact: true })).toHaveCount(0);
  }
});

