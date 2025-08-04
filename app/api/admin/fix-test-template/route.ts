export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { convexHttp } from '../../../../lib/db';
import { api } from '../../../../convex/_generated/api';
import { 
  requireAuthWithApiKeyBypass, 
  createErrorResponse, 
  createSuccessResponse 
} from '../../../../lib/api-utils';

export async function POST(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request);

    console.log('🔧 Fixing test template to be inactive...');
    
    // Mark the "Test Template Debug" as inactive
    const testTemplateId = 'js7b7g3myfhqgng268nxvagawh7n1rgj';
    
    try {
      await convexHttp.mutation(api.templates.updateTemplate, {
        id: testTemplateId,
        isActive: false
      });
      
      console.log('✅ Test template marked as inactive');
      
      return createSuccessResponse({ 
        message: 'Test template marked as inactive',
        templateId: testTemplateId
      });
    } catch (error) {
      console.error('❌ Failed to update template:', error);
      return createErrorResponse('Failed to update template', 500);
    }
    
  } catch (error) {
    console.error('Admin fix test template error:', error);
    return createErrorResponse('Failed to fix test template', 500);
  }
}