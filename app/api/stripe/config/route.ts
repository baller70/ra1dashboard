export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'

export async function GET() {
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ||
    process.env.STRIPE_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PK ||
    process.env.STRIPE_PK ||
    ''
  return NextResponse.json({ publishableKey })
}

