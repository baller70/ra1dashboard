
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    // Temporarily disabled for testing: await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    // Fetch message logs from Convex
    const messageLogsResponse = await convexHttp.query(api.messageLogs.getMessageLogs, {
      parentId: parentId || undefined,
      channel: channel || undefined,
      status: status || undefined,
      type: type || undefined,
      limit,
      page,
    })

    // Transform the response to include parent information
    const messages = messageLogsResponse.messages.map((message: any) => ({
      id: message._id,
      parentId: message.parentId,
      parentName: message.parent?.name || 'Unknown Parent',
      parentEmail: message.parent?.email || '',
      subject: message.subject,
      body: message.body || message.content,
      channel: message.channel || 'email',
      type: message.type || 'custom',
      status: message.status,
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      templateId: message.templateId,
      templateName: message.templateName,
      metadata: message.metadata,
      failureReason: message.failureReason,
      errorMessage: message.errorMessage,
    }))

    return NextResponse.json({
      messages,
      pagination: {
        total: messageLogsResponse.pagination.total,
        limit,
        page,
        totalPages: Math.ceil(messageLogsResponse.pagination.total / limit),
        hasMore: messageLogsResponse.pagination.hasMore
      },
      summary: {
        totalMessages: messageLogsResponse.pagination.total,
        byStatus: {},
        byChannel: {},
        byType: {},
      }
    })
  } catch (error) {
    console.error('Message history fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch message history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
