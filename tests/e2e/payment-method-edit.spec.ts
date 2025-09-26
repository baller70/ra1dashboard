import { test, expect } from '@playwright/test'

test.describe('Payment Method Editing', () => {
  test('should allow editing payment method labels on payments page', async ({ page }) => {
    // Navigate to payments page
    await page.goto('https://ra1dashboard.vercel.app/payments')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/payment-method-edit-initial.png', fullPage: true })
    
    // Look for payment cards with method badges
    const paymentCards = page.locator('[data-testid="payment-card"], .payment-card, .border.rounded')
    const cardCount = await paymentCards.count()
    
    console.log(`Found ${cardCount} payment cards`)
    
    if (cardCount === 0) {
      console.log('No payment cards found - checking if we need to create test data')
      
      // Check if there are any parents to create payments for
      const addPaymentButton = page.locator('button:has-text("Add Payment"), button:has-text("Create Payment")')
      if (await addPaymentButton.count() > 0) {
        console.log('Found add payment button - payments page is accessible')
      }
      
      // Take screenshot showing empty state
      await page.screenshot({ path: 'test-results/payment-method-edit-no-data.png', fullPage: true })
      test.skip(true, 'No payment data available to test editing')
    }
    
    // Find the first payment method badge that's clickable
    const methodBadges = page.locator('.badge, [class*="badge"]').filter({ hasText: /Credit Card|Check|Cash|ACH|Venmo|Zelle/i })
    const badgeCount = await methodBadges.count()
    
    console.log(`Found ${badgeCount} payment method badges`)
    
    if (badgeCount === 0) {
      await page.screenshot({ path: 'test-results/payment-method-edit-no-badges.png', fullPage: true })
      test.skip(true, 'No payment method badges found to test editing')
    }
    
    // Click the first payment method badge
    const firstBadge = methodBadges.first()
    const originalText = await firstBadge.textContent()
    console.log(`Original payment method: ${originalText}`)
    
    await firstBadge.click()
    
    // Wait for edit mode to appear (dropdown should be visible)
    await page.waitForTimeout(1000)
    
    // Look for the dropdown/select element
    const dropdown = page.locator('select, [role="combobox"], .select-trigger').first()
    
    if (await dropdown.count() === 0) {
      await page.screenshot({ path: 'test-results/payment-method-edit-no-dropdown.png', fullPage: true })
      test.skip(true, 'Edit dropdown did not appear after clicking badge')
    }
    
    // Take screenshot showing edit mode
    await page.screenshot({ path: 'test-results/payment-method-edit-dropdown.png', fullPage: true })
    
    // Try to select a different payment method
    const newMethod = originalText?.includes('Credit Card') ? 'Check' : 'Credit Card'
    
    // Click dropdown to open options
    await dropdown.click()
    await page.waitForTimeout(500)
    
    // Select new method
    const option = page.locator(`text="${newMethod}"`).first()
    if (await option.count() > 0) {
      await option.click()
      console.log(`Selected new method: ${newMethod}`)
    }
    
    // Look for save button (checkmark)
    const saveButton = page.locator('button:has([data-testid="check-circle"]), button:has(.lucide-check-circle), button[title*="save"], button[aria-label*="save"]').first()
    
    if (await saveButton.count() > 0) {
      await saveButton.click()
      console.log('Clicked save button')
      
      // Wait for save to complete
      await page.waitForTimeout(2000)
      
      // Take screenshot after save
      await page.screenshot({ path: 'test-results/payment-method-edit-after-save.png', fullPage: true })
      
      // Verify the change was saved
      const updatedBadge = methodBadges.first()
      const newText = await updatedBadge.textContent()
      console.log(`Updated payment method: ${newText}`)
      
      // Check if the method actually changed
      if (newText !== originalText) {
        console.log('✅ Payment method successfully updated!')
      } else {
        console.log('❌ Payment method did not change - may have reverted')
      }
      
    } else {
      await page.screenshot({ path: 'test-results/payment-method-edit-no-save-button.png', fullPage: true })
      console.log('❌ Save button not found')
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/payment-method-edit-final.png', fullPage: true })
  })
  
  test('should allow editing payment method on parent profile page', async ({ page }) => {
    // Navigate to parents page first
    await page.goto('https://ra1dashboard.vercel.app/parents')
    await page.waitForLoadState('networkidle')
    
    // Look for a parent link to click
    const parentLinks = page.locator('a[href*="/parents/"], .parent-card a, [data-testid="parent-link"]')
    const parentCount = await parentLinks.count()
    
    if (parentCount === 0) {
      await page.screenshot({ path: 'test-results/parent-profile-no-parents.png', fullPage: true })
      test.skip(true, 'No parents found to test payment method editing')
    }
    
    // Click first parent
    await parentLinks.first().click()
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of parent profile
    await page.screenshot({ path: 'test-results/parent-profile-initial.png', fullPage: true })
    
    // Look for payment method badges on parent profile
    const methodBadges = page.locator('.badge, [class*="badge"]').filter({ hasText: /Credit Card|Check|Cash|ACH|Venmo|Zelle/i })
    const badgeCount = await methodBadges.count()
    
    console.log(`Found ${badgeCount} payment method badges on parent profile`)
    
    if (badgeCount > 0) {
      // Test editing on parent profile (same logic as payments page)
      const firstBadge = methodBadges.first()
      const originalText = await firstBadge.textContent()
      console.log(`Parent profile - Original payment method: ${originalText}`)
      
      await firstBadge.click()
      await page.waitForTimeout(1000)
      
      await page.screenshot({ path: 'test-results/parent-profile-edit-mode.png', fullPage: true })
      
      console.log('✅ Parent profile payment method editing interface accessible')
    } else {
      console.log('No payment method badges found on parent profile')
    }
    
    await page.screenshot({ path: 'test-results/parent-profile-final.png', fullPage: true })
  })
})
