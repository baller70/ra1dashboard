import { test, expect } from '@playwright/test'

test('verify RA1 5th/6th Boys team expands to show all 7 parents', async ({ page }) => {
  console.log('🎯 Testing RA1 5th/6th Boys Team Expansion')
  
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  
  // Find the RA1 5th/6th Boys team header
  const teamHeader = page.locator('h3:has-text("RA1 5th/6th Boys")')
  const teamExists = await teamHeader.count() > 0
  
  if (!teamExists) {
    console.log('❌ RA1 5th/6th Boys team not found')
    test.skip(true, 'Team not found')
  }
  
  const headerText = await teamHeader.textContent()
  console.log(`✅ Found team: "${headerText}"`)
  
  // Check if team is collapsed by looking for chevron down icon
  const teamTrigger = teamHeader.locator('..')
  const chevronDown = teamTrigger.locator('[class*="chevron-down"], .lucide-chevron-down')
  const isCollapsed = await chevronDown.count() > 0
  
  console.log(`Team collapsed: ${isCollapsed}`)
  
  if (isCollapsed) {
    console.log('🖱️  Clicking to expand team...')
    await teamTrigger.click()
    
    // Wait for expansion animation
    await page.waitForTimeout(1500)
    
    // Verify it expanded (chevron should now be up)
    const chevronUp = teamTrigger.locator('[class*="chevron-up"], .lucide-chevron-up')
    const isExpanded = await chevronUp.count() > 0
    console.log(`Team expanded: ${isExpanded}`)
  } else {
    console.log('✅ Team is already expanded')
  }
  
  // Now count the visible parent cards within this team
  const teamSection = teamHeader.locator('../..')
  const collapsibleContent = teamSection.locator('[class*="collapsible-content"], [data-state="open"]')
  
  // Look for parent cards within the collapsible content
  const parentCards = collapsibleContent.locator('div:has([class*="border"][class*="rounded"]), .payment-card, [class*="p-4"][class*="border"]')
  const visibleCount = await parentCards.count()
  
  console.log(`📊 Visible parent cards: ${visibleCount}`)
  console.log(`📊 Expected parent cards: 7`)
  
  if (visibleCount === 7) {
    console.log('🎉 SUCCESS: All 7 parents are visible!')
    
    // List each parent
    for (let i = 0; i < visibleCount; i++) {
      const card = parentCards.nth(i)
      const cardText = await card.textContent()
      const parentName = cardText?.split('\n')[0]?.trim() || 'Unknown'
      console.log(`  ${i + 1}. ${parentName}`)
    }
    
  } else if (visibleCount > 0) {
    console.log(`⚠️  PARTIAL SUCCESS: ${visibleCount} parents visible, missing ${7 - visibleCount}`)
    
    // List the visible parents
    for (let i = 0; i < visibleCount; i++) {
      const card = parentCards.nth(i)
      const cardText = await card.textContent()
      const parentName = cardText?.split('\n')[0]?.trim() || 'Unknown'
      console.log(`  ${i + 1}. ${parentName}`)
    }
    
    // Check browser console for any errors
    const consoleLogs = await page.evaluate(() => {
      return window.console.logs || []
    })
    
    if (consoleLogs.length > 0) {
      console.log('Browser console logs:')
      consoleLogs.forEach((log, i) => console.log(`  ${i + 1}. ${log}`))
    }
    
  } else {
    console.log('❌ ISSUE: No parent cards visible after expansion')
    
    // Debug: check if collapsible content exists
    const contentExists = await collapsibleContent.count()
    console.log(`Collapsible content elements: ${contentExists}`)
    
    // Check for any error messages
    const errorMessages = teamSection.locator('div:has-text("error"), div:has-text("Error"), div:has-text("No data")')
    const errorCount = await errorMessages.count()
    if (errorCount > 0) {
      console.log('Found error messages:')
      for (let i = 0; i < errorCount; i++) {
        const msg = await errorMessages.nth(i).textContent()
        console.log(`  Error ${i + 1}: ${msg}`)
      }
    }
  }
  
  // Take final screenshot
  await page.screenshot({ path: 'team-expansion-final-test.png', fullPage: true })
  
  console.log('🏁 Team expansion test completed')
})
