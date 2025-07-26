
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const parentId = formData.get('parentId') as string
    const templateType = formData.get('templateType') as string
    const notes = formData.get('notes') as string
    const expiresAt = formData.get('expiresAt') as string

    if (!file || !parentId) {
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

    // Save the file to the public/uploads/contracts directory
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const fileUrl = `/uploads/contracts/${fileName}`
    const filePath = join(process.cwd(), 'public', 'uploads', 'contracts', fileName)
    
    console.log('Contract upload requested:', {
      fileName: file.name,
      fileSize: file.size,
      parentId,
      templateType,
      notes,
      expiresAt,
      fileUrl,
      filePath
    });

    // Convert file to buffer and save it
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create the contract via the POST API
    const contractData = {
      parentId,
      fileName: `uploaded_${file.name}`,
      originalName: file.name,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      templateType: templateType || undefined,
      notes: notes || undefined,
      expiresAt: expiresAt || undefined,
    }

    // Call the contracts API to create the contract
    const createResponse = await fetch(`${request.url.replace('/upload', '')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contractData),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json()
      throw new Error(errorData.error || 'Failed to create contract record')
    }

    const result = await createResponse.json()

    return NextResponse.json({
      success: true,
      contractId: result.contractId,
      message: 'Contract uploaded successfully'
    })
  } catch (error) {
    console.error('Contract upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload contract' },
      { status: 500 }
    )
  }
}
