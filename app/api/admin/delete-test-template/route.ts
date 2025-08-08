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

    console.log('🗑️ DELETING: "Test Test Template" completely...')
    
    // Delete the specific template completely
    const result = await convex.mutation(api.templates.deleteTemplate, {
      id: "js7djhh2zer4g6jze84qfasxnx7n1ech" as any
    });
    
    console.log('✅ Template deleted:', result);
    
    // Verify the fix
    const templates = await convex.query(api.templates.getTemplates, {
      page: 1,
      limit: 1000,
      isActive: true
    });
    
    console.log('✅ Active templates now:', templates.templates?.map(t => ({ name: t.name, isActive: t.isActive })));
    
    return NextResponse.json({
      success: true,
      message: 'Test Test Template DELETED completely',
      activeCount: templates.templates?.length || 0,
      activeTemplates: templates.templates?.map(t => t.name)
    })
    
  } catch (error) {
    console.error('💥 Delete failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
