import { test, expect } from '@playwright/test'

test('take screenshot of current payments page', async ({ page }) => {
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'current-payments-page.png', fullPage: true })
  
  // Also check parents page
  await page.goto('https://ra1dashboard.vercel.app/parents')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'current-parents-page.png', fullPage: true })
  
  // Check if there are any parent profiles to view
  const parentLinks = page.locator('a[href*="/parents/"]')
  const count = await parentLinks.count()
  console.log(`Found ${count} parent links`)
  
  if (count > 0) {
    await parentLinks.first().click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'current-parent-profile.png', fullPage: true })
  }
})
