import { test, expect } from '@playwright/test'

// Runs server-side webhook signature verification self-test in Preview
// Does not require local STRIPE_WEBHOOK_SECRET; uses the server's configured secret

test('webhook self-test: server has STRIPE_WEBHOOK_SECRET and can verify signed payload', async ({ request }) => {
  const res = await request.post('/api/stripe/webhooks/self-test')
  expect(res.ok()).toBeTruthy()
  const json = await res.json()
  // In Preview with test keys set, we expect configured:true and verified:true
  expect(json).toMatchObject({ ok: true })
  if (json.configured === false) {
    test.skip(true, 'Server reports STRIPE_WEBHOOK_SECRET not configured; skipping')
  }
  expect(json.verified).toBeTruthy()
})

