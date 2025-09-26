process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_live_dummy';
process.env.NEXT_PUBLIC_CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'http://localhost:32123';

(async () => {
  const m1 = await import('../app/api/stripe/payment-intent/route');
  const m2 = await import('../app/api/stripe/one-time/route');
  const m3 = await import('../app/api/stripe/subscriptions/route');
  const m4 = await import('../app/api/stripe/setup/route');
  console.log('Imported modules:', !!m1.POST, !!m2.POST, !!m3.POST, !!m4.GET, !!m4.POST);
  console.log('Route smoke imports OK.');
})().catch((e) => { console.error(e); process.exit(1); });

