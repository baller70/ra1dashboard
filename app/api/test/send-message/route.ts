export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🧪 TEST: Creating new message log to test Messages Sent counter...')
    
    // Create a new test message log
    const newMessage = await convex.mutation(api.messageLogs.create, {
      parentId: "test-parent-id",
      parentName: "Test Parent",
      parentEmail: "test@example.com",
      subject: `Test Message ${Date.now()}`,
      content: "Test message content",
      channel: "email",
      type: "test",
      status: "sent",
      sentAt: Date.now()
    });
    
    console.log('✅ Created test message:', newMessage);
    
    // Check the new count
    const messages = await convex.query(api.messageLogs.getMessageLogs, { 
      page: 1, 
      limit: 10000
    });
    
    const messageCount = messages.messages?.length || 0;
    console.log('📊 New Messages Sent count:', messageCount);
    
    return NextResponse.json({
      success: true,
      messageId: newMessage,
      newMessageCount: messageCount,
      message: `Created test message. Messages count is now: ${messageCount}`
    });
    
  } catch (error) {
    console.error('Test send message error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
