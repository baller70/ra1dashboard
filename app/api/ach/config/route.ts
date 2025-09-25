import { NextResponse } from 'next/server'

// GET /api/ach/config
// Returns whether ACH is enabled. Default false unless env is explicitly set.
export async function GET() {
  const enabled = (process.env.NEXT_PUBLIC_ACH_ENABLED === 'true' || process.env.ACH_ENABLED === 'true') || process.env.VERCEL_ENV === 'preview'
  return NextResponse.json({ enabled })
}

