# 🚀 Vercel Deployment Guide

## Environment Variables Setup

Add these environment variables in your Vercel dashboard:

### Required Variables
```env
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://confident-wildcat-124.convex.cloud
CONVEX_DEPLOY_KEY=your_convex_deploy_key

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Payment Processing (Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Security
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_min
NEXTAUTH_URL=https://your-domain.vercel.app
```

## Deployment Steps

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Configure Build Settings**: 
   - Build Command: `cd app && npm run build`
   - Install Command: `cd app && npm install`
   - Output Directory: `app/.next`
3. **Add Environment Variables**: Copy all variables from above
4. **Deploy**: Click deploy and monitor build logs

## Post-Deployment Checklist

- [ ] Test all API endpoints
- [ ] Verify authentication flows
- [ ] Check payment processing
- [ ] Test email/SMS functionality
- [ ] Monitor error logs in Vercel dashboard 