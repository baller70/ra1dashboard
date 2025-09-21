export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const withStats = searchParams.get('withStats') === 'true'

    // TEMPORARY: Return mock data until Convex functions are deployed
    const mockSeasons = [
      {
        _id: "temp_season_1",
        name: "Summer League 2024",
        type: "summer_league",
        year: 2024,
        startDate: Date.now(),
        endDate: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days from now
        registrationDeadline: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true,
        description: "Summer basketball league program",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stats: withStats ? {
          totalFees: 0,
          paidFees: 0,
          pendingFees: 0,
          overdueFees: 0,
          totalRevenue: 0
        } : undefined
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockSeasons
    })

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

    // TEMPORARY: Mock season creation until Convex functions are deployed
    const seasonId = `temp_season_${Date.now()}`

    console.log('Season created (mock):', {
      seasonId,
      name,
      type,
      year,
      startDate,
      endDate,
      registrationDeadline,
      description
    })

    return NextResponse.json({
      success: true,
      data: { seasonId }
    })

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
