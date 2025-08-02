
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'

export async function POST(request: Request) {
  try {
    console.log('🔧 Contract upload route called')
    await requireAuth()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const parentId = formData.get('parentId') as string
    const templateType = formData.get('templateType') as string
    const notes = formData.get('notes') as string
    const expiresAt = formData.get('expiresAt') as string

    console.log('📋 Upload form data:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      parentId,
      templateType,
      notes,
      expiresAt
    })

    if (!file || !parentId) {
      console.log('❌ Missing file or parent ID')
      return NextResponse.json({ error: 'Missing file or parent ID' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and Word documents are allowed.' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum size is 10MB.' }, { status: 400 })
    }

    // Convert file to base64 for storage (Vercel serverless doesn't support file system writes)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString('base64')
    
    // Create a data URL for the file
    const dataUrl = `data:${file.type};base64,${base64Data}`
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    console.log('Contract upload requested:', {
      fileName: file.name,
      fileSize: file.size,
      parentId,
      templateType,
      notes,
      expiresAt,
      storedAsBase64: true
    });

    // Create the contract via the POST API
    const contractData = {
      parentId,
      fileName: `uploaded_${file.name}`,
      originalName: file.name,
      fileUrl: dataUrl, // Store as base64 data URL
      fileSize: file.size,
      mimeType: file.type,
      templateType: templateType || undefined,
      notes: notes || undefined,
      expiresAt: expiresAt || undefined,
    }

    // Call the contracts API to create the contract
    console.log('📝 Creating contract record with data:', contractData)
    const createResponse = await fetch(`${request.url.replace('/upload', '')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contractData),
    })

    console.log('📊 Create contract response status:', createResponse.status)

    if (!createResponse.ok) {
      const errorData = await createResponse.json()
      console.log('❌ Contract creation failed:', errorData)
      throw new Error(errorData.error || 'Failed to create contract record')
    }

    const result = await createResponse.json()
    console.log('✅ Contract created successfully:', result)

    return NextResponse.json({
      success: true,
      contractId: result.contractId,
      message: 'Contract uploaded successfully'
    })
  } catch (error) {
    console.error('❌ Contract upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload contract' },
      { status: 500 }
    )
  }
}
