

export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
// Clerk auth

export async function GET() {
  try {
    await requireAuth()
    

    // Create CSV template content
    const csvContent = `name,email,phone,address,emergencyContact,emergencyPhone,notes
Sarah Johnson,sarah.johnson@email.com,+1-555-0123,123 Main Street,John Johnson (Husband),+1-555-0124,Sample parent profile
Michael Davis,michael.davis@email.com,+1-555-0125,456 Oak Avenue,Lisa Davis (Wife),+1-555-0126,Another sample entry`

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'text/csv')
    headers.set('Content-Disposition', 'attachment; filename="parents_template.csv"')

    return new Response(csvContent, { headers })
  } catch (error) {
    console.error('Template download error:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
