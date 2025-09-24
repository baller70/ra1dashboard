import { test, expect } from '@playwright/test';

/**
 * E2E: Bulk delete multiple teams; parents in those teams move to Unassigned.
 * Uses existing parent "Kevin Houston". Creates two teams, assigns Kevin to Team A,
 * selects both teams, bulk deletes, verifies Kevin appears under Unassigned and
 * both team headings are gone. Verifies persistence after reload.
 */

test('Payments: bulk delete teams moves parents to Unassigned and removes team sections', async ({ page }) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? '';
  const paymentsURL = process.env.PLAYWRIGHT_PAYMENTS_URL ?? (baseURL ? `${baseURL}/payments` : '/payments');
  const ts = Date.now();
  const teamA = `E2E Bulk A ${ts}`;
  const teamB = `E2E Bulk B ${ts}`;
  const targetParentName = 'Kevin Houston';

  // Helpers
  const ensureGroupByTeam = async () => {
    const groupByCheckbox = page.locator('#groupByTeam');
    if (!(await groupByCheckbox.isChecked())) {
      await page.getByText('Group by Team', { exact: true }).click();
      await expect(groupByCheckbox).toBeChecked();
    }
  };

  const createTeam = async (name: string) => {
    await page.getByRole('button', { name: 'New Team' }).click();
    await page.getByLabel('Team Name').fill(name);
    await page.getByLabel('Description (Optional)').fill('Created by Playwright');
    await page.locator('#teamColor').fill('#f97316');
    const createBtn = page.getByRole('button', { name: /Create/ });
    await createBtn.click();
    await expect(page.getByRole('button', { name: 'New Team' })).toBeVisible();
    await page.waitForTimeout(500);
  };

  const getHeadingCount = async (name: string) => {
    return page.getByRole('heading', { name: new RegExp(`^${name}\\s*\\(`) }).count();
  };

  const expandGroup = async (name: string) => {
    const heading = page.getByRole('heading', { name: new RegExp(`^${name}\\s*\\(`) });
    const exists = await heading.count();
    if (exists > 0) {
      await heading.first().scrollIntoViewIfNeeded();
      // Toggle twice to ensure open
      await heading.first().click();
      await heading.first().click();
    }
  };

  // Go to Payments
  await page.goto(paymentsURL);
  await ensureGroupByTeam();

  // Create Team A and Team B
  await createTeam(teamA);
  await createTeam(teamB);

  // Assign Kevin to Team A via Assign Parents dialog
  await page.getByRole('button', { name: 'Assign Parents' }).click();
  await page.getByText('Choose a team...').click();
  const listbox = page.locator('[role="listbox"]').last();
  await expect(listbox).toBeVisible();
  await listbox.getByText(teamA, { exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Assign Parents to Team' });
  await expect(dialog).toBeVisible();
  const parentRow = dialog.locator('div', { hasText: targetParentName }).first();
  await parentRow.locator('[role="checkbox"], button[role="checkbox"]').first().click();
  await dialog.getByRole('button', { name: 'Assign to Team' }).click();
  await page.waitForTimeout(800);

  // Select both teams via Manage Teams dialog
  await page.getByRole('button', { name: 'Manage Teams' }).click();
  const manageDialog = page.getByRole('dialog', { name: 'Manage Teams' });
  await expect(manageDialog).toBeVisible();
  await manageDialog.getByText(teamA, { exact: true }).locator('..').locator('[role="checkbox"], button[role="checkbox"]').first().click();
  await manageDialog.getByText(teamB, { exact: true }).locator('..').locator('[role="checkbox"], button[role="checkbox"]').first().click();

  // Trigger delete from within the dialog (built-in confirm dialog is handled internally in code)
  await manageDialog.getByRole('button', { name: /Delete Selected Teams/ }).click();

  // Dialog should close after deletion
  await expect(manageDialog).toBeHidden();

  // Verify team sections are removed (may take a moment)
  await page.waitForTimeout(800);
  expect(await getHeadingCount(teamA)).toBeLessThanOrEqual(0);
  expect(await getHeadingCount(teamB)).toBeLessThanOrEqual(0);

  // Verify Kevin is under Unassigned
  await expandGroup('Unassigned');
  const unassignedGroup = page.locator('div', { has: page.getByRole('heading', { name: /^Unassigned\s*\(/ }) }).first();
  await expect(unassignedGroup.getByText(targetParentName, { exact: true })).toBeVisible();

  // Persistence after reload
  await page.reload();
  await expect(page.getByRole('heading', { name: /^Unassigned\s*\(/ })).toBeVisible();
  const teamAAfter = await getHeadingCount(teamA);
  const teamBAfter = await getHeadingCount(teamB);
  expect(teamAAfter).toBe(0);
  expect(teamBAfter).toBe(0);
  await expandGroup('Unassigned');
  const unassignedAfter = page.locator('div', { has: page.getByRole('heading', { name: /^Unassigned\s*\(/ }) }).first();
  await expect(unassignedAfter.getByText(targetParentName, { exact: true })).toBeVisible();
});

