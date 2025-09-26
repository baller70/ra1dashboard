import { test, expect } from '@playwright/test'

test('test payment method badge editing functionality', async ({ page }) => {
  // Go to payments page
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  
  // Take initial screenshot
  await page.screenshot({ path: 'payment-method-test-initial.png', fullPage: true })
  
  // Look for payment method badges with various selectors
  console.log('Looking for payment method badges...')
  
  // Try different selectors to find badges
  const badgeSelectors = [
    'text="Credit Card"',
    'text="Check"', 
    'text="Cash"',
    '[class*="badge"]',
    '.badge',
    '[class*="bg-"]',
    'span:has-text("Credit Card")',
    'span:has-text("Check")',
    'div:has-text("Credit Card")',
    'div:has-text("Check")'
  ]
  
  let foundBadge = null
  let badgeSelector = ''
  
  for (const selector of badgeSelectors) {
    const elements = page.locator(selector)
    const count = await elements.count()
    console.log(`Selector "${selector}": found ${count} elements`)
    
    if (count > 0) {
      foundBadge = elements.first()
      badgeSelector = selector
      break
    }
  }
  
  if (!foundBadge) {
    console.log('No payment method badges found with standard selectors')
    
    // Try to find any clickable elements that might be badges
    const clickableElements = page.locator('button, span, div').filter({ hasText: /credit|card|check|cash|payment/i })
    const clickableCount = await clickableElements.count()
    console.log(`Found ${clickableCount} elements with payment-related text`)
    
    if (clickableCount > 0) {
      foundBadge = clickableElements.first()
      badgeSelector = 'payment-related clickable element'
    }
  }
  
  if (foundBadge) {
    console.log(`Found badge with selector: ${badgeSelector}`)
    
    // Get the original text
    const originalText = await foundBadge.textContent()
    console.log(`Original badge text: "${originalText}"`)
    
    // Highlight the element we're about to click
    await foundBadge.evaluate(el => {
      el.style.border = '3px solid red'
      el.style.backgroundColor = 'yellow'
    })
    
    await page.screenshot({ path: 'payment-method-test-highlighted.png', fullPage: true })
    
    // Click the badge
    console.log('Clicking the payment method badge...')
    await foundBadge.click()
    
    // Wait a moment for any UI changes
    await page.waitForTimeout(2000)
    
    // Take screenshot after click
    await page.screenshot({ path: 'payment-method-test-after-click.png', fullPage: true })
    
    // Look for dropdown/select elements that might have appeared
    const dropdownSelectors = [
      'select',
      '[role="combobox"]',
      '[class*="select"]',
      'input[type="text"]',
      '.dropdown',
      '[data-testid*="select"]'
    ]
    
    let foundDropdown = null
    for (const selector of dropdownSelectors) {
      const dropdown = page.locator(selector)
      const count = await dropdown.count()
      if (count > 0) {
        console.log(`Found dropdown with selector: ${selector}`)
        foundDropdown = dropdown.first()
        break
      }
    }
    
    if (foundDropdown) {
      console.log('Found dropdown - attempting to interact with it')
      
      // Try to click the dropdown to open it
      await foundDropdown.click()
      await page.waitForTimeout(1000)
      
      await page.screenshot({ path: 'payment-method-test-dropdown-open.png', fullPage: true })
      
      // Look for options
      const options = page.locator('option, [role="option"], li')
      const optionCount = await options.count()
      console.log(`Found ${optionCount} potential options`)
      
      if (optionCount > 0) {
        // Try to select a different option
        const targetOption = page.locator('text="Check"').or(page.locator('text="Cash"')).first()
        if (await targetOption.count() > 0) {
          console.log('Selecting different payment method...')
          await targetOption.click()
          await page.waitForTimeout(1000)
          
          await page.screenshot({ path: 'payment-method-test-option-selected.png', fullPage: true })
        }
      }
      
      // Look for save button (checkmark icon)
      const saveButtons = page.locator('button:has([class*="check"]), button:has([data-testid*="check"]), button[title*="save"]')
      const saveCount = await saveButtons.count()
      console.log(`Found ${saveCount} potential save buttons`)
      
      if (saveCount > 0) {
        console.log('Clicking save button...')
        await saveButtons.first().click()
        await page.waitForTimeout(3000)
        
        await page.screenshot({ path: 'payment-method-test-after-save.png', fullPage: true })
        
        // Check if the badge text changed
        const newText = await foundBadge.textContent()
        console.log(`New badge text: "${newText}"`)
        
        if (newText !== originalText) {
          console.log('✅ SUCCESS: Payment method badge text changed!')
        } else {
          console.log('❌ ISSUE: Payment method badge text did not change')
        }
      } else {
        console.log('❌ No save button found')
      }
    } else {
      console.log('❌ No dropdown found after clicking badge')
    }
    
  } else {
    console.log('❌ No payment method badges found at all')
  }
  
  // Final screenshot
  await page.screenshot({ path: 'payment-method-test-final.png', fullPage: true })
})
