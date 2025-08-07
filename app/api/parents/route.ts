
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../lib/db'
import { api } from '../../../convex/_generated/api'
import { 
  requireAuth, 
  createErrorResponse, 
  createSuccessResponse, 
  isDatabaseError,
  ApiErrors 
} from '../../../lib/api-utils'
import { 
  CreateParentSchema, 
  validateData, 
  sanitizeParentData 
} from '../../../lib/validation'

export async function GET(request: Request) {
  try {
    // Temporarily disabled for testing: await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = Math.floor(parseInt(searchParams.get('offset') || '0') / limit) + 1

    // Get parents from Convex
    const result = await convexHttp.query(api.parents.getParents, {
      page,
      limit,
      search: search || undefined,
      status: status && status !== 'all' ? status : undefined,
    });

    // Transform response to match expected format
    return NextResponse.json({
      success: true,
      data: {
        parents: result.parents,
        pagination: {
          total: result.pagination.total,
          limit: result.pagination.limit,
          offset: (result.pagination.page - 1) * result.pagination.limit,
          hasMore: result.pagination.page < result.pagination.pages
        }
      }
    });
  } catch (error) {
    console.error('Parents fetch error:', error)
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: 'Unable to connect to the database. Please try again later.' 
        },
        { status: 503 }
      )
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return createErrorResponse(ApiErrors.UNAUTHORIZED)
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
    // Temporarily disable auth for development
    // await requireAuth()

    const body = await request.json()
    // Normalize empty strings to null so optional fields pass validation
    const normalizedBody = Object.fromEntries(
      Object.entries(body || {}).map(([key, value]) => {
        if (typeof value === 'string' && value.trim() === '') {
          return [key, null]
        }
        return [key, value]
      })
    )
    
    // Validate and sanitize input data
    const validatedData = validateData(CreateParentSchema, normalizedBody)
    const sanitizedData = sanitizeParentData(validatedData)

    // Check if email already exists - get all parents and check
    const existingParents = await convexHttp.query(api.parents.getParents, {
      page: 1,
      limit: 1000, // Get all to check for duplicates
    });

    const existingParent = existingParents.parents.find(p => p.email === sanitizedData.email);

    if (existingParent) {
      return NextResponse.json(
        { error: 'A parent with this email already exists' },
        { status: 409 }
      )
    }

    // Create parent in Convex - convert null values to undefined for Convex compatibility
    const createData = {
      name: sanitizedData.name,
      email: sanitizedData.email,
      phone: sanitizedData.phone || undefined,
      address: sanitizedData.address || undefined,
      emergencyContact: sanitizedData.emergencyContact || undefined,
      emergencyPhone: sanitizedData.emergencyPhone || undefined,
      status: 'active',
      teamId: sanitizedData.teamId || undefined,
      notes: sanitizedData.notes || undefined,
    };
    
    const parentId = await convexHttp.mutation(api.parents.createParent, createData);

    // Fetch full created parent for UI/state consistency
    let createdParent: any = null
    try {
      createdParent = await convexHttp.query(api.parents.getParent, { id: parentId as any })
    } catch {}

    return createSuccessResponse(createdParent || { _id: parentId, name: sanitizedData.name, email: sanitizedData.email });
  } catch (error) {
    console.error('Parent creation error:', error)
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return createErrorResponse(ApiErrors.UNAUTHORIZED)
    }
    
    if (isDatabaseError(error)) {
      return createErrorResponse(ApiErrors.DATABASE_ERROR)
    }

    return NextResponse.json(
      { error: 'Failed to create parent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
