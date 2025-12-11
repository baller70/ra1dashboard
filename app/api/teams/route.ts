export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '../../../lib/prisma';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeParents = searchParams.get('includeParents') === 'true';

    // Get teams from PostgreSQL
    const teams = await prisma.teams.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: includeParents ? {
        parents: {
          where: { status: 'active' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true
          }
        }
      } : undefined
    });

    // Transform to match expected format
    const transformedTeams = teams.map(t => ({
      _id: t.id,
      id: t.id,
      name: t.name,
      color: t.color,
      description: t.description,
      isActive: t.isActive,
      order: t.order,
      createdAt: t.createdAt?.toISOString(),
      updatedAt: t.updatedAt?.toISOString(),
      parents: includeParents ? (t.parents || []).map((p: any) => ({
        _id: p.id,
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        status: p.status
      })) : undefined
    }));

    return NextResponse.json({
      success: true,
      data: transformedTeams
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
    const { name, description, color } = createTeamSchema.parse(body);

    // Create team in PostgreSQL
    const team = await prisma.teams.create({
      data: {
        name,
        description: description || null,
        color: color || '#f97316',
        isActive: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      teamId: team.id,
      data: {
        _id: team.id,
        id: team.id,
        name: team.name,
        color: team.color,
        description: team.description
      }
    }, { status: 201 });
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

    // Update team in PostgreSQL
    const updatedTeam = await prisma.teams.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color,
        isActive: validatedData.isActive
      }
    });

    return NextResponse.json({
      _id: updatedTeam.id,
      id: updatedTeam.id,
      name: updatedTeam.name,
      color: updatedTeam.color,
      description: updatedTeam.description,
      isActive: updatedTeam.isActive
    });
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

    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Unassign all parents from this team first
    await prisma.parents.updateMany({
      where: { teamId: id },
      data: { teamId: null }
    });

    // Delete the team
    await prisma.teams.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
