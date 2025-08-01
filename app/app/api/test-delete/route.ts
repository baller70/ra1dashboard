export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../lib/api-utils'

export async function DELETE(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    console.log('Test DELETE endpoint called successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test DELETE endpoint working' 
    })
  } catch (error) {
    console.error('Test DELETE error:', error)
    return NextResponse.json(
      { error: 'Test DELETE failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}