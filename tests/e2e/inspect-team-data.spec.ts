import { test, expect } from '@playwright/test'

test('inspect actual team data and rendering', async ({ page }) => {
  console.log('🔍 Inspecting Team Data and Rendering')
  
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  
  // Inject JavaScript to inspect the React state and data
  const teamData = await page.evaluate(() => {
    // Try to access React DevTools or component state
    const reactRoot = document.querySelector('#__next') || document.querySelector('[data-reactroot]')
    
    // Look for any data attributes or global variables
    const result = {
      allParentsData: (window as any).allParentsData || null,
      teamsData: (window as any).teamsData || null,
      paymentsData: (window as any).paymentsData || null,
      groupedPayments: (window as any).groupedPayments || null
    }
    
    // Also check for any React Fiber data
    try {
      const fiber = (reactRoot as any)?._reactInternalFiber || (reactRoot as any)?._reactInternalInstance
      if (fiber) {
        result.fiberFound = true
      }
    } catch (e) {
      result.fiberError = e.message
    }
    
    return result
  })
  
  console.log('Global data inspection:', JSON.stringify(teamData, null, 2))
  
  // Look for the specific team section and inspect its HTML
  const teamSection = page.locator('h3:has-text("RA1 5th/6th Boys")').locator('../..')
  const teamHTML = await teamSection.innerHTML()
  console.log('Team section HTML length:', teamHTML.length)
  
  // Look for CollapsibleContent specifically
  const collapsibleContent = teamSection.locator('[data-state="open"], [data-state="closed"], .collapsible-content')
  const collapsibleCount = await collapsibleContent.count()
  console.log(`Collapsible content elements: ${collapsibleCount}`)
  
  if (collapsibleCount > 0) {
    for (let i = 0; i < collapsibleCount; i++) {
      const element = collapsibleContent.nth(i)
      const state = await element.getAttribute('data-state')
      const isVisible = await element.isVisible()
      console.log(`Collapsible ${i + 1}: state="${state}", visible=${isVisible}`)
    }
  }
  
  // Look for any elements with parent names or emails
  const textElements = teamSection.locator('*').filter({ hasText: /@|\.com|Parent|parent/ })
  const textCount = await textElements.count()
  console.log(`Elements with parent-like text: ${textCount}`)
  
  for (let i = 0; i < Math.min(textCount, 10); i++) {
    const element = textElements.nth(i)
    const text = await element.textContent()
    const isVisible = await element.isVisible()
    console.log(`Text element ${i + 1}: "${text?.substring(0, 50)}..." visible=${isVisible}`)
  }
  
  // Check network requests to see if data is being fetched
  const responses = await page.evaluate(() => {
    return {
      fetchCalls: (window as any).fetchCalls || [],
      apiCalls: (window as any).apiCalls || []
    }
  })
  
  console.log('Network data:', JSON.stringify(responses, null, 2))
  
  // Try to trigger a data refresh
  console.log('🔄 Attempting to trigger data refresh...')
  const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Reload"), [aria-label*="refresh"]')
  const refreshCount = await refreshButton.count()
  
  if (refreshCount > 0) {
    await refreshButton.first().click()
    await page.waitForTimeout(3000)
    
    // Recheck parent count after refresh
    const newParentCards = teamSection.locator('[class*="border"][class*="rounded"]')
    const newCount = await newParentCards.count()
    console.log(`Parent cards after refresh: ${newCount}`)
  }
  
  // Check if there are any hidden elements
  const hiddenElements = teamSection.locator('[style*="display: none"], [hidden], .hidden')
  const hiddenCount = await hiddenElements.count()
  console.log(`Hidden elements in team section: ${hiddenCount}`)
  
  // Final screenshot with browser dev tools open
  await page.screenshot({ path: 'team-data-inspection.png', fullPage: true })
  
  console.log('🏁 Team data inspection completed')
})
