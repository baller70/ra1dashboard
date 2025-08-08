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

    console.log('🔥 FORCE DELETE: Removing Test Test Template completely...')
    
    const templateId = "js7djhh2zer4g6jze84qfasxnx7n1ech";
    
    // Try to delete the template
    try {
      const result = await convex.mutation(api.templates.deleteTemplate, {
        id: templateId as any
      });
      console.log('✅ Delete result:', result);
    } catch (deleteError) {
      console.error('❌ Delete failed:', deleteError);
      
      // If delete fails, try to mark as inactive
      try {
        console.log('🔄 Trying to mark as inactive instead...');
        const updateResult = await convex.mutation(api.templates.updateTemplate, {
          id: templateId as any,
          isActive: false
        });
        console.log('✅ Marked as inactive:', updateResult);
      } catch (updateError) {
        console.error('❌ Update also failed:', updateError);
      }
    }
    
    // Verify the result
    const templates = await convex.query(api.templates.getTemplates, {
      page: 1,
      limit: 1000,
      isActive: true
    });
    
    const activeCount = templates.templates?.length || 0;
    console.log('📊 Final Active Templates count:', activeCount);
    console.log('📋 Remaining templates:', templates.templates?.map(t => ({ id: t._id, name: t.name })));
    
    return NextResponse.json({
      success: true,
      finalActiveCount: activeCount,
      remainingTemplates: templates.templates?.map(t => ({ id: t._id, name: t.name })),
      message: `Force delete complete. Active count: ${activeCount}`
    });
    
  } catch (error) {
    console.error('Force delete error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
