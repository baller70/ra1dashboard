

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api'
import { BulkUploadParent, BulkImportResult } from '../../../../lib/types'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const { parents }: { parents: BulkUploadParent[] } = await request.json()
    
    if (!parents || !Array.isArray(parents) || parents.length === 0) {
      return NextResponse.json({ error: 'No valid parent data provided' }, { status: 400 })
    }

    const result: BulkImportResult = {
      success: false,
      created: 0,
      failed: 0,
      errors: [],
      successfulParents: []
    }

    // Get all existing parents to check for duplicates (email + name pair)
    const existingParentsResponse = await convex.query(api.parents.getParents, { limit: 1000 });
    const parentsList = existingParentsResponse.parents || [];
    const normalize = (s: string) => (s || '').trim().toLowerCase();
    const existingCombos = new Set(
      parentsList.map((p: any) => `${normalize(p.email)}|${normalize(p.name)}`)
    );
    // Track duplicates within the same upload batch (same email + same name)
    const seenCombos = new Set<string>();

    // Process each parent individually since Convex doesn't have transactions
    for (let i = 0; i < parents.length; i++) {
      const parentData = parents[i]
      const rowNum = i + 1

      try {
        // Allow duplicate emails as long as the name is different
        const combo = `${normalize(parentData.email)}|${normalize(parentData.name)}`
        if (existingCombos.has(combo)) {
          result.failed++
          result.errors.push({
            row: rowNum,
            email: parentData.email,
            message: 'A parent with the same email and name already exists'
          })
          continue
        }
        if (seenCombos.has(combo)) {
          result.failed++
          result.errors.push({
            row: rowNum,
            email: parentData.email,
            message: 'Duplicate row in this file (same email and name)'
          })
          continue
        }

        // Create parent record in Convex
        const createdParentId = await convex.mutation(api.parents.createParent, {
          name: parentData.name.trim(),
          email: parentData.email.toLowerCase().trim(),
          phone: parentData.phone?.trim() || undefined,
          address: parentData.address?.trim() || undefined,
          emergencyContact: parentData.emergencyContact?.trim() || undefined,
          emergencyPhone: parentData.emergencyPhone?.trim() || undefined,
          notes: parentData.notes?.trim() || undefined,
          status: 'active'
        });

        // Add to seen combos to prevent duplicates in the same batch
        seenCombos.add(combo);

        result.created++
        result.successfulParents.push({
          id: createdParentId,
          name: parentData.name,
          email: parentData.email
        })

      } catch (error) {
        console.error(`Error creating parent ${parentData.email}:`, error)
        result.failed++
        result.errors.push({
          row: rowNum,
          email: parentData.email,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      }
    }

    result.success = result.created > 0

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: 'Failed to import parents. Please try again.' },
      { status: 500 }
    )
  }
}
