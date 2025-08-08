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

    console.log('🧪 TEST: Creating new template to test Active Templates counter...')
    
    // Create a new test template
    const newTemplate = await convex.mutation(api.templates.createTemplate, {
      name: `Test Counter Template ${Date.now()}`,
      subject: "Test Subject",
      body: "Test body content",
      category: "general",
      channel: "email",
      type: "general",
      isActive: true
    });
    
    console.log('✅ Created test template:', newTemplate);
    
    // Check the new count
    const templates = await convex.query(api.templates.getTemplates, { 
      page: 1, 
      limit: 10000,
      isActive: true
    });
    
    const activeCount = templates.templates?.length || 0;
    console.log('📊 New Active Templates count:', activeCount);
    console.log('📋 All active template names:', templates.templates?.map(t => t.name));
    
    return NextResponse.json({
      success: true,
      templateId: newTemplate,
      newActiveCount: activeCount,
      activeTemplates: templates.templates?.map(t => ({ id: t._id, name: t.name })),
      message: `Created test template. Active count is now: ${activeCount}`
    });
    
  } catch (error) {
    console.error('Test create template error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
