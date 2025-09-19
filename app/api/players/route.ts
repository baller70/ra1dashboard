import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined

    const result = await convex.query((api as any).players.getPlayers, {
      search,
      limit: 500,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('GET /api/players error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 })
  }
}

