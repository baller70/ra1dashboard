import { test, expect } from '@playwright/test'

test('debug team count issue for RA1 5th/6th Boys', async ({ page }) => {
  console.log('🔍 Debugging Team Count Issue')
  
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  
  // Take screenshot of payments page
  await page.screenshot({ path: 'team-count-debug-payments.png', fullPage: true })
  
  // Look for the RA1 5th/6th Boys team
  const teamHeaders = page.locator('h3:has-text("RA1 5th/6th Boys")')
  const teamCount = await teamHeaders.count()
  console.log(`Found ${teamCount} RA1 5th/6th Boys team headers`)
  
  if (teamCount > 0) {
    const teamHeader = teamHeaders.first()
    const headerText = await teamHeader.textContent()
    console.log(`Team header text: "${headerText}"`)
    
    // Extract the count from the header (should be in parentheses)
    const countMatch = headerText?.match(/\((\d+)\s+parent/)
    if (countMatch) {
      const displayedCount = parseInt(countMatch[1])
      console.log(`Displayed count: ${displayedCount}`)
    }
    
    // Count actual visible parent cards under this team
    const teamSection = teamHeader.locator('..').locator('..')
    const parentCards = teamSection.locator('[data-testid="payment-card"], .border.rounded, .p-3.border')
    const actualVisibleCount = await parentCards.count()
    console.log(`Actual visible parent cards: ${actualVisibleCount}`)
    
    // Get details of each visible parent
    for (let i = 0; i < actualVisibleCount; i++) {
      const card = parentCards.nth(i)
      const cardText = await card.textContent()
      console.log(`Parent ${i + 1}: ${cardText?.substring(0, 100)}...`)
    }
    
    // Check if there are any hidden or collapsed sections
    const collapsedSections = page.locator('[data-testid*="collapsed"], .collapsed, [aria-expanded="false"]')
    const collapsedCount = await collapsedSections.count()
    console.log(`Found ${collapsedCount} potentially collapsed sections`)
    
  } else {
    console.log('RA1 5th/6th Boys team not found')
    
    // List all team headers found
    const allTeamHeaders = page.locator('h3:has-text("(")')
    const allTeamCount = await allTeamHeaders.count()
    console.log(`Found ${allTeamCount} total team headers`)
    
    for (let i = 0; i < Math.min(allTeamCount, 10); i++) {
      const header = allTeamHeaders.nth(i)
      const text = await header.textContent()
      console.log(`Team ${i + 1}: ${text}`)
    }
  }
  
  // Also check the parents page to see team assignments
  await page.goto('https://ra1dashboard.vercel.app/parents')
  await page.waitForLoadState('networkidle')
  
  await page.screenshot({ path: 'team-count-debug-parents.png', fullPage: true })
  
  // Look for RA1 5th/6th Boys parents
  const parentRows = page.locator('tr, .parent-row, [data-testid*="parent"]')
  const parentCount = await parentRows.count()
  console.log(`Found ${parentCount} parent rows on parents page`)
  
  // Count parents assigned to RA1 5th/6th Boys
  let ra1ParentCount = 0
  for (let i = 0; i < Math.min(parentCount, 50); i++) {
    const row = parentRows.nth(i)
    const rowText = await row.textContent()
    if (rowText?.includes('RA1 5th/6th Boys')) {
      ra1ParentCount++
      console.log(`RA1 Parent ${ra1ParentCount}: ${rowText?.substring(0, 100)}...`)
    }
  }
  
  console.log(`Total RA1 5th/6th Boys parents found on parents page: ${ra1ParentCount}`)
  
  console.log('🏁 Team count debug completed')
})
