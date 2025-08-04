export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'

export async function POST(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔧 FIXING: Marking "Test Test Template" as INACTIVE...')
    
    // Mark the specific template as inactive
    const result = await convexHttp.mutation(api.templates.updateTemplate, {
      id: "js7djhh2zer4g6jze84qfasxnx7n1ech" as any,
      isActive: false
    });
    
    console.log('✅ Template marked as inactive:', result);
    
    // Verify the fix
    const templates = await convexHttp.query(api.templates.getTemplates, {
      page: 1,
      limit: 1000,
      isActive: true
    });
    
    console.log('✅ Active templates now:', templates.templates?.map(t => ({ name: t.name, isActive: t.isActive })));
    
    return NextResponse.json({
      success: true,
      message: 'Test Test Template marked as inactive',
      activeCount: templates.templates?.length || 0,
      activeTemplates: templates.templates?.map(t => t.name)
    })
    
  } catch (error) {
    console.error('💥 Fix failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}