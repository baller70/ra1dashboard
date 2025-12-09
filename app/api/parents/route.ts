export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser';
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

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    // Temporarily disabled for testing: await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const program = searchParams.get('program') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = Math.floor(parseInt(searchParams.get('offset') || '0') / limit) + 1

    // Fetch from Convex (do not rely on backend program filter; we'll apply strict matching here)
    const baseResult = await convex.query(api.parents.getParents, {
      page: 1, // fetch from the beginning; we'll paginate after filtering
      limit: Math.max(limit * 5, 500), // grab a wider slice to ensure enough after filtering
      search: search || undefined,
      status: status && status !== 'all' ? status : undefined
    });

    let parents = baseResult.parents as any[];

    // Program filtering: if program is specified, filter parents
    // For "yearly-program", include parents where no explicit program is set (default behavior)
    if (program) {
      const requested = String(program).trim();
      parents = parents.filter((p: any) => {
        const parentProg = String((p as any).program || '').trim();

        // If requesting "yearly-program", include parents with no explicit program (default)
        // as well as parents explicitly tagged as "yearly-program"
        if (requested === 'yearly-program') {
          return parentProg === '' || parentProg === 'yearly-program';
        }

        // For other programs, require explicit match
        return parentProg === requested;
      });
    }

    // Recompute pagination after filtering
    const total = parents.length;
    const offset = (page - 1) * limit;
    const pagedParents = parents.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        parents: pagedParents,
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

    // Allow duplicate emails as long as the name is different
    const existingParents = await convex.query(api.parents.getParents, {
      page: 1,
      limit: 1000
    });
    const normalize = (s: string) => (s || '').trim().toLowerCase();
    const existsSameCombo = existingParents.parents.some(
      (p: any) => normalize(p.email) === normalize(sanitizedData.email) && normalize(p.name) === normalize(sanitizedData.name)
    );
    if (existsSameCombo) {
      return NextResponse.json(
        { error: 'A parent with the same email and name already exists' },
        { status: 409 }
      )
    }

    // Create parent in Convex - convert null values to undefined for Convex compatibility
    const createData = {
      name: sanitizedData.name,
      email: sanitizedData.email,
      childName: sanitizedData.childName || undefined,
      parentEmail: sanitizedData.parentEmail || undefined,
      phone: sanitizedData.phone || undefined,
      address: sanitizedData.address || undefined,
      emergencyContact: sanitizedData.emergencyContact || undefined,
      emergencyPhone: sanitizedData.emergencyPhone || undefined,
      status: 'active',
      teamId: sanitizedData.teamId || undefined,
      notes: sanitizedData.notes || undefined,
      // Assign program when provided (including Yearly)
      program: (typeof body?.program === 'string' && body.program.trim())
        ? body.program.trim()
        : undefined,
    } as const;

    // Light PII-safe debug log
    try {
      console.debug('Parents POST createData keys:', Object.keys(createData));
    } catch {}

    let parentId: any;
    try {
      parentId = await convex.mutation(api.parents.createParent, createData);
    } catch (e: any) {
      console.error('Convex createParent failed:', e);
      const msg = e?.message || String(e);
      return NextResponse.json(
        { error: `Convex createParent failed: ${msg}` },
        { status: 500 }
      );
    }

    // Fetch full created parent for UI/state consistency
    let createdParent: any = null
    try {
      createdParent = await convex.query(api.parents.getParent, { id: parentId as any })
    } catch (e) {
      console.warn('Convex getParent after create failed:', e);
    }

    // Defensive: if a program was requested but the stored record lacks it, patch it now
    try {
      const requestedProgram = (typeof body?.program === 'string' && body.program.trim())
        ? body.program.trim()
        : undefined;
      if (requestedProgram && (!createdParent || !String((createdParent as any).program || '').trim())) {
        await convex.mutation(api.parents.updateParent, { id: parentId as any, program: requestedProgram });
        createdParent = await convex.query(api.parents.getParent, { id: parentId as any });
      }
    } catch (e) {
      console.warn('Post-create program patch skipped/failed:', e);
    }

    return createSuccessResponse(createdParent || { _id: parentId, name: sanitizedData.name, email: sanitizedData.email });
  } catch (error) {
    console.error('Parent creation error:', error)
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return createErrorResponse(ApiErrors.UNAUTHORIZED)
    }
    
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
