import { test, expect, Page } from '@playwright/test'

const BASE = process.env.TEST_BASE || 'http://localhost:3000'

async function getUnassignedHeader(page: Page) {
  return page.locator('[data-testid="unassigned-header"]').first()
}

async function getUnassignedCount(page: Page): Promise<number> {
  const header = await getUnassignedHeader(page)
  await expect(header).toBeVisible()
  const countText = (await page.locator('[data-testid="unassigned-count"]').first().textContent()) || ''
  return parseInt(countText.trim(), 10)
}

async function openUnassignedIfCollapsed(page: Page) {
  const header = await getUnassignedHeader(page)
  // Toggle once to ensure open
  await header.click({ timeout: 5000 })
  // If still no delete buttons, toggle again
  const maybeButtons = page.locator('button[title*="Delete entire parent"]')
  const btnCount = await maybeButtons.count()
  if (btnCount === 0) {
    await header.click({ timeout: 5000 })
  }
}

test.describe('Payments: Unassigned delete updates count and removes row immediately', () => {
  test('delete one parent from Unassigned -> count decrements and row disappears', async ({ page }) => {
    test.setTimeout(240_000)
    await page.goto(`${BASE}/payments`, { waitUntil: 'domcontentloaded' })

    // Filter to Unassigned only to avoid cross-group selector ambiguity
    await page.selectOption('select', 'unassigned')
    // Ensure Unassigned section is visible/open
    await openUnassignedIfCollapsed(page)

    // Read initial count (user screenshot suggested 14, but we assert dynamic)
    const initialCount = await getUnassignedCount(page)
    expect(initialCount).toBeGreaterThanOrEqual(1)

    // Scope precisely to the Unassigned group by anchoring on its header and nearest container
    const headerInBlock = await getUnassignedHeader(page)
    const initialBlockCount = await getUnassignedCount(page)

    const firstDeleteBtn = page.locator('button[title*="Delete entire parent"]').first()
    await expect(firstDeleteBtn).toBeVisible()

    // Accept the confirm dialog BEFORE clicking
    page.once('dialog', async d => { await d.accept() })
    await firstDeleteBtn.click()

    // The rows should shrink immediately (one fewer delete button inside the Unassigned block)
    const deleteButtonsBefore = await page.locator('button[title*="Delete entire parent"]').count()
    await expect.poll(async () => await page.locator('button[title*="Delete entire parent"]').count(), { timeout: 15_000 }).toBe(deleteButtonsBefore - 1)

    // Recompute count from the same block header to avoid selecting a different header instance
    const afterBlockCount = await getUnassignedCount(page)

    expect(afterBlockCount).toBe(initialBlockCount - 1)
  })
})

