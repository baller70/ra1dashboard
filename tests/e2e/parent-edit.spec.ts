import { test, expect } from '@playwright/test'

const PARENT_ID = 'j971g9n5ve0qqsby21a0k9n1js7n7tbx'
const PREVIEW_BASE = process.env.PREVIEW_BASE || 'https://ra1dashboard-1sy4fvjt5-kevin-houstons-projects.vercel.app'

// Runs in headed mode if you pass --headed to Playwright CLI

test('edit parent address via edit page and verify on profile, then revert', async ({ page }) => {
  const editUrl = `${PREVIEW_BASE}/parents/${PARENT_ID}/edit`
  await page.goto(editUrl, { waitUntil: 'networkidle' })

  // Wait for form to load
  await page.getByLabel('Full Name *').waitFor()

  // Capture original address
  const addressInput = page.locator('#address')
  const originalAddress = (await addressInput.inputValue()) || ''
  const newAddress = originalAddress === 'Test Address 123' ? 'Test Address 456' : 'Test Address 123'

  // Update address
  await addressInput.fill(newAddress)
  await page.getByRole('button', { name: 'Save Changes' }).click()

  // Expect redirect back to profile
  await page.waitForURL(new RegExp(`/parents/${PARENT_ID}`))

  // Verify address is visible on profile
  await expect(page.getByText(newAddress)).toBeVisible({ timeout: 10000 })

  // Revert to original
  await page.goto(editUrl, { waitUntil: 'networkidle' })
  await page.getByLabel('Full Name *').waitFor()
  await addressInput.fill(originalAddress)
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await page.waitForURL(new RegExp(`/parents/${PARENT_ID}`))
  if (originalAddress) {
    await expect(page.getByText(originalAddress)).toBeVisible({ timeout: 10000 })
  }
})

