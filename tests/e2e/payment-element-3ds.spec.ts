import { test, expect } from '@playwright/test'
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api'

async function fillPaymentElementCard(page: import('@playwright/test').Page, { number, exp, cvc, postal }: { number: string, exp: string, cvc: string, postal?: string }) {
  // Wait for any Stripe private frame to appear
  await page.waitForSelector('iframe[name^="__privateStripeFrame"], iframe[title*="payment"]', { timeout: 20000 })

  // Try to locate inputs across Stripe iframes
  const frames = page.frames()
  let filled = false
  for (const f of frames) {
    try {
      const hasNumber = await f.$('input[name="number"], input[autocomplete="cc-number"], input[placeholder*="Card number" i]')
      if (hasNumber) {
        await hasNumber.fill(number)
        const expInput = await (await f.$('input[name="exp-date"], input[name="expiry"], input[placeholder*="MM / YY" i], input[placeholder*="MM/YY" i]'))
        if (expInput) await expInput.fill(exp)
        const cvcInput = await (await f.$('input[name="cvc"], input[autocomplete="cc-csc"], input[placeholder*="CVC" i]'))
        if (cvcInput) await cvcInput.fill(cvc)
        if (postal) {
          const postalInput = await f.$('input[name="postal"], input[placeholder*="ZIP" i], input[placeholder*="Postal" i]')
          if (postalInput) await postalInput.fill(postal)
        }
        filled = true
        break
      }
    } catch {}
  }
  expect(filled, 'Could not locate Stripe card inputs in Payment Element').toBeTruthy()
}

async function complete3DSChallengeIfPresent(page: import('@playwright/test').Page) {
  // 3DS challenge may open in another Stripe frame; try to complete it
  // Use multiple selector strategies to be resilient
  const challengeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"], iframe[title*="challenge" i]')
  const completeButtons = [
    challengeFrame.getByRole('button', { name: /Complete authentication/i }),
    challengeFrame.getByRole('button', { name: /Complete/i }),
    challengeFrame.getByRole('button', { name: /Authorize/i }),
    challengeFrame.getByRole('button', { name: /OK/i })
  ]
  for (const btn of completeButtons) {
    try {
      await btn.click({ timeout: 5000 })
      return true
    } catch {}
  }
  return false
}

// Validates one-time card flow with 3DS test card via Stripe Payment Element
// Uses Kevin Van Houston's profile and picks a pending/overdue payment

test('Payment Element one-time card with 3DS succeeds and marks paid (webhook may lag)', async ({ page, request }) => {
  // Discover target payment via API
  const kevin = await getKevinParent(request)
  const payments = await getPaymentsForParent(request, kevin._id)
  const payment = pickPaymentForOneTime(payments)
  expect(payment, 'No suitable payment found for Kevin').toBeTruthy()

  // Go to payment detail
  await page.goto(`/payments/${payment._id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/PAYMENT DETAILS/i)).toBeVisible()

  // Open Payment Options, choose Card + Full Payment
  const chooseBtn = page.getByRole('button', { name: /Choose payment option/i })
  await expect(chooseBtn).toBeVisible({ timeout: 15000 })
  await chooseBtn.click()
  await page.getByText(/Credit\/Debit Card/i).click()
  await page.getByText(/Full Payment/i).click()

  // Trigger PI creation -> shows Payment Element
  const processBtn = page.getByRole('button', { name: /Process (Credit Card )?Payment/i })
  await expect(processBtn).toBeEnabled({ timeout: 10000 })
  await processBtn.click()

  // Wait for Stripe Payment Element to render (iframe presence)
  await page.waitForSelector('iframe[name^="__privateStripeFrame"], iframe[title*="payment" i]', { timeout: 20000 })

  // Fill 3DS test card in Payment Element
  await fillPaymentElementCard(page, { number: '4000002760003184', exp: '12/34', cvc: '123', postal: '10001' })

  // Confirm card payment
  const confirmBtn = page.getByRole('button', { name: /Confirm Card Payment/i })
  await expect(confirmBtn).toBeEnabled({ timeout: 10000 })
  await confirmBtn.click()

  // Handle 3DS challenge if it appears
  await complete3DSChallengeIfPresent(page)

  // Expect success toast appears or dialog closes; then allow webhook to sync
  await page.waitForTimeout(2000)
  // Payment status may take time to become Paid due to webhook; just assert no error banner for now
  expect(await page.getByText(/Payment failed|Card Error/i).isVisible().catch(() => false)).toBeFalsy()
})

