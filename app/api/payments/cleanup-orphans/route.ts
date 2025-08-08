export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function POST(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    const result = await convexHttp.mutation(
      (api as any).dataCleanup.cleanupOrphanedRecords,
      { confirmCleanup: true, dryRun: false }
    )

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Cleanup failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  // Allow GET as a convenience trigger
  return POST(request)
}

