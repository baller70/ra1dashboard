import { test, expect } from '@playwright/test'

// Base URL provided via env var
const BASE = process.env.TEST_BASE || 'http://localhost:3000'

function uniqueEmail() {
  const ts = Date.now().toString().slice(-8)
  return `e2e.parent.${ts}@example.com`
}

function uniqueName() {
  const ts = Date.now().toString().slice(-6)
  return `E2E Parent ${ts}`
}

test.describe('Payments: Add Parent shows immediately and can be deleted', () => {
  test('create parent -> appears immediately in Unassigned -> delete it', async ({ page }) => {
    test.setTimeout(120_000)
    const name = uniqueName()
    const email = uniqueEmail()

    // Navigate to Payments page
    await page.goto(`${BASE}/payments`, { waitUntil: 'domcontentloaded' })

    // Open Create Parent modal
    await page.getByRole('button', { name: /Create Parent/i }).click()

    // Fill form
    await page.getByLabel(/Full Name/i).fill(name)
    await page.getByLabel(/Email Address/i).fill(email)

    // Submit
    await page.getByRole('button', { name: /Add Parent/i }).click()

    // Wait for the modal to close, then the new parent should appear promptly
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 })

    // Look for the new parent name anywhere on the page
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 })

    // Cleanup: click the delete button near this parent on Payments page
    // Scope to a container that contains the parent's name, then click the delete button (title contains 'Delete entire parent')
    const parentRow = page.locator('div', { hasText: name }).first()
    const deleteBtn = parentRow.locator('button[title*="Delete entire parent"]').first()

    // Confirm browser confirm dialog (must be set before click)
    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })
    await deleteBtn.click()

    // Verify the name disappears (parent removed from UI)
    await expect(page.getByText(name)).toHaveCount(0)
  })
})

