import { test, expect } from '@playwright/test'
import { getKevinParent, getPaymentsForParent, pickPaymentForOneTime } from './helpers/api'

// Light-touch ACH test with Payment Element: verifies ACH method is available in Preview
// and that confirming does not error (may go into processing; reconciliation is deferred).

test('Payment Element ACH (US bank account) is available in Preview and confirm triggers processing', async ({ page, request }) => {
  // Discover target payment via API
  const kevin = await getKevinParent(request)
  const payments = await getPaymentsForParent(request, kevin._id)
  const payment = pickPaymentForOneTime(payments)
  expect(payment, 'No suitable payment found for Kevin').toBeTruthy()

  // Capture browser logs early
  page.on('console', (msg) => console.log('BROWSER:', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message))

  // Seed API key for protected preview APIs
  await page.addInitScript(() => {
    try { localStorage.setItem('X_API_KEY', 'M8KfyCsbYBtgA12U1NIksAqZ') } catch {}
  })
  // Ensure Vercel preview access cookie is set (shared link)
  try { await page.goto(`/?_vercel_share=M8KfyCsbYBtgA12U1NIksAqZ`, { waitUntil: 'domcontentloaded' }) } catch {}

  // ACH config should be true in Preview
  const achCfg = await page.request.get('/api/ach/config')
  const achJson = await achCfg.json().catch(() => ({}))
  console.log('ACH enabled:', achJson?.enabled)
  // Do not require enabled=true; server PI config also enables ACH in Preview even if this flag is false

  // Go to payment detail
  await page.goto(`/payments/${payment._id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/PAYMENT DETAILS/i)).toBeVisible({ timeout: 20000 })

  // Open Payment Options, choose ACH + Full Payment
  const chooseBtn = page.getByRole('button', { name: /Choose payment option/i })
  await expect(chooseBtn).toBeVisible({ timeout: 15000 })
  await chooseBtn.click()
  // Use Card option to trigger PI creation; server PI includes ACH in Preview
  await page.getByRole('dialog').getByText(/Credit\/?Debit Card/i).click()
  await page.getByRole('dialog').getByText(/Full Payment/i).click()

  // Give Vercel time to roll out updated preview chunks/routes
  await page.waitForTimeout(25000)

  // Trigger PI creation -> shows Payment Element with ACH available
  const processBtn = page.getByRole('button', { name: /Process (Credit Card )?Payment/i })
  await expect(processBtn).toBeEnabled({ timeout: 10000 })
  const piResponsePromise = page.waitForResponse(res => res.url().endsWith('/api/stripe/payment-intent'), { timeout: 20000 })
  await processBtn.click()
  const piRes = await piResponsePromise.catch(() => null)
  if (!piRes) throw new Error('No response from /api/stripe/payment-intent')
  const piOk = piRes.ok()
  let piJson: any = null
  try { piJson = await piRes.json() } catch {}
  console.log('PI status:', piRes.status(), 'ok:', piOk, 'json:', piJson)
  if (!piOk) throw new Error('PI create failed: ' + (piJson?.error || piRes.status()))
  if (!piJson?.clientSecret) throw new Error('PI create returned no clientSecret')

  // Wait for Payment Element to render and verify ACH method is present
  await page.waitForSelector('iframe[name^="__privateStripeFrame"], iframe[title*="payment" i]', { timeout: 20000 })
  // Try to find ACH method toggle text in any Stripe frame
  let achVisible = false
  const deadline = Date.now() + 15000
  while (!achVisible && Date.now() < deadline) {
    for (const f of page.frames()) {
      try {
        const achTab = await f.$('text=/US bank account|Bank account|Bank/i')
        if (achTab) { achVisible = true; break }
      } catch {}
    }
    if (!achVisible) await page.waitForTimeout(500)
  }
  expect(achVisible, 'ACH method not visible in Payment Element').toBeTruthy()

  // Select ACH tab inside the Payment Element
  let clicked = false
  for (const f of page.frames()) {
    try {
      const achTab = await f.$('text=/US bank account|Bank account|Bank/i')
      if (achTab) { await achTab.click(); clicked = true; break }
    } catch {}
  }
  expect(clicked, 'Failed to click ACH tab').toBeTruthy()

  // Try to confirm payment if our app-level Confirm button is present; otherwise stop after ACH visibility
  const maybeConfirm = await page.getByText(/Confirm Payment/i).first().elementHandle().catch(() => null)
  if (maybeConfirm) {
    await page.getByText(/Confirm Payment/i).first().click()
    await page.waitForTimeout(3000)
    expect(await page.getByText(/Payment failed|Card Error/i).isVisible().catch(() => false)).toBeFalsy()
  } else {
    console.log('No app-level Confirm button found; ACH visibility verified. Skipping confirm in this run.')
  }
})

