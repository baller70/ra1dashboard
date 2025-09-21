export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { leagueFeeId, parentId } = await request.json()

    if (!leagueFeeId || !parentId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: leagueFeeId, parentId' 
        },
        { status: 400 }
      )
    }

    // Send league fee reminder
    const result = await convex.mutation(api.leagueFeeReminders.sendLeagueFeeReminder, {
      leagueFeeId: leagueFeeId as any,
      parentId: parentId as any,
      reminderType: 'manual'
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error sending league fee reminder:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
