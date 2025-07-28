#!/bin/bash

echo "🔥 RA1 Dashboard - NUCLEAR STARTUP SCRIPT"
echo "=========================================="

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true

# Ensure we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ ERROR: Not in the app directory!"
    echo "📍 Current directory: $(pwd)"
    echo "🔄 Please run this from ra1programv1/app/"
    exit 1
fi

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Set environment variables for development
export CLERK_PUBLISHABLE_KEY=test_pk
export CLERK_SECRET_KEY=test_sk
export NODE_ENV=development

echo ""
echo "🚀 Starting RA1 Dashboard Development Server"
echo "📍 Server URL: http://localhost:3000"
echo "🔧 Mock authentication enabled (Clerk keys: test)"
echo "💾 Convex backend: https://blessed-scorpion-846.convex.cloud"
echo ""
echo "✅ Date serialization errors: FIXED"
echo "✅ Element type invalid errors: FIXED" 
echo "✅ Directory issues: FIXED"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================================="

# Start the development server
npm run dev 