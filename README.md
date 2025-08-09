# RA1 Dashboard – Production Readiness Notes

This project is deployed to Vercel. The following configuration is expected in production.

## Environment variables (Vercel)

Required
- NEXT_PUBLIC_CONVEX_URL: Convex URL (browser + server)
- CONVEX_URL: (optional) explicit server URL if used
- API_SECRET_KEY: Shared API key for server-to-server calls (default fallback used in dev)
- STRIPE_SECRET_KEY: Stripe secret (restricted)
- STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret
- NEXT_PUBLIC_BASE_URL: Base URL of the deployment (e.g. https://app-*.vercel.app)

Optional
- USE_STRIPE_MCP: 'true' to enable MCP pathways if configured

## Healthcheck

GET `/api/health` returns JSON with database and stripe connectivity. Status 200 indicates healthy.

## Auth (temporary dev mode)

Most API routes accept an `x-api-key` header using `API_SECRET_KEY`. Full Clerk auth lockdown can be enabled later by removing the bypass usage and enforcing `requireAuth`.

## Stripe Webhooks

Set Stripe dashboard endpoint to `/api/stripe/webhooks` and ensure `STRIPE_WEBHOOK_SECRET` matches the value in Vercel.

# RA1 Dashboard - Basketball Program Management System

A comprehensive dashboard system for managing basketball programs, built with Next.js, Convex, and modern web technologies.

## 🏀 Overview

RA1 Dashboard is a complete management system designed for basketball programs, featuring parent management, payment processing, communication tools, and AI-powered insights. The system provides a professional interface for coaches and administrators to manage their programs efficiently.

## ✨ Key Features

### 🎯 AI Payment Reminder System
- **Smart Context Integration**: AI-powered message generation with personalized content
- **Multi-Channel Support**: Email and SMS reminder capabilities
- **Template Integration**: Pre-built templates with customization options
- **Method Selection**: Choose between email, SMS, or both for reminders

### 📧 Enhanced Communication System
- **Bulk Messaging**: Send messages to multiple parents simultaneously
- **Message Scheduling**: Schedule messages for future delivery
- **Template Management**: Create and manage reusable message templates
- **Communication History**: Track all sent communications with detailed logs

### 💳 Advanced Payment Management
- **Stripe Integration**: Secure payment processing with Stripe
- **Payment Scheduling**: Set up installment plans and recurring payments
- **Progress Tracking**: Visual progress bars for payment completion
- **Overdue Management**: Automatic overdue payment detection and alerts

### 📊 Comprehensive Dashboard
- **Real-Time Analytics**: Live statistics and performance metrics
- **Revenue Trends**: Visual charts showing payment trends over time
- **Recent Activity**: Latest system activities and notifications
- **Quick Actions**: Fast access to common tasks

### 👥 Parent Management
- **Complete Profiles**: Detailed parent and student information
- **Bulk Import**: CSV/Excel import for multiple parents
- **Team Assignment**: Organize parents by teams and programs
- **Status Tracking**: Monitor parent engagement and payment status

### 📋 Contract Management
- **Document Upload**: Upload and manage program contracts
- **Digital Signatures**: Track contract signing status
- **Expiration Alerts**: Notifications for expiring contracts
- **Version Control**: Manage multiple contract versions

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Convex (Real-time database and API)
- **UI Framework**: Tailwind CSS, Shadcn/ui
- **Payment Processing**: Stripe
- **Email Service**: Resend
- **AI Integration**: OpenAI GPT for message generation
- **Charts**: Recharts for data visualization
- **Authentication**: Clerk (configurable)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account
- Stripe account (for payments)
- Resend account (for emails)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/baller70/ra1dashboard.git
   cd ra1dashboard
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   cd app
   npm install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`

4. **Initialize Convex**
   \`\`\`bash
   npx convex dev
   \`\`\`

5. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Database Schema

The system uses Convex with the following main tables:
- \`parents\` - Parent and student information
- \`payments\` - Payment records and installments
- \`paymentPlans\` - Payment plan configurations
- \`messageLogs\` - Communication history
- \`templates\` - Message templates
- \`contracts\` - Contract documents
- \`teams\` - Team organization

## 🎨 Features in Detail

### Dashboard Analytics
- **Total Parents**: Active parent count
- **Total Revenue**: Sum of all completed payments
- **Overdue Payments**: Count of overdue payment alerts
- **Upcoming Dues**: Payments due in the next 30 days
- **Active Plans**: Number of active payment plans
- **Messages Sent**: Monthly communication statistics

### AI-Powered Features
- **Smart Message Generation**: Contextual message creation
- **Risk Assessment**: Parent engagement analysis
- **Payment Predictions**: AI-driven payment behavior insights
- **Automated Recommendations**: System optimization suggestions

### Notification System
- **Real-Time Updates**: Live notification feed
- **Priority-Based Alerts**: Urgent, high, medium, and low priority notifications
- **Action-Oriented**: Direct links to relevant pages
- **Comprehensive Coverage**: Payments, communications, system events

## 🔒 Security Features

- **Environment Variable Protection**: Sensitive data secured
- **Input Validation**: Comprehensive data validation using Zod
- **Authentication Ready**: Clerk integration available
- **Secure API Routes**: Protected endpoints with proper error handling
- **Data Sanitization**: All user inputs properly sanitized

## 📱 Mobile Responsive

The dashboard is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile phones
- Touch interfaces

---

**RA1 Dashboard** - Empowering basketball programs with modern management tools 🏀
