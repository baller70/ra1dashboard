export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export async function GET(request: NextRequest) {
  if (!convex) {
    return NextResponse.json({ error: 'Convex not configured' }, { status: 503 });
  }

  try {
    const teams = await convex.query(api.teams.getTeams, {});

    const transformedTeams = (teams || []).map((t: any) => ({
      _id: t._id,
      id: t._id,
      name: t.name,
      color: t.color,
      description: t.description,
      isActive: t.isActive !== false,
      order: t.order,
      createdAt: t.createdAt || t._creationTime,
      updatedAt: t.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedTeams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!convex) {
    return NextResponse.json({ error: 'Convex not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const teamId = await convex.mutation(api.teams.createTeam, {
      name,
      description: description || '',
      color: color || '#f97316'
    });

    return NextResponse.json({ 
      success: true, 
      teamId,
      data: { _id: teamId, id: teamId, name, color }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!convex) {
    return NextResponse.json({ error: 'Convex not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, name, description, color, isActive } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    await convex.mutation(api.teams.updateTeam, {
      id,
      name,
      description,
      color,
      isActive
    });

    return NextResponse.json({ success: true, id, name, color, description, isActive });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!convex) {
    return NextResponse.json({ error: 'Convex not configured' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    await convex.mutation(api.teams.deleteTeam, { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
