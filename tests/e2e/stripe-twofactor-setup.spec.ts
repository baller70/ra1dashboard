import { test, expect } from '@playwright/test'
import { getKevinParent } from './helpers/api'

// Safety guard: don't run against production unless explicitly allowed.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || ''
const RUN_STRIPE_SAFE = process.env.RUN_STRIPE_SAFE === '1'
// Treat vercel.app as non-prod for previews; also match localhost/dev/staging/preview
const isNonProdBase = /localhost|127\.0\.0\.1|preview|staging|dev|vercel\.app/i.test(BASE_URL)

const shouldRun = RUN_STRIPE_SAFE || isNonProdBase

test.describe('Stripe two-factor resolver (email + card fingerprint)', () => {
  test.skip(!shouldRun, 'Guarded: requires RUN_STRIPE_SAFE=1 (or non-prod BASE_URL) and STRIPE_SECRET_KEY=sk_test_*')

  test('attaches PM to existing Kevin customer without creating duplicates; updates Convex', async ({ page, request }) => {
    // 1) Locate Kevin's parent
    const parent = await getKevinParent(request)

    // 2) Snapshot prior linkage
    const beforeRes = await request.get(`/api/parents/${encodeURIComponent(String(parent._id))}`)
    expect(beforeRes.ok()).toBeTruthy()
    const before = await beforeRes.json()
    const prevCustomerId: string | undefined = before?.stripeCustomerId

    // 3) Use a built-in Stripe test PaymentMethod id that works in test mode on the server
    const pm = { id: 'pm_card_visa' }

    // 4) Call the setup resolver endpoint (no charge)
    const setupRes = await request.post('/api/stripe/setup', {
      data: { parentId: String(parent._id), paymentMethodId: pm.id },
      headers: { 'Content-Type': 'application/json' },
    })
    if (!setupRes.ok()) {
      const status = setupRes.status();
      const text = await setupRes.text();
      console.log('Setup POST failed:', status, text);
      if (status === 405) {
        // Fallback for older previews: use payment-intent path to exercise resolver without confirming payment
        const piRes = await request.post('/api/stripe/payment-intent', {
          data: { parentId: String(parent._id), amount: 100, description: 'resolver-fallback', paymentMethodId: pm.id },
          headers: { 'Content-Type': 'application/json' },
        })
        const piStatus = piRes.status();
        const piText = await piRes.text();
        console.log('PaymentIntent fallback status:', piStatus, piText);
        expect(piRes.ok()).toBeTruthy()
      }
    }

    if (setupRes.ok()) {
      const setupJson = await setupRes.json()
      expect(setupJson?.success).toBeTruthy()
      expect(setupJson?.customerId).toBeTruthy()
      expect(setupJson?.paymentMethodId).toBe(pm.id)
    }

    // 5) Verify Convex linkage updated
    const afterRes = await request.get(`/api/parents/${encodeURIComponent(String(parent._id))}`)
    expect(afterRes.ok()).toBeTruthy()
    const after = await afterRes.json()

    // Customer ID should exist and, if previously set, remain the same customer (no duplicates)
    expect(after?.stripeCustomerId).toBeTruthy()
    if (prevCustomerId) {
      expect(after?.stripeCustomerId).toBe(prevCustomerId)
    }
    expect(after?.stripePaymentMethodId).toBe(pm.id)
  })
})

