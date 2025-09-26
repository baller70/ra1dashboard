export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { api } from '../../../../convex/_generated/api'
import { convexHttp } from '../../../../lib/convex-server'

// Simple audit endpoint to log parent deletion attempts and outcomes
// Stores records in messageLogs with type: 'audit' and channel: 'system'
export async function POST(request: NextRequest) {
  try {
    // Softly require auth; we want to log even if user session is missing in preview
    try { await requireAuthWithApiKeyBypass(request) } catch (_) { /* noop */ }

    const { stage, parentId, parentEmail, parentName, teamId, teamName, counts, outcome, error } = await request.json()

    const subject = `[AUDIT] Parent delete ${stage}`
    const content = JSON.stringify({ stage, parentId, parentEmail, parentName, teamId, teamName, counts, outcome, error, at: Date.now() })

    await convexHttp.mutation(api.messageLogs.createMessageLog as any, {
      parentId: String(parentId || 'unknown'),
      subject,
      body: content,
      content,
      channel: 'system',
      type: 'audit',
      status: outcome || 'info',
      sentAt: Date.now(),
      metadata: { stage, teamId, teamName, counts, error }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Audit log error', e)
    return NextResponse.json({ success: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}

