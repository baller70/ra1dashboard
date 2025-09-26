import { test, expect } from '@playwright/test'

const base = process.env.TEST_BASE || 'https://ra1dashboard.vercel.app'

function uniqueEmail() {
  const ts = Date.now()
  return `e2e.parent+${ts}@example.com`
}

async function openParents(page) {
  await page.goto(`${base}/parents`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: /Parent Management/i })).toBeVisible({ timeout: 15000 })
}

test.describe('Parents CRUD sync', () => {
  test('create appears immediately, delete removes only that record', async ({ page }) => {
    await openParents(page)

    // Create first parent
    await page.getByRole('button', { name: /Add Parent/i }).first().click()
    await page.getByLabel(/Full Name/i).fill('E2E First Parent')
    const email1 = uniqueEmail()
    await page.getByLabel(/Email Address/i).fill(email1)
    await page.keyboard.press('Enter')

    // Expect immediate appearance in list
    await expect(page.getByText('E2E First Parent')).toBeVisible({ timeout: 10000 })

    // Create second parent
    await page.getByRole('button', { name: /Add Parent/i }).first().click()
    await page.getByLabel(/Full Name/i).fill('E2E Second Parent')
    const email2 = uniqueEmail()
    await page.getByLabel(/Email Address/i).fill(email2)
    await page.keyboard.press('Enter')

    await expect(page.getByText('E2E Second Parent')).toBeVisible({ timeout: 10000 })

    // Delete only second parent (target by card area)
    const secondCard = page.locator('div').filter({ hasText: 'E2E Second Parent' }).first()
    page.once('dialog', dialog => dialog.accept())
    await secondCard.getByTitle(/Delete this parent/i).click()
    await expect(page.getByText('E2E Second Parent')).toHaveCount(0, { timeout: 10000 })
    // First parent should remain visible
    await expect(page.getByText('E2E First Parent')).toBeVisible()

    // Cleanup: delete first parent
    const firstCard = page.locator('div').filter({ hasText: 'E2E First Parent' }).first()
    page.once('dialog', dialog => dialog.accept())
    await firstCard.getByTitle(/Delete this parent/i).click()
    await expect(page.getByText('E2E First Parent')).toHaveCount(0, { timeout: 10000 })
  })
})

