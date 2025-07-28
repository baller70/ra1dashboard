
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(request: NextRequest) {
  // Only log in development mode and for specific routes if needed
  if (process.env.NODE_ENV === 'development' && request.nextUrl.pathname.startsWith('/api/debug')) {
    console.log(`🔧 Middleware processing: ${request.nextUrl.pathname}`)
  }
  
  // Add security headers for production
  const response = NextResponse.next()

  // Security headers (cached for performance)
  const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block'
  }

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // CORS headers for API routes only
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const corsOrigin = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL || '*' 
      : '*'
    
    response.headers.set('Access-Control-Allow-Origin', corsOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  // Handle preflight requests efficiently
  if (request.method === 'OPTIONS') {
    const corsOrigin = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL || '*' 
      : '*'
      
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
      },
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
