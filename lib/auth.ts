
// Auth utility functions - no authentication required (development mode)

// Mock user for development - always return this user
const DEV_USER = {
  id: 'dev-user-001',
  email: 'admin@riseasone.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin'
}

export async function getServerSession() {
  return { user: DEV_USER }
}

export async function requireAuth() {
  return { user: DEV_USER }
}

export async function requireAdmin() {
  return { user: DEV_USER }
}

export async function checkUserRole(requiredRole: string) {
  // Admin has access to everything
  return true
}

export async function getCurrentUserRole() {
  return 'admin'
}

// API route helper for authentication - always returns dev user
export async function authenticateRequest() {
  return {
    userId: DEV_USER.id,
    user: DEV_USER
  }
}

// API route helper for admin authentication
export async function authenticateAdmin() {
  return {
    userId: DEV_USER.id,
    user: DEV_USER
  }
}

// For backward compatibility
export const authOptions = null
