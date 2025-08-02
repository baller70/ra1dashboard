export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, setUserSession, getUserSessionData, saveUserSessionData } from '../../../../lib/user-session';

// Get current user session
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Get session data
    const sessionData = await getUserSessionData(user._id);

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastActive: user.lastActive,
      },
      sessionData: sessionData?.sessionData || {},
      preferences: sessionData?.sessionData?.preferences || {},
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// Update user session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userData, sessionData, preferences } = body;

    let user;
    
    if (userData) {
      // Update user info
      user = await setUserSession(userData);
    } else {
      // Get current user
      user = await getCurrentUser();
    }

    if (!user) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Update session data if provided
    if (sessionData || preferences) {
      const currentSessionData = await getUserSessionData(user._id);
      const updatedSessionData = {
        ...currentSessionData?.sessionData,
        ...sessionData,
        preferences: {
          ...currentSessionData?.sessionData?.preferences,
          ...preferences,
        },
      };

      await saveUserSessionData(user._id, updatedSessionData);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: 'Session updated successfully',
    });
  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
} 