#!/bin/bash

echo "🚀 Starting Netlify Deployment for RA1 Dashboard"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Build the application
echo "🔨 Building the application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Netlify
    echo "🌐 Deploying to Netlify..."
    netlify deploy --prod --dir=out
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo "Your RA1 Dashboard is now live on Netlify!"
    else
        echo "❌ Deployment failed. Please check the error messages above."
    fi
else
    echo "❌ Build failed. Please fix the errors and try again."
fi
