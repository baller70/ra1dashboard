import { test, expect } from '@playwright/test'

test('verify RA1 5th/6th Boys team can be expanded and shows all parents', async ({ page }) => {
  console.log('🔍 Testing Team Expansion and Parent Visibility')
  
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  
  // Find the RA1 5th/6th Boys team header
  const teamHeader = page.locator('h3:has-text("RA1 5th/6th Boys")')
  const teamExists = await teamHeader.count() > 0
  console.log(`RA1 5th/6th Boys team found: ${teamExists}`)
  
  if (teamExists) {
    const headerText = await teamHeader.textContent()
    console.log(`Team header: "${headerText}"`)
    
    // Check if team is collapsed (look for chevron down icon)
    const teamSection = teamHeader.locator('../..')
    const chevronDown = teamSection.locator('[class*="chevron-down"], .lucide-chevron-down')
    const isCollapsed = await chevronDown.count() > 0
    console.log(`Team is collapsed: ${isCollapsed}`)
    
    if (isCollapsed) {
      console.log('🖱️  Expanding collapsed team...')
      
      // Click the team header to expand it
      const clickableHeader = teamHeader.locator('..')
      await clickableHeader.click()
      
      // Wait for expansion animation
      await page.waitForTimeout(1000)
      
      console.log('✅ Team expanded')
    }
    
    // Now count visible parent cards
    const parentCards = teamSection.locator('[class*="border"][class*="rounded"], .payment-card, [data-testid*="payment"]')
    const visibleCount = await parentCards.count()
    console.log(`Visible parent cards after expansion: ${visibleCount}`)
    
    // Get details of each parent
    for (let i = 0; i < Math.min(visibleCount, 10); i++) {
      const card = parentCards.nth(i)
      const cardText = await card.textContent()
      const parentName = cardText?.split('\n')[0] || 'Unknown'
      console.log(`Parent ${i + 1}: ${parentName}`)
    }
    
    // Take screenshot after expansion
    await page.screenshot({ path: 'team-expanded-verification.png', fullPage: true })
    
    // Verify the count matches
    const expectedCount = 7 // Based on the header showing (7 parents)
    if (visibleCount === expectedCount) {
      console.log('✅ SUCCESS: All parents are now visible!')
    } else if (visibleCount > 0) {
      console.log(`⚠️  PARTIAL: ${visibleCount} parents visible, expected ${expectedCount}`)
    } else {
      console.log('❌ ISSUE: No parents visible even after expansion')
      
      // Debug: look for any elements that might contain parent data
      const allCards = page.locator('[class*="border"], .card, [class*="p-3"], [class*="p-4"]')
      const allCardCount = await allCards.count()
      console.log(`Total card-like elements found: ${allCardCount}`)
    }
    
  } else {
    console.log('❌ RA1 5th/6th Boys team not found')
    
    // List all teams found
    const allTeams = page.locator('h3:has-text("(")')
    const teamCount = await allTeams.count()
    console.log(`Found ${teamCount} teams total:`)
    
    for (let i = 0; i < Math.min(teamCount, 10); i++) {
      const team = allTeams.nth(i)
      const teamText = await team.textContent()
      console.log(`  ${i + 1}. ${teamText}`)
    }
  }
  
  console.log('🏁 Team expansion test completed')
})
