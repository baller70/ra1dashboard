
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../../lib/api-utils'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
    
    // For now, return empty array since template versioning isn't implemented in Convex yet
    // TODO: Implement template versioning in Convex schema and create queries
    const versions: any[] = [];

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Template versions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template versions' },
      { status: 500 }
    )
  }
}
