import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    const limit = Number(searchParams.get('limit') || '20')
    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
    }
    const result = await convex.query((api as any).assessments.listByPlayer, {
      playerId: playerId as any,
      limit,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('GET /api/assessments error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 })
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      parentId,
      playerId,
      programName,
      skills,
      aiParentSuggestions,
      aiGameplayAnalysis,
      aiProgressSummary,
      category,
      pdfUrl,
    } = body || {}

    if (!parentId || !playerId || !skills) {
      return NextResponse.json({ error: 'Missing required fields: parentId, playerId, skills' }, { status: 400 })
    }

    const id = await convex.mutation((api as any).assessments.createAssessment, {
      parentId,
      playerId,
      programName,
      skills,
      aiParentSuggestions,
      aiGameplayAnalysis,
      aiProgressSummary,
      category,
      pdfUrl,
    } as any)

    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    console.error('POST /api/assessments error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 })
  }
}

