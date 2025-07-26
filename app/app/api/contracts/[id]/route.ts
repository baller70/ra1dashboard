
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'

const convexHttp = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    const contractId = params.id as Id<"contracts">
    
    // Fetch contract from Convex
    const contract = await convexHttp.query(api.contracts.getContract, { 
      id: contractId 
    })
    
    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Contract fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const contractId = params.id as Id<"contracts">
    
    console.log('Contract update requested:', params.id, body);

    // Update contract in Convex
    const updatedContract = await convexHttp.mutation(api.contracts.updateContract, {
      id: contractId,
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt).getTime() : undefined
    })

    return NextResponse.json({
      success: true,
      contract: updatedContract,
      message: 'Contract updated successfully'
    })
  } catch (error) {
    console.error('Contract update error:', error)
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    const contractId = params.id as Id<"contracts">
    console.log('Contract deletion requested:', params.id);

    // Delete contract from Convex
    await convexHttp.mutation(api.contracts.deleteContract, {
      id: contractId
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Contract deleted successfully' 
    })
  } catch (error) {
    console.error('Contract deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete contract' },
      { status: 500 }
    )
  }
}
