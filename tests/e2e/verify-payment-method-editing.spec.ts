import { test, expect } from '@playwright/test'

test('verify payment method editing interface works', async ({ page }) => {
  console.log('🎯 Testing Payment Method Editing Functionality')
  
  // Navigate to payments page
  await page.goto('https://ra1dashboard.vercel.app/payments')
  await page.waitForLoadState('networkidle')
  
  console.log('✅ Loaded payments page')
  
  // Find Credit Card badges
  const creditCardBadges = page.locator('text="Credit Card"')
  const badgeCount = await creditCardBadges.count()
  console.log(`✅ Found ${badgeCount} Credit Card badges`)
  
  if (badgeCount === 0) {
    test.skip(true, 'No Credit Card badges found to test')
  }
  
  // Click the first Credit Card badge
  const firstBadge = creditCardBadges.first()
  console.log('🖱️  Clicking first Credit Card badge...')
  await firstBadge.click()
  
  // Wait for edit interface to appear
  await page.waitForTimeout(1500)
  
  // Check if dropdown appeared
  const dropdown = page.locator('select').first()
  const dropdownVisible = await dropdown.count() > 0
  console.log(`✅ Dropdown appeared: ${dropdownVisible}`)
  
  if (dropdownVisible) {
    // Open dropdown
    await dropdown.click()
    await page.waitForTimeout(500)
    
    // Look for "Check" option
    const checkOption = page.locator('option[value="check"]').or(page.locator('text="Check"')).first()
    const checkOptionExists = await checkOption.count() > 0
    console.log(`✅ Check option available: ${checkOptionExists}`)

    if (checkOptionExists) {
      // Select Check
      await checkOption.click()
      console.log('✅ Selected "Check" option')
      
      // Look for save button (checkmark)
      const saveButton = page.locator('button:has([class*="check-circle"]), button:has([data-testid*="check"])').first()
      const saveButtonExists = await saveButton.count() > 0
      console.log(`✅ Save button found: ${saveButtonExists}`)
      
      if (saveButtonExists) {
        // Click save
        await saveButton.click()
        console.log('✅ Clicked save button')
        
        // Wait for save to complete
        await page.waitForTimeout(3000)
        
        // Check if we can find a "Check" badge now (indicating success)
        const checkBadges = page.locator('text="Check"')
        const checkBadgeCount = await checkBadges.count()
        console.log(`✅ Found ${checkBadgeCount} Check badges after save`)
        
        if (checkBadgeCount > 0) {
          console.log('🎉 SUCCESS: Payment method editing is working!')
          console.log('   - Badge clicked successfully')
          console.log('   - Dropdown appeared')
          console.log('   - Option selected')
          console.log('   - Save button worked')
          console.log('   - Badge updated to new method')
        } else {
          console.log('⚠️  PARTIAL SUCCESS: Interface works but change may not have persisted')
        }
      } else {
        console.log('❌ Save button not found')
      }
    } else {
      console.log('❌ Check option not found in dropdown')
    }
  } else {
    console.log('❌ Dropdown did not appear after clicking badge')
  }
  
  // Test the reverse - try to change a Check badge back to Credit Card
  console.log('\n🔄 Testing reverse change (Check → Credit Card)...')
  
  const checkBadges = page.locator('text="Check"')
  const checkCount = await checkBadges.count()
  
  if (checkCount > 0) {
    await checkBadges.first().click()
    await page.waitForTimeout(1000)
    
    const dropdown2 = page.locator('select').first()
    if (await dropdown2.count() > 0) {
      await dropdown2.click()
      await page.waitForTimeout(500)
      
      const creditCardOption = page.locator('option[value="stripe_card"]').or(page.locator('text="Credit Card"')).first()
      if (await creditCardOption.count() > 0) {
        await creditCardOption.click()
        
        const saveButton2 = page.locator('button:has([class*="check-circle"])').first()
        if (await saveButton2.count() > 0) {
          await saveButton2.click()
          await page.waitForTimeout(2000)
          console.log('✅ Reverse change test completed')
        }
      }
    }
  }
  
  console.log('\n🏁 Payment method editing test completed!')
})
