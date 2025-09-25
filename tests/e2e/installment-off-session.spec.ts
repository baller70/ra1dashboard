import { test, expect } from '@playwright/test'
import { getKevinParent, getPaymentsForParent } from './helpers/api'

// Validates off_session charge for the next pending installment
// Flow:
// - Navigate to a payment with installments (Kevin's profile)
// - Ensure a pending installment exists
// - Trigger off_session charge via API endpoint (simulates scheduler)
// - Poll progress endpoint for reconciliation via webhook

test('Off-session installment: next pending charge succeeds and reconciles via webhook', async ({ page, request }) => {
  // Seed API key for protected preview APIs
  await page.addInitScript(() => {
    try { localStorage.setItem('X_API_KEY', 'M8KfyCsbYBtgA12U1NIksAqZ') } catch {}
  })
  // Ensure Vercel preview access cookie is set (shared link)
  try { await page.goto(`/?_vercel_share=M8KfyCsbYBtgA12U1NIksAqZ`, { waitUntil: 'domcontentloaded' }) } catch {}

  // Discover Kevin and his payments
  const kevin = await getKevinParent(request)
  const payments = await getPaymentsForParent(request, kevin._id)
  const payment = payments.find((p: any) => p.paymentMethod === 'check' || p.paymentPlanId)
  expect(payment, 'No installment payment found for Kevin').toBeTruthy()

  // Navigate to payment page (for screenshots/logs and to keep parity with real flow)
  await page.goto(`/payments/${payment._id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/PAYMENT DETAILS/i)).toBeVisible({ timeout: 20000 })

  // Fetch progress to find a pending installment
  const progRes = await request.get(`/api/payments/${payment._id}/progress`)
  const progJson = await progRes.json()
  const pending = (progJson?.installments || []).find((i: any) => i.status === 'pending')
  expect(pending, 'No pending installment to charge').toBeTruthy()

  // Ensure a default PaymentMethod is stored for parent (uses test-friendly fallback if needed)
  await request.post(`/api/stripe/setup`, { data: { parentId: kevin._id, paymentMethodId: 'pm_test_placeholder' } })

  // Trigger off_session charge for this pending installment
  // Retry a few times in case preview deployment is still propagating new route
  let chargeRes = await request.post(`/api/installments/${pending._id}/charge`, { data: {} })
  let chargeJson: any = await chargeRes.json().catch(() => ({}))
  for (let i = 0; i < 10 && chargeRes.status() === 404; i++) {
    await page.waitForTimeout(2000)
    chargeRes = await request.post(`/api/installments/${pending._id}/charge`, { data: {} })
    chargeJson = await chargeRes.json().catch(() => ({}))
  }
  expect(chargeRes.ok(), `Charge API failed: ${chargeRes.status()} ${JSON.stringify(chargeJson)}`).toBeTruthy()
  console.log('Off-session charge PI:', chargeJson)

  // Poll progress for reconciliation (webhook should mark installment paid)
  let reconciled = false
  for (let i = 0; i < 12; i++) {
    const r = await request.get(`/api/payments/${payment._id}/progress`)
    const j = await r.json().catch(() => ({}))
    const inst = (j?.installments || []).find((i: any) => i._id === pending._id)
    if (inst?.status === 'paid') { reconciled = true; break }
    await page.waitForTimeout(1000)
  }
  console.log('Installment reconciled via webhook:', reconciled)
  expect(reconciled, 'Installment did not reconcile to paid in time').toBeTruthy()
})

