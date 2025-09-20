
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'
import { appendSignature } from '../../../../lib/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const {
      subject,
      body: messageBody,
      recipients,
      variables = {}
    } = body

    // Get parent info for preview from Convex
    let parent = null;
    if (recipients && recipients.length > 0) {
      try {
        parent = await convex.query(api.parents.getParent, {
          id: recipients[0] as any
        });
      } catch (error) {
        console.log('Could not fetch parent for preview:', error);
      }
    }

    // Process variables for preview
    let processedSubject = subject || ''
    let processedBody = messageBody || ''

    if (parent) {
      // Use emergency contact first name if available, otherwise use parent name first name
      const getEmergencyContactFirstName = (parent: any): string => {
        if (parent?.emergencyContact) {
          const firstName = parent.emergencyContact.split(' ')[0]
          return firstName || parent.emergencyContact
        }
        return parent?.name?.split(' ')[0] || 'Parent'
      }

      const templateVariables = {
        parentName: getEmergencyContactFirstName(parent),
        parentEmail: parent.email,
        programName: 'Rise as One Yearly Program',
        ...variables
      }

      Object.entries(templateVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{${key}}`, 'g')
        processedSubject = processedSubject.replace(regex, String(value))
        processedBody = processedBody.replace(regex, String(value))
      })
    } else {
      // Use placeholder values if no parent found
      const templateVariables = {
        parentName: '[Parent Name]',
        parentEmail: '[Parent Email]',
        programName: 'Rise as One Yearly Program',
        ...variables
      }

      Object.entries(templateVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{${key}}`, 'g')
        processedSubject = processedSubject.replace(regex, String(value))
        processedBody = processedBody.replace(regex, String(value))
      })
    }

    return NextResponse.json({
      subject: processedSubject,
      body: appendSignature(processedBody, 'plain'),
      recipientCount: recipients?.length || 0,
      estimatedDelivery: new Date()
    })

  } catch (error) {
    console.error('Message preview error:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}
