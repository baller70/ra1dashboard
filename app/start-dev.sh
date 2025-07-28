#!/bin/bash

# Kill any existing Next.js processes
pkill -f "next dev" 2>/dev/null || true

# Set required environment variables
export CLERK_PUBLISHABLE_KEY=test_pk
export CLERK_SECRET_KEY=test_sk

# Start the development server
echo "🚀 Starting RA1 Dashboard development server..."
echo "📍 Server will be available at: http://localhost:3000"
echo "🔧 Using mock authentication (Clerk not configured)"
echo ""

npm run dev 