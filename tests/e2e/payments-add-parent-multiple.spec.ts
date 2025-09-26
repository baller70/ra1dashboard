import { test, expect } from '@playwright/test'

const BASE = process.env.TEST_BASE || 'http://localhost:3000'

function uniqueEmail(suffix: string) {
  const ts = Date.now().toString().slice(-8)
  return `e2e.parent.${suffix}.${ts}@example.com`
}

function uniqueName(suffix: string) {
  const ts = Date.now().toString().slice(-6)
  return `E2E Parent ${suffix} ${ts}`
}

async function createParent(page, name: string, email: string) {
  await page.getByRole('button', { name: /Create Parent/i }).click()
  await page.getByLabel(/Full Name/i).fill(name)
  await page.getByLabel(/Email Address/i).fill(email)
  await page.getByRole('button', { name: /Add Parent/i }).click()
  // Wait for modal to close
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 })
  // Confirm the parent becomes visible
  await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 })
}

async function deleteParent(page, name: string) {
  const row = page.locator('div', { hasText: name }).first()
  const delBtn = row.locator('button[title*="Delete entire parent"]').first()
  page.once('dialog', async (d) => { await d.accept() })
  await delBtn.click()
  await expect(page.getByText(name)).toHaveCount(0)
}

test.describe('Payments: Multiple parent creations appear immediately', () => {
  test('create two parents back-to-back; both visible; cleanup', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto(`${BASE}/payments`, { waitUntil: 'domcontentloaded' })

    const name1 = uniqueName('A')
    const email1 = uniqueEmail('a')
    const name2 = uniqueName('B')
    const email2 = uniqueEmail('b')

    await createParent(page, name1, email1)
    await createParent(page, name2, email2)

    // Verify both visible concurrently
    await expect(page.getByText(name1, { exact: true })).toBeVisible()
    await expect(page.getByText(name2, { exact: true })).toBeVisible()

    // Cleanup (best-effort; do not fail the test if deletion UI is not reachable)
    try { await deleteParent(page, name2) } catch {}
    try { await deleteParent(page, name1) } catch {}
  })
})

