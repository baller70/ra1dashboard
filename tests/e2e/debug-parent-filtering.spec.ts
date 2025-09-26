import { test, expect } from '@playwright/test'

test('debug why only 1 parent shows instead of 7 for RA1 5th/6th Boys', async ({ page }) => {
  console.log('🔍 Debugging Parent Filtering Issue')
  
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  
  // Check if there are any active filters
  console.log('📋 Checking for active filters...')
  
  // Look for search input
  const searchInput = page.locator('input[placeholder*="search"], input[type="search"], input[name*="search"]')
  const searchCount = await searchInput.count()
  if (searchCount > 0) {
    const searchValue = await searchInput.first().inputValue()
    console.log(`Search filter: "${searchValue}"`)
    
    if (searchValue) {
      console.log('🧹 Clearing search filter...')
      await searchInput.first().clear()
      await page.waitForTimeout(1000)
    }
  }
  
  // Look for status filter dropdown
  const statusFilters = page.locator('select:has(option:text("All")), select:has(option:text("Paid")), select:has(option:text("Pending"))')
  const statusFilterCount = await statusFilters.count()
  if (statusFilterCount > 0) {
    const statusValue = await statusFilters.first().inputValue()
    console.log(`Status filter: "${statusValue}"`)
    
    if (statusValue !== 'all') {
      console.log('🧹 Setting status filter to "All"...')
      await statusFilters.first().selectOption('all')
      await page.waitForTimeout(1000)
    }
  }
  
  // Look for team filter dropdown
  const teamFilters = page.locator('select:has(option:text("All Teams")), select[name*="team"]')
  const teamFilterCount = await teamFilters.count()
  if (teamFilterCount > 0) {
    const teamValue = await teamFilters.first().inputValue()
    console.log(`Team filter: "${teamValue}"`)
    
    if (teamValue !== 'all') {
      console.log('🧹 Setting team filter to "All"...')
      await teamFilters.first().selectOption('all')
      await page.waitForTimeout(1000)
    }
  }
  
  // Now recheck the RA1 5th/6th Boys team
  const teamHeader = page.locator('h3:has-text("RA1 5th/6th Boys")')
  const headerText = await teamHeader.textContent()
  console.log(`Team header after clearing filters: "${headerText}"`)
  
  // Count parent cards again
  const teamSection = teamHeader.locator('../..')
  const parentCards = teamSection.locator('[class*="border"][class*="rounded"], .payment-card, [data-testid*="payment"]')
  const visibleCount = await parentCards.count()
  console.log(`Visible parent cards after clearing filters: ${visibleCount}`)
  
  // If still only 1, let's look at the HTML structure
  if (visibleCount <= 1) {
    console.log('🔍 Investigating HTML structure...')
    
    // Look for any elements that might contain parent data within the team section
    const allElements = teamSection.locator('*')
    const elementCount = await allElements.count()
    console.log(`Total elements in team section: ${elementCount}`)
    
    // Look for specific patterns that might indicate parent entries
    const possibleParents = teamSection.locator('div:has-text("@"), div:has-text(".com"), div:has-text("$"), div:has-text("Payment")')
    const possibleCount = await possibleParents.count()
    console.log(`Elements with parent-like content: ${possibleCount}`)
    
    // Check if there are mock entries or no-payment entries
    const mockEntries = teamSection.locator('[class*="mock"], [data-testid*="mock"], div:has-text("no payment"), div:has-text("No payment")')
    const mockCount = await mockEntries.count()
    console.log(`Mock/no-payment entries: ${mockCount}`)
    
    // Look for any error messages or loading states
    const errorMessages = page.locator('div:has-text("error"), div:has-text("Error"), div:has-text("loading"), div:has-text("Loading")')
    const errorCount = await errorMessages.count()
    if (errorCount > 0) {
      console.log(`Found ${errorCount} error/loading messages`)
      for (let i = 0; i < Math.min(errorCount, 3); i++) {
        const msg = await errorMessages.nth(i).textContent()
        console.log(`  Error/Loading ${i + 1}: ${msg}`)
      }
    }
  }
  
  // Take final screenshot
  await page.screenshot({ path: 'parent-filtering-debug.png', fullPage: true })
  
  // Also check the browser console for any JavaScript errors
  const logs = await page.evaluate(() => {
    return window.console.logs || []
  })
  
  if (logs && logs.length > 0) {
    console.log('Browser console logs:')
    logs.forEach((log, i) => console.log(`  ${i + 1}. ${log}`))
  }
  
  console.log('🏁 Parent filtering debug completed')
})
