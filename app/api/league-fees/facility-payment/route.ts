export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'

// Mock league fees data (should be shared with main route)
let mockLeagueFees: any[] = [
  {
    _id: "temp_fee_1",
    parentId: "j971g9n5ve0qqsby21a0k9n1js7n7tbx",
    seasonId: "temp_season_1",
    amount: 95,
    processingFee: 3.06,
    totalAmount: 98.06,
    paymentMethod: "online",
    status: "pending",
    dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
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
]

export async function POST(request: NextRequest) {
  try {
    const { feeId, parentId } = await request.json()

    if (!feeId || !parentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: feeId, parentId'
        },
        { status: 400 }
      )
    }

    // Find the league fee
    const feeIndex = mockLeagueFees.findIndex(fee => fee._id === feeId && fee.parentId === parentId)
    
    if (feeIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'League fee not found'
        },
        { status: 404 }
      )
    }

    const fee = mockLeagueFees[feeIndex]

    // Check if already paid
    if (fee.status === 'paid') {
      return NextResponse.json(
        {
          success: false,
          error: 'This fee has already been paid'
        },
        { status: 409 }
      )
    }

    // Mark as paid and update payment method to facility
    mockLeagueFees[feeIndex] = {
      ...fee,
      status: 'paid',
      paymentMethod: 'facility',
      paidAt: Date.now(),
      updatedAt: Date.now(),
      // Remove processing fee for facility payments
      processingFee: 0,
      totalAmount: fee.amount,
      paymentNote: 'Paid at facility - confirmed by parent'
    }

    console.log('League fee marked as paid at facility:', {
      feeId,
      parentName: fee.parent.name,
      amount: fee.amount,
      season: fee.season.name
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Payment confirmed! Your league fee has been marked as paid.',
        fee: mockLeagueFees[feeIndex]
      }
    })

  } catch (error) {
    console.error('Error processing facility payment:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feeId = searchParams.get('feeId')
    const parentId = searchParams.get('parentId')

    if (!feeId || !parentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: feeId, parentId'
        },
        { status: 400 }
      )
    }

    // Find the league fee
    const fee = mockLeagueFees.find(f => f._id === feeId && f.parentId === parentId)
    
    if (!fee) {
      return NextResponse.json(
        {
          success: false,
          error: 'League fee not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: fee
    })

  } catch (error) {
    console.error('Error fetching league fee for facility payment:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
