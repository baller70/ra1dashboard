export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  program: z.string().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  program: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeParents = searchParams.get('includeParents') === 'true';
    const program = searchParams.get('program') || undefined;

    // Get teams from Convex — raise limit so all teams are available in UI selections
    const limitParam = Number(new URL(request.url).searchParams.get('limit') || '10000');
    // Yearly Program: no filtering (include all teams). Others: strict explicit match only.
    const queryProgram = program && program !== 'yearly-program' ? program : undefined;
    const teams = await convex.query(api.teams.getTeams, {
      includeParents,
      limit: limitParam,
    });

    return NextResponse.json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    const errMsg = (error instanceof Error && error.message) ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to fetch teams: ${errMsg}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, program } = createTeamSchema.parse(body);

    // Allow duplicate team names; remove prior uniqueness guard
    // If you want to re-enable uniqueness, enforce it at the UI or via a dedicated index/constraint

    // Create team in Convex
    const teamId = await convex.mutation(api.teams.createTeam, {
      name,
      description,
      color,
    });

    // Return success without re-query to avoid any race/consistency flake
    return NextResponse.json({ success: true, teamId }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    const validatedData = updateTeamSchema.parse(updateData);

    // If updating name, check for uniqueness within the same program
    if (validatedData.name) {
      const existingTeams = await convex.query(api.teams.getTeams, {});
      const existingTeam = existingTeams.find(team => team.name === validatedData.name && team._id !== id);

      if (existingTeam) {
        return NextResponse.json(
          { error: 'Team name already exists' },
          { status: 400 }
        );
      }
    }

    // Update team in Convex
    await convex.mutation(api.teams.updateTeam, {
      teamId: id as any,
      name: validatedData.name,
      description: validatedData.description,
      color: validatedData.color,
    });

    // Get updated team
    const teams = await convex.query(api.teams.getTeams, {});
    const updatedTeam = teams.find(team => team._id === id);

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const program = (searchParams.get('program') || '').trim();

    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Confirm team exists
    const teams = await convex.query(api.teams.getTeams, { includeParents: true });
    const team = teams.find(t => String(t._id) === String(id));
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // If a program is specified, unassign only parents in that program and keep the team
    if (program) {
      // Fetch all parents and filter by this team
      const parentsResp = await convex.query(api.parents.getParents, { page: 1, limit: 5000 });
      const teamParents = (parentsResp?.parents || []).filter((p: any) => String(p.teamId || '') === String(id));
      const inProgram = teamParents.filter((p: any) => String(p.program || '').trim() === program);
      const otherProgramParents = teamParents.filter((p: any) => String(p.program || '').trim() !== program);

      if (inProgram.length > 0) {
        await convex.mutation(api.teams.unassignParentsFromTeams, { parentIds: inProgram.map((p: any) => p._id) });
      }

      // If no parents remain on this team after unassigning, delete the team record; otherwise keep it for other programs
      if (otherProgramParents.length === 0) {
        await convex.mutation(api.teams.deleteTeam, { teamId: id as any });
        return NextResponse.json({ success: true, unassignedCount: inProgram.length, deletedTeam: true });
      }

      return NextResponse.json({ success: true, unassignedCount: inProgram.length, deletedTeam: false });
    }

    // No program specified: delete and unassign all parents using backend mutation
    await convex.mutation(api.teams.deleteTeam, { teamId: id as any });
    return NextResponse.json({ success: true, unassignedCount: (team.parents || []).length, deletedTeam: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
