export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const host = request.headers.get('host') || url.host

    const envConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
      || process.env.CONVEX_URL
      || process.env.NEXT_PUBLIC_CONVEX_URL_FALLBACK
      || ''

    const baseUrl = url.hostname.includes('localhost')
      ? 'http://localhost:3000'
      : `https://${host}`

    // Try to fetch live plan and analytics data to show what prod sees
    let plansSummary: any = { ok: false }
    let analyticsSummary: any = { ok: false }
    try {
      const headers = { 'x-api-key': 'ra1-dashboard-api-key-2024' }
      const [plansRes, analyticsRes] = await Promise.all([
        fetch(`${baseUrl}/api/payment-plans?_t=${Date.now()}`, { headers, cache: 'no-store' }),
        fetch(`${baseUrl}/api/payments/analytics?_t=${Date.now()}`, { headers, cache: 'no-store' })
      ])

      if (plansRes.ok) {
        const plans = await plansRes.json()
        const countable = Array.isArray(plans)
          ? plans.filter((p: any) => ['active', 'pending'].includes(String(p.status || '').toLowerCase()))
          : []
        const sumTotals = countable.reduce((s: number, p: any) => s + Number(p.totalAmount || 0), 0)
        plansSummary = {
          ok: true,
          total: Array.isArray(plans) ? plans.length : 0,
          activeOrPending: countable.length,
          sumTotals,
        }
      }

      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json()
        analyticsSummary = {
          ok: true,
          totalRevenue: Number(analytics?.data?.totalRevenue ?? 0),
          activePlans: Number(analytics?.data?.activePlans ?? 0),
        }
      }
    } catch (e) {
      // ignore
    }

    return NextResponse.json({
      vercel: {
        isVercel: Boolean(process.env.VERCEL),
        env: process.env.VERCEL_ENV || null,
        url: process.env.VERCEL_URL || null,
        region: process.env.VERCEL_REGION || null,
        projectProdUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
        repo: {
          owner: process.env.VERCEL_GIT_REPO_OWNER || null,
          slug: process.env.VERCEL_GIT_REPO_SLUG || null,
        },
        commit: {
          sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
          message: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
        }
      },
      nodeEnv: process.env.NODE_ENV || null,
      host,
      convex: {
        envUrl: envConvexUrl,
      },
      plans: plansSummary,
      analytics: analyticsSummary,
    })
  } catch (error) {
    return NextResponse.json({ error: 'debug failed' }, { status: 500 })
  }
}

