export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { 
  requireAuthWithApiKeyBypass, 
  createErrorResponse, 
  createSuccessResponse 
} from '../../../../lib/api-utils';

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request);

    console.log('🔄 Fetching active templates count...');
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    let activeTemplatesCount = 0;
    
    try {
      // Get communication templates from the templates table
      const templates = await convex.query(api.templates.getTemplates, {
        page: 1,
        limit: 100,
        isActive: true
      });
      
      activeTemplatesCount = Array.isArray(templates) ? templates.length : (templates.templates?.length || 0);
      console.log(`📊 Found ${activeTemplatesCount} active communication templates`);
    } catch (templatesError) {
      console.warn('Communication templates query failed:', templatesError);
      activeTemplatesCount = 0;
    }
    
    const response = createSuccessResponse({
      activeTemplates: activeTemplatesCount,
      timestamp: Date.now()
    });
    
    // Add cache-busting headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    console.error('Active templates API error:', error);
    return createSuccessResponse({
      activeTemplates: 0,
      timestamp: Date.now()
    });
  }
}