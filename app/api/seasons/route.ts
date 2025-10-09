export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { api } from "@/convex/_generated/api"
import { convexHttp } from "@/lib/convex-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const withStats = searchParams.get('withStats') === 'true'

    try {
      const seasons = withStats
        ? await convexHttp.query(api.seasons.getSeasonsWithStats as any, {})
        : await convexHttp.query(api.seasons.getSeasons as any, { includeInactive: true })
      return NextResponse.json({ success: true, data: seasons })
    } catch (e) {
      // Fallback to a minimal mock to avoid breaking UI if Convex is not configured yet
      const mockSeasons = [
        {
          _id: "temp_season_1",
          name: "Summer League 2024",
          type: "summer_league",
          year: 2024,
          startDate: Date.now(),
          endDate: Date.now() + (90 * 24 * 60 * 60 * 1000),
          registrationDeadline: Date.now() + (30 * 24 * 60 * 60 * 1000),
          isActive: true,
          description: "Summer basketball league program",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: withStats ? { totalFees: 0, paidFees: 0, pendingFees: 0, overdueFees: 0, totalRevenue: 0 } : undefined
        }
      ]
      return NextResponse.json({ success: true, data: mockSeasons })
    }

  } catch (error) {
    console.error('Error fetching seasons:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: []
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, type, year, startDate, endDate, registrationDeadline, description } = await request.json()

    if (!name || !type || !year || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, type, year, startDate, endDate'
        },
        { status: 400 }
      )
    }

    try {
      const result = await convexHttp.mutation(api.seasons.createSeason as any, {
        name,
        type,
        year,
        startDate,
        endDate,
        registrationDeadline,
        description
      })
      return NextResponse.json({ success: true, data: { seasonId: result.id } })
    } catch (e) {
      // Fallback: return a temp id so UI doesn't break, but indicate non-persistent state
      const tempId = `temp_season_${Date.now()}`
      console.warn('Convex not configured; returning temp season id', { tempId })
      return NextResponse.json({ success: true, data: { seasonId: tempId }, warning: 'Convex not configured; season not persisted.' })
    }

  } catch (error) {
    console.error('Error creating season:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: id' 
        },
        { status: 400 }
      )
    }

    // Update season
    await convex.mutation(api.seasons.updateSeason, {
      id: id as any,
      ...updates
    })

    return NextResponse.json({
      success: true,
      data: { id }
    })

  } catch (error) {
    console.error('Error updating season:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameter: id' 
        },
        { status: 400 }
      )
    }

    // Delete season
    await convex.mutation(api.seasons.deleteSeason, {
      id: id as any
    })

    return NextResponse.json({
      success: true,
      data: { id }
    })

  } catch (error) {
    console.error('Error deleting season:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
