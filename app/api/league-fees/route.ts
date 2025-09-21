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

    if (parentId) {
      // Get league fees for a specific parent
      const leagueFees = await convex.query(api.leagueFees.getLeagueFeesByParent, { 
        parentId: parentId as any 
      })
      
      return NextResponse.json({
        success: true,
        data: leagueFees
      })
    } else if (seasonId) {
      // Get league fees for a specific season
      const leagueFees = await convex.query(api.leagueFees.getLeagueFeesBySeason, { 
        seasonId: seasonId as any,
        status: status || undefined
      })
      
      return NextResponse.json({
        success: true,
        data: leagueFees
      })
    } else {
      // Get overdue league fees
      const overdueFees = await convex.query(api.leagueFees.getOverdueLeagueFees)
      
      return NextResponse.json({
        success: true,
        data: overdueFees
      })
    }

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

    // Create league fee
    const leagueFeeId = await convex.mutation(api.leagueFees.createLeagueFee, {
      seasonId: seasonId as any,
      parentId: parentId as any,
      paymentMethod,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      notes
    })

    // Create reminder schedule for the league fee
    await convex.mutation(api.leagueFeeReminders.createReminderSchedule, {
      leagueFeeId
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

    // Bulk create league fees
    const result = await convex.mutation(api.leagueFees.bulkCreateLeagueFees, {
      seasonId: seasonId as any,
      paymentMethod,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined
    })

    // Create reminder schedules for all created fees
    const createdFees = result.results.filter(r => r.status === 'created')
    await Promise.all(
      createdFees.map(fee => 
        convex.mutation(api.leagueFeeReminders.createReminderSchedule, {
          leagueFeeId: fee.feeId
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: result
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
