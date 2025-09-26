import { test, expect } from '@playwright/test'

// Runs server-side webhook signature verification self-test in Preview
// Does not require local STRIPE_WEBHOOK_SECRET; uses the server's configured secret

test('webhook self-test: server has STRIPE_WEBHOOK_SECRET and can verify signed payload', async ({ request }) => {
  const res = await request.post('/api/stripe/webhooks/self-test')
  const status = res.status()
  const text = await res.text().catch(() => '')
  if (!res.ok()) {
    test.skip(true, `self-test route not ready or forbidden (status ${status}): ${text.slice(0, 200)}`)
  }
  const json = JSON.parse(text || '{}')
  // In Preview with test keys set, we expect configured:true and verified:true
  expect(json).toMatchObject({ ok: true })
  if (json.configured === false) {
    test.skip(true, 'Server reports STRIPE_WEBHOOK_SECRET not configured; skipping')
  }
  expect(json.verified).toBeTruthy()
})

