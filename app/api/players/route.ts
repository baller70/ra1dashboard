import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const parentId = searchParams.get('parentId') || undefined

    const result = await convex.query((api as any).players.getPlayers, {
      search,
      parentId: parentId ? (parentId as any as Id<'parents'>) : undefined,
      limit: 500,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('GET /api/players error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parentId, name, age, team, notes } = body || {}
    if (!parentId || !name) {
      return NextResponse.json({ success: false, error: 'parentId and name are required' }, { status: 400 })
    }

    // Try to find existing player for this parent/name
    const existing = await convex.query((api as any).players.getPlayers, {
      parentId: parentId as any,
      search: name,
      limit: 50,
    })

    let player = existing.players.find((p: any) => p.parentId === parentId && p.name?.toLowerCase() === String(name).toLowerCase())

    if (!player) {
      const newId = await convex.mutation((api as any).players.createPlayer, {
        parentId: parentId as any,
        name,
        age,
        team,
        notes,
      })
      player = await convex.query((api as any).players.getPlayer, { id: newId as any })
    }

    return NextResponse.json({ success: true, player })
  } catch (error: any) {
    console.error('POST /api/players error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 })
  }
}

