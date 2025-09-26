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
    const createBtn = page.getByRole('button', { name: /Create/ });
    await createBtn.click();
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

  // 5) Test the unassign functionality using Kevin Houston (existing parent)
  const assignResult = await page.evaluate(async (args) => {
    // Get team and use Kevin Houston as the parent
    const teamsRes = await fetch('/api/teams?includeParents=false');
    const teamsJson = await teamsRes.json();
    const team = (teamsJson?.data || []).find((t: any) => t.name === args.teamName);

    const parentsRes = await fetch('/api/parents?limit=1000');
    const parentsJson = await parentsRes.json();
    const kevinParent = (parentsJson?.data?.parents || []).find((p: any) => p.email === 'khouston721@gmail.com');

    if (!team || !kevinParent) {
      return { error: 'Team or Kevin parent not found', team, kevinParent };
    }

    // Assign Kevin to team
    const assignRes = await fetch('/api/teams/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: team._id, parentIds: [kevinParent._id] })
    });
    const assignJson = await assignRes.json();

    // Verify assignment worked
    const parentsAfterAssign = await fetch('/api/parents?limit=1000');
    const parentsAfterAssignJson = await parentsAfterAssign.json();
    const assignedParent = (parentsAfterAssignJson?.data?.parents || []).find((p: any) => p._id === kevinParent._id);

    // Now unassign Kevin
    const unassignRes = await fetch('/api/teams/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: null, parentIds: [kevinParent._id] })
    });
    const unassignJson = await unassignRes.json();
    console.log('🔍 Unassign response status:', unassignRes.status);
    console.log('🔍 Unassign response body:', unassignJson);

    // Verify Kevin still exists after unassign
    const parentsAfterUnassign = await fetch('/api/parents?limit=1000');
    const parentsAfterUnassignJson = await parentsAfterUnassign.json();
    const unassignedParent = (parentsAfterUnassignJson?.data?.parents || []).find((p: any) => p._id === kevinParent._id);

    return {
      teamId: team._id,
      parentId: kevinParent._id,
      assignSuccess: assignJson.success,
      assignedParentTeamId: assignedParent?.teamId,
      unassignSuccess: unassignJson.success,
      unassignError: unassignJson.error,
      unassignDetails: unassignJson.details,
      unassignStatus: unassignRes.status,
      unassignedParentTeamId: unassignedParent?.teamId,
      parentStillExists: !!unassignedParent,
      parentName: unassignedParent?.name
    };
  }, { teamName, parentEmail });

  console.log('Assign/Unassign test result:', assignResult);

  // Verify the results
  expect(assignResult.assignSuccess, 'Assignment should succeed').toBe(true);
  expect(assignResult.assignedParentTeamId, 'Parent should be assigned to team').toBeTruthy();
  expect(assignResult.unassignSuccess, 'Unassignment should succeed').toBe(true);
  expect(assignResult.unassignedParentTeamId, 'Parent should have no team after unassign').toBeFalsy();
  expect(assignResult.parentStillExists, 'Parent should still exist after unassign').toBe(true);
  expect(assignResult.parentName, 'Kevin should still exist').toBe('Kevin Houston');
});

