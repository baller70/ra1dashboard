export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const seasonId = searchParams.get('seasonId')
    const status = searchParams.get('status')

    // TEMPORARY: Return mock league fees until Convex functions are deployed
    const mockLeagueFees = [
      {
        _id: "temp_fee_1",
        parentId: parentId || "j971g9n5ve0qqsby21a0k9n1js7n7tbx",
        seasonId: seasonId || "temp_season_1",
        amount: 95,
        processingFee: 3.06,
        totalAmount: 98.06,
        paymentMethod: "online",
        status: status || "pending",
        dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        remindersSent: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        season: {
          _id: "temp_season_1",
          name: "Summer League 2024",
          type: "summer_league",
          year: 2024
        },
        parent: {
          _id: "j971g9n5ve0qqsby21a0k9n1js7n7tbx",
          name: "Kevin Houston",
          email: "khouston721@gmail.com"
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockLeagueFees
    })

  } catch (error) {
    console.error('Error fetching league fees:', error)
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
    const { seasonId, parentId, paymentMethod, dueDate, notes } = await request.json()

    if (!seasonId || !parentId || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: seasonId, parentId, paymentMethod'
        },
        { status: 400 }
      )
    }

    // TEMPORARY: Mock league fee creation until Convex functions are deployed
    const leagueFeeId = `temp_fee_${Date.now()}`

    console.log('League fee created (mock):', {
      leagueFeeId,
      seasonId,
      parentId,
      paymentMethod,
      dueDate,
      notes
    })

    return NextResponse.json({
      success: true,
      data: { leagueFeeId }
    })

  } catch (error) {
    console.error('Error creating league fee:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// Bulk create league fees for all parents in a season
export async function PUT(request: NextRequest) {
  try {
    const { seasonId, paymentMethod, dueDate } = await request.json()

    if (!seasonId || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: seasonId, paymentMethod'
        },
        { status: 400 }
      )
    }

    // TEMPORARY: Mock bulk league fee creation until Convex functions are deployed
    const mockResult = {
      success: true,
      created: 5,
      skipped: 0,
      errors: 0,
      results: [
        { status: 'created', feeId: `temp_fee_${Date.now()}_1`, parentName: 'Kevin Houston' },
        { status: 'created', feeId: `temp_fee_${Date.now()}_2`, parentName: 'Parent 2' },
        { status: 'created', feeId: `temp_fee_${Date.now()}_3`, parentName: 'Parent 3' },
        { status: 'created', feeId: `temp_fee_${Date.now()}_4`, parentName: 'Parent 4' },
        { status: 'created', feeId: `temp_fee_${Date.now()}_5`, parentName: 'Parent 5' }
      ]
    }

    console.log('Bulk league fees created (mock):', {
      seasonId,
      paymentMethod,
      dueDate,
      result: mockResult
    })

    return NextResponse.json({
      success: true,
      data: mockResult
    })

  } catch (error) {
    console.error('Error bulk creating league fees:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
