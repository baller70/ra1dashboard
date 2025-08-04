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

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'analyze';
    
    console.log('🔧 Running data cleanup action:', action);
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    let result;
    
    switch (action) {
      case 'analyze':
        result = await convex.query(api.dataCleanup.analyzeDataIntegrity);
        break;
      case 'validate-installments':
        result = await convex.query(api.dataCleanup.validateInstallmentData);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    console.log('🔧 Data cleanup result:', {
      action,
      issues: result.issues?.length || result.issuesFound || 0,
      summary: result.summary
    });
    
    return createSuccessResponse({
      success: true,
      action,
      data: result,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Data cleanup API error:', error);
    return createErrorResponse('Failed to run data cleanup', 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request);

    const body = await request.json();
    const { action, dryRun = true, confirmCleanup = false } = body;
    
    console.log('🔧 Running data cleanup mutation:', { action, dryRun, confirmCleanup });
    
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    let result;
    
    switch (action) {
      case 'cleanup-orphaned':
        result = await convex.mutation(api.dataCleanup.cleanupOrphanedRecords, {
          confirmCleanup,
          dryRun
        });
        break;
      case 'sync-payment-statuses':
        result = await convex.mutation(api.dataCleanup.syncPaymentStatuses, {
          dryRun
        });
        break;
      case 'update-overdue':
        result = await convex.mutation(api.dataCleanup.updateOverdueInstallments, {
          dryRun
        });
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    console.log('🔧 Data cleanup mutation result:', {
      action,
      success: result.success,
      message: result.message
    });
    
    return createSuccessResponse({
      success: true,
      action,
      data: result,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Data cleanup mutation error:', error);
    return createErrorResponse(error instanceof Error ? error.message : 'Failed to run data cleanup', 500);
  }
}