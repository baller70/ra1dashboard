
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/api-utils'
import { convexHttp } from '../../../lib/db'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

export async function GET(request: Request) {
  try {
    await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const parentId = searchParams.get('parentId')
    const templateType = searchParams.get('templateType')

    const result = await convexHttp.query(api.contracts.getContracts, {
      page,
      limit,
      status: status || undefined,
      parentId: parentId ? parentId as Id<"parents"> : undefined,
      templateType: templateType || undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Contracts fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const {
      parentId,
      fileName,
      originalName,
      fileUrl,
      fileSize,
      mimeType,
      templateType,
      notes,
      expiresAt
    } = body

    // Basic validation
    if (!parentId || !fileName || !fileUrl) {
      return NextResponse.json(
        { error: 'Parent ID, file name, and file URL are required' },
        { status: 400 }
      )
    }

    const contractId = await convexHttp.mutation(api.contracts.createContract, {
      parentId: parentId as Id<"parents">,
      fileName,
      originalName: originalName || fileName,
      fileUrl,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/pdf',
      templateType,
      notes,
      expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
    })

    return NextResponse.json({
      success: true,
      contractId,
      message: 'Contract created successfully'
    })
  } catch (error) {
    console.error('Contract creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    )
  }
}
