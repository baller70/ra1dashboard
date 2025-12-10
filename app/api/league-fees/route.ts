export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { convexHttp } from "@/lib/convex-server"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// TEMPORARY: Mock parents data for league fee creation
const mockParents = [
  { _id: "j971g9n5ve0qqsby21a0k9n1js7n7tbx", name: "Kevin Houston", email: "khouston721@gmail.com", status: "active" },
  { _id: "j972g9n5ve0qqsby21a0k9n1js7n7tby", name: "Sarah Johnson", email: "sarah.johnson@email.com", status: "active" },
  { _id: "j973g9n5ve0qqsby21a0k9n1js7n7tbz", name: "Mike Davis", email: "mike.davis@email.com", status: "active" },
  { _id: "j974g9n5ve0qqsby21a0k9n1js7n7tc0", name: "Lisa Wilson", email: "lisa.wilson@email.com", status: "active" },
  { _id: "j975g9n5ve0qqsby21a0k9n1js7n7tc1", name: "Tom Brown", email: "tom.brown@email.com", status: "active" }
]

// TEMPORARY: In-memory storage for mock league fees until Convex functions are deployed
// Exported for use by send-reminder route
export let mockLeagueFees: any[] = [
  {
    _id: "temp_fee_1",
    parentId: "j971g9n5ve0qqsby21a0k9n1js7n7tbx",
    seasonId: "temp_season_1",
    amount: 95,
    processingFee: 3.06,
    totalAmount: 98.06,
    paymentMethod: "online",
    status: "pending",
    dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
    remindersSent: 0,
    lastReminderSent: null,
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
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const seasonId = searchParams.get('seasonId')
    const status = searchParams.get('status')
    const feeId = searchParams.get('feeId')

    // Filter league fees based on query parameters
    // Prefer Convex persistence; fallback to mock in-memory list for local/dev
    let filteredFees: any[] = []
    try {
      if (feeId) {
        const fee = await convexHttp.query(api.leagueFees.getLeagueFee as any, { id: feeId as any })
        if (fee) {
          const parent = await convexHttp.query(api.parents.getParent as any, { id: fee.parentId as any }).catch(() => null)
          const season = await convexHttp.query(api.seasons.getSeason as any, { id: fee.seasonId as any }).catch(() => null)
          filteredFees = [{ ...fee, parent, season }]
        }
      } else if (parentId) {
        const fees = await convexHttp.query(api.leagueFees.getLeagueFeesByParent as any, { parentId: parentId as any })
        filteredFees = fees as any[]
      } else if (seasonId) {
        const fees = await convexHttp.query(api.leagueFees.getLeagueFeesBySeason as any, { seasonId: seasonId as any, status: status || undefined })
        filteredFees = fees as any[]
      }
    } catch (e) {
      console.warn('Convex leagueFees query failed; falling back to mock', e)
    }
    if (!filteredFees || filteredFees.length === 0) {
      filteredFees = mockLeagueFees
      if (feeId) filteredFees = filteredFees.filter(fee => fee._id === feeId)
      else {
        if (parentId) filteredFees = filteredFees.filter(fee => fee.parentId === parentId)
        if (seasonId) filteredFees = filteredFees.filter(fee => fee.seasonId === seasonId)
        if (status) filteredFees = filteredFees.filter(fee => fee.status === status)
      }
    }

    if (feeId) {
      filteredFees = filteredFees.filter(fee => fee._id === feeId)
    } else {
      if (parentId) {
        filteredFees = filteredFees.filter(fee => fee.parentId === parentId)
      }

      if (seasonId) {
        filteredFees = filteredFees.filter(fee => fee.seasonId === seasonId)
      }

      if (status) {
        filteredFees = filteredFees.filter(fee => fee.status === status)
      }
    }

    return NextResponse.json({
      success: true,
      data: filteredFees
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

async function findOrCreateSeason(convex: any, name: string, type: string, year: number) {
  const existing = await convex.query(api.seasons.getSeasonsByTypeAndYear as any, { type, year }).catch(() => []);
  if (existing && existing.length > 0) return existing[0];
  const now = Date.now();
  const startDate = now;
  const endDate = now + 90 * 24 * 60 * 60 * 1000;
  const seasonId = await convex.mutation(api.seasons.createSeason as any, {
    name,
    type,
    year,
    startDate,
    endDate,
    registrationDeadline: endDate,
  });
  const created = await convex.query(api.seasons.getSeason as any, { id: seasonId });
  return created;
}

export async function POST(request: NextRequest) {
  try {
    const { seasonId, seasonName, seasonType, seasonYear, parentId, paymentMethod, dueDate, notes, amount } = await request.json()

    if ((!seasonId && !(seasonName && seasonType && seasonYear)) || !parentId || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: parentId, paymentMethod, and seasonId or seasonName/seasonType/seasonYear'
        },
        { status: 400 }
      )
    }

    let finalSeasonId = seasonId
    if (!finalSeasonId) {
      const season = await findOrCreateSeason(convexHttp, seasonName, seasonType, Number(seasonYear))
      finalSeasonId = season._id
    }

    // Resolve parent from Convex first; fallback to mock for local dev
    let parent: any = null
    try {
      parent = await convexHttp.query(api.parents.getParent as any, { id: parentId as any })
    } catch (e) {
      console.warn('Convex parents.getParent failed; falling back to mockParents', e)
    }
    if (!parent) {
      parent = mockParents.find(p => p._id === parentId) || null
    }
    if (!parent) {
      return NextResponse.json(
        { success: false, error: 'Parent not found' },
        { status: 404 }
      )
    }

    // Check if fee already exists for this parent and season
    const existingFee = mockLeagueFees.find(fee =>
      fee.parentId === parentId && fee.seasonId === finalSeasonId
    )

    if (existingFee) {
      return NextResponse.json(
        {
          success: false,
          error: `League fee already exists for this parent for the ${seasonName || 'selected'} season`
        },
        { status: 409 }
      )
    }

    const timestamp = Date.now()
    const leagueFeeId = `temp_fee_${timestamp}`
    const feeAmount = amount || 95
    const processingFee = paymentMethod === 'online' ? Math.round(feeAmount * 0.029 + 30) / 100 : 0
    const totalAmount = feeAmount + processingFee
    const dueDateTimestamp = dueDate ? new Date(dueDate).getTime() : timestamp + (30 * 24 * 60 * 60 * 1000)

    const newFee = {
      _id: leagueFeeId,
      parentId: parentId,
      seasonId: finalSeasonId,
      amount: feeAmount,
      processingFee: processingFee,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      status: "pending",
      dueDate: dueDateTimestamp,
      remindersSent: 0,
      lastReminderSent: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      notes: notes || '',
      season: {
        _id: finalSeasonId,
        name: seasonName || "New Season",
        type: seasonType || "summer_league",
        year: seasonYear || new Date().getFullYear()
      },
      parent: parent
    }

    // Prefer Convex persistence; fallback to in-memory on failure
    try {
      const createdId = await convexHttp.mutation(api.leagueFees.createLeagueFee as any, {
        seasonId: finalSeasonId as any,
        parentId: parent._id as any,
        paymentMethod,
        dueDate: dueDateTimestamp,
        notes,
      })
      console.log('League fee created in Convex:', { createdId, parentName: parent.name, seasonId, amount: feeAmount, totalAmount, paymentMethod, dueDate: new Date(dueDateTimestamp).toISOString() })
      return NextResponse.json({ success: true, data: { leagueFeeId: createdId } })
    } catch (e) {
      console.warn('Convex createLeagueFee failed; falling back to in-memory', e)
      // Add to our in-memory storage
      mockLeagueFees.push(newFee)
      console.log('Individual league fee created (mock):', {
        leagueFeeId,
        parentName: parent.name,
        seasonId,
        amount: feeAmount,
        totalAmount,
        paymentMethod,
        dueDate: new Date(dueDateTimestamp).toISOString()
      })
      return NextResponse.json({ success: true, data: { leagueFeeId, fee: newFee } })
    }

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

    // TEMPORARY: Create actual mock league fees that will persist in memory
    const mockParents = [
      { _id: "j971g9n5ve0qqsby21a0k9n1js7n7tbx", name: "Kevin Houston", email: "khouston721@gmail.com" },
      { _id: "parent_2", name: "Sarah Johnson", email: "sarah.johnson@email.com" },
      { _id: "parent_3", name: "Mike Davis", email: "mike.davis@email.com" },
      { _id: "parent_4", name: "Lisa Wilson", email: "lisa.wilson@email.com" },
      { _id: "parent_5", name: "Tom Brown", email: "tom.brown@email.com" }
    ]

    const timestamp = Date.now()
    const dueDateTimestamp = dueDate ? new Date(dueDate).getTime() : timestamp + (30 * 24 * 60 * 60 * 1000)

    // Remove existing fees for this season to avoid duplicates
    mockLeagueFees = mockLeagueFees.filter(fee => fee.seasonId !== seasonId)

    const createdFees = mockParents.map((parent, index) => {
      const feeId = `temp_fee_${timestamp}_${index + 1}`
      const newFee = {
        _id: feeId,
        parentId: parent._id,
        seasonId: seasonId,
        amount: 95,
        processingFee: 3.06,
        totalAmount: 98.06,
        paymentMethod: paymentMethod,
        status: "pending",
        dueDate: dueDateTimestamp,
        remindersSent: 0,
        lastReminderSent: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        season: {
          _id: seasonId,
          name: seasonId === "temp_season_1" ? "Summer League 2024" : "New Season",
          type: "summer_league",
          year: 2024
        },
        parent: parent
      }

      // Add to our in-memory storage
      mockLeagueFees.push(newFee)

      return {
        status: 'created',
        feeId: feeId,
        parentName: parent.name
      }
    })

    const result = {
      success: true,
      created: createdFees.length,
      skipped: 0,
      errors: 0,
      results: createdFees
    }

    console.log('Bulk league fees created (mock):', {
      seasonId,
      paymentMethod,
      dueDate,
      result,
      totalFeesInMemory: mockLeagueFees.length
    })

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

// mockLeagueFees is already exported at declaration (line 21)
