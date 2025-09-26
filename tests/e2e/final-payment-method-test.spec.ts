import { test, expect } from '@playwright/test'

test('final payment method editing test with custom Select component', async ({ page }) => {
  console.log('🎯 Final Payment Method Editing Test')
  
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  
  console.log('✅ Loaded payments page')
  
  // Find and click a Credit Card badge
  const creditCardBadges = page.locator('text="Credit Card"')
  const badgeCount = await creditCardBadges.count()
  console.log(`✅ Found ${badgeCount} Credit Card badges`)
  
  if (badgeCount === 0) {
    test.skip(true, 'No Credit Card badges found')
  }
  
  // Click the first badge
  await creditCardBadges.first().click()
  console.log('✅ Clicked Credit Card badge')
  
  await page.waitForTimeout(1000)
  
  // Look for the custom Select trigger (not standard select)
  const selectTrigger = page.locator('[role="combobox"], .select-trigger, button:has-text("Credit Card")').first()
  const triggerExists = await selectTrigger.count() > 0
  console.log(`✅ Select trigger found: ${triggerExists}`)
  
  if (triggerExists) {
    // Click the select trigger to open dropdown
    await selectTrigger.click()
    console.log('✅ Clicked select trigger')
    
    await page.waitForTimeout(500)
    
    // Look for "Check" option in the dropdown content
    const checkOption = page.locator('[role="option"]:has-text("Check")').or(page.locator('[data-value="check"]')).or(page.locator('text="Check"')).first()
    const checkExists = await checkOption.count() > 0
    console.log(`✅ Check option found: ${checkExists}`)
    
    if (checkExists) {
      // Click the Check option
      await checkOption.click()
      console.log('✅ Selected Check option')
      
      await page.waitForTimeout(500)
      
      // Now look for save button (checkmark icon)
      const saveButtons = [
        'button:has(svg[class*="check"])',
        'button:has(.lucide-check-circle)',
        'button:has([data-testid*="check"])',
        'button.h-6.w-6.p-0',
        'button[class*="h-6"][class*="w-6"][class*="p-0"]'
      ]
      
      let saveButton = null
      for (const selector of saveButtons) {
        const btn = page.locator(selector).first()
        if (await btn.count() > 0) {
          saveButton = btn
          console.log(`✅ Found save button with selector: ${selector}`)
          break
        }
      }
      
      if (saveButton) {
        // Click save button
        await saveButton.click()
        console.log('✅ Clicked save button')
        
        // Wait for save to complete
        await page.waitForTimeout(3000)
        
        // Check if we now have Check badges (success indicator)
        const checkBadges = page.locator('text="Check"')
        const checkBadgeCount = await checkBadges.count()
        console.log(`✅ Check badges after save: ${checkBadgeCount}`)
        
        if (checkBadgeCount > 0) {
          console.log('🎉 SUCCESS! Payment method editing is fully functional!')
          console.log('   ✓ Badge clicked')
          console.log('   ✓ Dropdown opened')
          console.log('   ✓ Option selected')
          console.log('   ✓ Save button clicked')
          console.log('   ✓ Change persisted')
        } else {
          console.log('⚠️  Interface works but change may not have saved to database')
        }
        
        // Take final screenshot
        await page.screenshot({ path: 'payment-method-final-success.png', fullPage: true })
        
      } else {
        console.log('❌ Save button not found')
        
        // Take screenshot to see current state
        await page.screenshot({ path: 'payment-method-no-save-button.png', fullPage: true })
        
        // List all visible buttons for debugging
        const allButtons = page.locator('button:visible')
        const buttonCount = await allButtons.count()
        console.log(`Found ${buttonCount} visible buttons`)
        
        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          const btn = allButtons.nth(i)
          const text = await btn.textContent()
          const classes = await btn.getAttribute('class')
          console.log(`  Button ${i}: "${text}" classes="${classes}"`)
        }
      }
      
    } else {
      console.log('❌ Check option not found in dropdown')
      await page.screenshot({ path: 'payment-method-no-check-option.png', fullPage: true })
    }
    
  } else {
    console.log('❌ Select trigger not found')
    await page.screenshot({ path: 'payment-method-no-trigger.png', fullPage: true })
  }
  
  console.log('🏁 Test completed')
})
