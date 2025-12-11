import { cookies } from 'next/headers';
import { convexHttp } from './db';
import { api } from '../convex/_generated/api';

// Development user for testing
const DEV_USER = {
  email: 'dev@thebasketballfactoryinc.com',
  name: 'Development User',
  role: 'admin'
};

// Get current user session - no auth required
export async function getCurrentUser() {
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
  try {
    const user = await convexHttp.mutation(api.users.getOrCreateUser, {
      email: userEmail,
      name: userName,
    });
    return user;
  } catch (error) {
    // Return mock user if Convex fails
    return { _id: 'dev-user', email: userEmail, name: userName, role: 'admin' };
  }
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
  try {
    const user = await convexHttp.mutation(api.users.getOrCreateUser, {
      email: userData.email,
      name: userData.name,
    });
    return user;
  } catch (error) {
    return { _id: 'dev-user', email: userData.email, name: userData.name, role: userData.role || 'admin' };
  }
}

// Save user session data
export async function saveUserSessionData(userId: string, sessionData: any) {
  try {
    return await convexHttp.mutation(api.users.createUserSession, {
      userId: userId as any,
      sessionData,
    });
  } catch (error) {
    return null;
  }
}

// Get user session data
export async function getUserSessionData(userId: string) {
  try {
    return await convexHttp.query(api.users.getUserSession, {
      userId: userId as any,
    });
  } catch (error) {
    return null;
  }
}

// Require authentication for API routes - always returns dev user
export async function requireAuth() {
  const user = await getCurrentUser();
  return user || { _id: 'dev-user', email: DEV_USER.email, name: DEV_USER.name, role: 'admin' };
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
