export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const assignParentsSchema = z.object({
  teamId: z.string().nullable().optional(),
  parentIds: z.array(z.string()).min(1, 'At least one parent ID is required'),
});

const bulkAssignSchema = z.object({
  assignments: z.array(z.object({
    parentId: z.string(),
    teamId: z.string().nullable()
  })).min(1, 'At least one assignment is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 Assign API received body:', body);
    const { teamId, parentIds } = assignParentsSchema.parse(body);
    console.log('🔍 Parsed teamId:', teamId, 'parentIds:', parentIds);

    let result;

    if (teamId) {
      // Assign to team using the team assignment mutation
      console.log('🔍 Assigning parents to team:', teamId);
      result = await convex.mutation(api.teams.assignParentsToTeam, {
        teamId: teamId as any,
        parentIds: parentIds as any[]
      });
    } else {
      // Unassign from team using direct parent update
      console.log('🔍 Unassigning parents from teams');
      const updatedParents = [];

      for (const parentId of parentIds) {
        console.log('🔍 Updating parent:', parentId, 'to remove teamId');
        const updatedParent = await convex.mutation(api.parents.updateParent, {
          id: parentId as any,
          teamId: undefined
        });
        updatedParents.push(updatedParent);
      }

      result = {
        success: true,
        assignedCount: parentIds.length,
        parents: updatedParents
      };
    }
    console.log('🔍 Convex mutation result:', result);

    return NextResponse.json({
      success: true,
      message: `Successfully ${teamId ? 'assigned' : 'unassigned'} ${result.assignedCount} parent(s) ${teamId ? 'to team' : 'from teams'}`,
      updatedParents: result.parents
    });

  } catch (error) {
    console.error('❌ Error assigning parents to team:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error?.constructor?.name);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      // Return the actual error message for debugging
      return NextResponse.json(
        { error: 'Failed to assign parents to team', details: error.message, stack: error.stack },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to assign parents to team', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignments } = bulkAssignSchema.parse(body);

    // Process assignments one by one using Convex
    const results = [];
    for (const assignment of assignments) {
      try {
        const result = await convex.mutation(api.teams.assignParentsToTeam, {
          teamId: assignment.teamId as any,
          parentIds: [assignment.parentId] as any[]
        });
        
        if (result.parents && result.parents.length > 0) {
          results.push(result.parents[0]);
        }
      } catch (error) {
        console.error(`Failed to assign parent ${assignment.parentId}:`, error);
        // Continue with other assignments even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated team assignments for ${results.length} parent(s)`,
      updatedParents: results
    });

  } catch (error) {
    console.error('Error bulk assigning parents to teams:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to bulk assign parents to teams' },
      { status: 500 }
    );
  }
}
