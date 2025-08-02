import { cookies } from 'next/headers';
import { convexHttp } from './db';
import { api } from '../convex/_generated/api';
import { auth } from '@clerk/nextjs/server';

// Development user for testing
const DEV_USER = {
  email: 'dev@thebasketballfactoryinc.com',
  name: 'Development User',
  role: 'admin'
};

// Get current user session
export async function getCurrentUser() {
  try {
    // Try Clerk authentication first
    const { userId: clerkUserId } = await auth();
    
    if (clerkUserId) {
      // Production: Use Clerk user
      // In a real implementation, you'd get user info from Clerk
      // For now, we'll use the dev user but with Clerk ID
      const user = await convexHttp.mutation(api.users.getOrCreateUser, {
        email: DEV_USER.email,
        name: DEV_USER.name,
        clerkId: clerkUserId,
      });
      return user;
    }
  } catch (error) {
    console.log('Clerk auth not available, using development mode');
  }

  // Development mode: Check for session cookie or create dev user
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('dev-user-session');
  
  let userEmail = DEV_USER.email;
  let userName = DEV_USER.name;
  
  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(sessionCookie.value);
      userEmail = sessionData.email || DEV_USER.email;
      userName = sessionData.name || DEV_USER.name;
    } catch (e) {
      // Invalid session cookie, use defaults
    }
  }

  // Get or create user in Convex
  const user = await convexHttp.mutation(api.users.getOrCreateUser, {
    email: userEmail,
    name: userName,
  });

  return user;
}

// Set user session (development mode)
export async function setUserSession(userData: { email: string; name: string; role?: string }) {
  const cookieStore = cookies();
  
  // Set session cookie
  cookieStore.set('dev-user-session', JSON.stringify(userData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // Update user in Convex
  const user = await convexHttp.mutation(api.users.getOrCreateUser, {
    email: userData.email,
    name: userData.name,
  });

  return user;
}

// Save user session data
export async function saveUserSessionData(userId: string, sessionData: any) {
  return await convexHttp.mutation(api.users.createUserSession, {
    userId: userId as any,
    sessionData,
  });
}

// Get user session data
export async function getUserSessionData(userId: string) {
  return await convexHttp.query(api.users.getUserSession, {
    userId: userId as any,
  });
}

// Require authentication for API routes
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

// Check if user has specific role
export function hasRole(user: any, role: string) {
  return user?.role === role || user?.role === 'admin';
}

// Get user preferences
export async function getUserPreferences(userId: string) {
  const sessionData = await getUserSessionData(userId);
  return sessionData?.sessionData?.preferences || {};
}

// Save user preferences
export async function saveUserPreferences(userId: string, preferences: any) {
  const currentData = await getUserSessionData(userId);
  const updatedSessionData = {
    ...currentData?.sessionData,
    preferences,
  };
  
  return await saveUserSessionData(userId, updatedSessionData);
} 