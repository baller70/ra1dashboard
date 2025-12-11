export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  isDatabaseError,
  ApiErrors 
} from '../../../lib/api-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const program = searchParams.get('program') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { childName: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (status && status !== 'all') {
      where.status = status
    }

    if (program) {
      if (program === 'yearly-program') {
        where.OR = [
          { program: 'yearly-program' },
          { program: null },
          { program: '' }
        ]
      } else {
        where.program = program
      }
    }

    // Fetch from PostgreSQL via Prisma
    const [parents, total] = await Promise.all([
      prisma.parents.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          teams: true
        }
      }),
      prisma.parents.count({ where })
    ])

    // Transform to match expected format
    const transformedParents = parents.map(p => ({
      _id: p.id,
      id: p.id,
      name: p.name,
      email: p.email,
      childName: p.childName,
      parentEmail: p.parentEmail,
      phone: p.phone,
      address: p.address,
      emergencyContact: p.emergencyContact,
      emergencyPhone: p.emergencyPhone,
      emergencyEmail: p.emergencyEmail,
      status: p.status,
      contractStatus: p.contractStatus,
      contractUrl: p.contractUrl,
      stripeCustomerId: p.stripeCustomerId,
      teamId: p.teamId,
      team: p.teams ? { _id: p.teams.id, id: p.teams.id, name: p.teams.name, color: p.teams.color } : null,
      program: p.program,
      notes: p.notes,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: {
        parents: transformedParents,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Parents fetch error:', error)
    
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: 'Unable to connect to the database. Please try again later.' 
        },
        { status: 503 }
      )
    }

    if (isDatabaseError(error)) {
      return createErrorResponse(ApiErrors.DATABASE_ERROR)
    }

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Normalize empty strings to null
    const normalizedBody = Object.fromEntries(
      Object.entries(body || {}).map(([key, value]) => {
        if (typeof value === 'string' && value.trim() === '') {
          return [key, null]
        }
        return [key, value]
      })
    )

    // Check for duplicate name+email combination
    const existingSameCombo = await prisma.parents.findFirst({
      where: {
        email: { equals: normalizedBody.email, mode: 'insensitive' },
        name: { equals: normalizedBody.name, mode: 'insensitive' }
      }
    })

    if (existingSameCombo) {
      return NextResponse.json(
        { error: 'A parent with the same email and name already exists' },
        { status: 409 }
      )
    }

    // Create parent in PostgreSQL
    const createdParent = await prisma.parents.create({
      data: {
        name: normalizedBody.name,
        email: normalizedBody.email,
        childName: normalizedBody.childName || null,
        parentEmail: normalizedBody.parentEmail || null,
        phone: normalizedBody.phone || null,
        address: normalizedBody.address || null,
        emergencyContact: normalizedBody.emergencyContact || null,
        emergencyPhone: normalizedBody.emergencyPhone || null,
        status: 'active',
        teamId: normalizedBody.teamId || null,
        notes: normalizedBody.notes || null,
        program: normalizedBody.program || 'yearly-program'
      },
      include: {
        teams: true
      }
    })

    const transformed = {
      _id: createdParent.id,
      id: createdParent.id,
      name: createdParent.name,
      email: createdParent.email,
      childName: createdParent.childName,
      phone: createdParent.phone,
      status: createdParent.status,
      teamId: createdParent.teamId,
      team: createdParent.teams ? { _id: createdParent.teams.id, name: createdParent.teams.name } : null,
      program: createdParent.program,
      createdAt: createdParent.createdAt?.toISOString()
    }

    return createSuccessResponse(transformed)
  } catch (error) {
    console.error('Parent creation error:', error)
    
    if (isDatabaseError(error)) {
      return createErrorResponse(ApiErrors.DATABASE_ERROR)
    }

    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create parent: ${errMsg}` },
      { status: 500 }
    )
  }
}
