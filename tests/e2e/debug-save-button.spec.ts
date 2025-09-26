import { test, expect } from '@playwright/test'

test('debug save button after payment method selection', async ({ page }) => {
  console.log('🔍 Debugging Save Button Issue')
  
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  
  // Click first Credit Card badge
  const creditCardBadge = page.locator('text="Credit Card"').first()
  await creditCardBadge.click()
  await page.waitForTimeout(1500)
  
  // Select Check option
  const dropdown = page.locator('select').first()
  await dropdown.click()
  const checkOption = page.locator('option[value="check"]').first()
  await checkOption.click()
  
  console.log('✅ Selected Check option, now looking for save button...')
  
  // Try many different selectors for save button
  const saveButtonSelectors = [
    'button:has([class*="check"])',
    'button:has([class*="CheckCircle"])',
    'button:has([data-testid*="check"])',
    'button:has(svg)',
    'button[title*="save"]',
    'button[aria-label*="save"]',
    'button:has(.lucide-check)',
    'button:has(.lucide-check-circle)',
    'button:has([stroke="currentColor"])',
    'button:has(path)',
    'button.h-6.w-6',
    'button[class*="h-6"]',
    'button[class*="w-6"]',
    'button[class*="p-0"]',
    'button:near(:text("Check"))',
    'button:near(select)',
    'svg[class*="check"]',
    '[class*="check-circle"]',
    '[data-testid="check-circle"]'
  ]
  
  for (const selector of saveButtonSelectors) {
    const elements = page.locator(selector)
    const count = await elements.count()
    console.log(`Selector "${selector}": found ${count} elements`)
    
    if (count > 0) {
      // Get details about the first matching element
      const firstElement = elements.first()
      const tagName = await firstElement.evaluate(el => el.tagName)
      const className = await firstElement.evaluate(el => el.className)
      const innerHTML = await firstElement.evaluate(el => el.innerHTML)
      
      console.log(`  → First match: <${tagName} class="${className}">${innerHTML}</${tagName}>`)
    }
  }
  
  // Look for ALL buttons near the dropdown
  const allButtons = page.locator('button')
  const buttonCount = await allButtons.count()
  console.log(`\nFound ${buttonCount} total buttons on page`)
  
  // Check buttons that are visible and near the editing area
  for (let i = 0; i < Math.min(buttonCount, 20); i++) {
    const button = allButtons.nth(i)
    const isVisible = await button.isVisible()
    
    if (isVisible) {
      const text = await button.textContent()
      const className = await button.evaluate(el => el.className)
      const innerHTML = await button.evaluate(el => el.innerHTML)
      
      console.log(`Button ${i}: visible="${isVisible}", text="${text}", class="${className}"`)
      if (innerHTML.includes('svg') || innerHTML.includes('check') || innerHTML.includes('circle')) {
        console.log(`  → Contains SVG/check: ${innerHTML.substring(0, 100)}...`)
      }
    }
  }
  
  // Take screenshot to see the current state
  await page.screenshot({ path: 'debug-save-button-state.png', fullPage: true })
  
  console.log('\n🏁 Debug complete - check screenshot and console output')
})
