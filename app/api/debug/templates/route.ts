export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔍 DEBUG: Fetching ALL templates from database...')
    
    const templates = await convex.query(api.templates.getTemplates, {
      page: 1,
      limit: 1000,
      isActive: true  // Only active ones
    });
    
    console.log('🔍 ALL ACTIVE TEMPLATES:', templates.templates?.map(t => ({ 
      id: t._id,
      name: t.name, 
      isActive: t.isActive,
      createdAt: t.createdAt
    })));
    
    return NextResponse.json({
      success: true,
      count: templates.templates?.length || 0,
      templates: templates.templates?.map(t => ({ 
        id: t._id,
        name: t.name, 
        isActive: t.isActive,
        createdAt: t.createdAt,
        body: t.body?.substring(0, 50) + '...'
      }))
    })
    
  } catch (error) {
    console.error('💥 Debug templates failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
