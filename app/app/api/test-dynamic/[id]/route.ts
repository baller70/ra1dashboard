export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    const testId = params.id
    console.log('Test dynamic GET request for ID:', testId)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test dynamic GET endpoint working',
      id: testId
    })
  } catch (error) {
    console.error('Test dynamic GET error:', error)
    return NextResponse.json(
      { error: 'Test dynamic GET failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    const testId = params.id
    console.log('Test dynamic DELETE request for ID:', testId)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test dynamic DELETE endpoint working',
      id: testId
    })
  } catch (error) {
    console.error('Test dynamic DELETE error:', error)
    return NextResponse.json(
      { error: 'Test dynamic DELETE failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}