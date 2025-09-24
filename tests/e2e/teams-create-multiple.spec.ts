import { test, expect } from '@playwright/test'

// Creates two teams via API and verifies both exist; then cleans up
// Run with: npx playwright test tests/e2e/teams-create-multiple.spec.ts

test('Create multiple teams via API: should allow more than one team', async ({ request, baseURL }) => {
  const ts = Date.now()
  const nameA = `E2E Team A ${ts}`
  const nameB = `E2E Team B ${ts}`
  const colorA = '#ff5722'
  const colorB = '#3f51b5'

  // 1) Create first team
  const resA = await request.post(`${baseURL}/api/teams`, {
    data: { name: nameA, description: 'Team A created by e2e', color: colorA },
  })
  expect(resA.status(), 'first POST should succeed').toBe(201)
  const teamA = await resA.json()
  expect(teamA?._id, 'returns created team A id').toBeTruthy()

  // 2) Create second team
  const resB = await request.post(`${baseURL}/api/teams`, {
    data: { name: nameB, description: 'Team B created by e2e', color: colorB },
  })
  expect(resB.status(), 'second POST should also succeed').toBe(201)
  const teamB = await resB.json()
  expect(teamB?._id, 'returns created team B id').toBeTruthy()

  // 3) List teams and assert both present
  const list = await request.get(`${baseURL}/api/teams`)
  expect(list.ok()).toBeTruthy()
  const payload = await list.json()
  // API returns { success: true, data: teams }
  const teams = payload?.data || payload || []
  const names = (Array.isArray(teams) ? teams : []).map((t: any) => t?.name)
  expect(names).toContain(nameA)
  expect(names).toContain(nameB)

  // 4) Cleanup: delete created teams
  if (teamA?._id) {
    await request.delete(`${baseURL}/api/teams?id=${encodeURIComponent(teamA._id)}`)
  }
  if (teamB?._id) {
    await request.delete(`${baseURL}/api/teams?id=${encodeURIComponent(teamB._id)}`)
  }
})

