export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const withStats = searchParams.get('withStats') === 'true'

    if (withStats) {
      // Get seasons with statistics
      const seasons = await convex.query(api.seasons.getSeasonsWithStats)
      return NextResponse.json({
        success: true,
        data: seasons
      })
    } else {
      // Get basic seasons
      const seasons = await convex.query(api.seasons.getSeasons)
      return NextResponse.json({
        success: true,
        data: seasons
      })
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

    // Create season
    const seasonId = await convex.mutation(api.seasons.createSeason, {
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
