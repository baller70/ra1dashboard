export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getUserContext } from '../../../../lib/api-utils'
import { getUserPreferences, getUserSessionData } from '../../../../lib/user-session'

export async function GET() {
  try {
    // Try to get user context, but don't fail if it's not available
    let userContext;
    try {
      userContext = await getUserContext()
    } catch (error) {
      console.log('🔧 Development mode: User context not available, using defaults')
      userContext = { 
        isAuthenticated: false,
        userId: 'dev-user',
        userEmail: 'dev@thebasketballfactoryinc.com',
        user: { name: 'Development User' },
        userRole: 'admin',
        isAdmin: true
      }
    }

    // Get user preferences and session data with fallback
    let userPreferences: any = {};
    let sessionData: any = {};
    
    if (userContext.userId) {
      try {
        userPreferences = await getUserPreferences(userContext.userId);
        const sessionResult = await getUserSessionData(userContext.userId);
        sessionData = sessionResult?.sessionData || {};
      } catch (error) {
        console.log('🔧 Development mode: Using default preferences and session data')
        userPreferences = {};
        sessionData = {};
      }
    }

    // Create export data
    const exportData = {
      exportInfo: {
        version: '2.1.0',
        exportDate: new Date().toISOString(),
        userId: userContext.userId || 'dev-user',
        userEmail: userContext.userEmail || 'dev@thebasketballfactoryinc.com',
      },
      userProfile: {
        name: userContext.user?.name || 'Development User',
        email: userContext.userEmail || 'dev@thebasketballfactoryinc.com',
        role: userContext.userRole || 'admin',
        organization: 'Rise as One Basketball',
      },
      userPreferences: {
        theme: userPreferences.theme || 'system',
        language: userPreferences.language || 'en',
        timezone: userPreferences.timezone || 'America/New_York',
        dateFormat: userPreferences.dateFormat || 'MM/dd/yyyy',
        currency: userPreferences.currency || 'USD',
        notifications: {
          email: userPreferences.emailNotifications !== false,
          sms: userPreferences.smsNotifications !== false,
          push: userPreferences.pushNotifications !== false,
          paymentReminders: userPreferences.paymentReminders !== false,
          overdueAlerts: userPreferences.overdueAlerts !== false,
          systemUpdates: userPreferences.systemUpdates !== false,
          marketingEmails: userPreferences.marketingEmails || false,
        },
        dashboard: {
          defaultView: userPreferences.defaultView || 'overview',
          showWelcomeMessage: userPreferences.showWelcomeMessage !== false,
          compactMode: userPreferences.compactMode || false,
          autoRefresh: userPreferences.autoRefresh !== false,
          refreshInterval: userPreferences.refreshInterval || 30,
        },
        privacy: {
          shareUsageData: userPreferences.shareUsageData || false,
          allowAnalytics: userPreferences.allowAnalytics !== false,
          twoFactorAuth: userPreferences.twoFactorAuth || false,
        },
        ...userPreferences
      },
      sessionData: sessionData || {},
      systemInfo: {
        applicationVersion: 'v2.1.0',
        database: 'Convex',
        environment: process.env.NODE_ENV || 'development',
        features: [
          'notifications',
          'payment-management',
          'ai-reminders',
          'bulk-communication',
          'parent-management',
          'contract-management'
        ]
      }
    }

    // Create the response with proper headers for file download
    const response = new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rise-as-one-settings-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })

    return response

  } catch (error) {
    console.error('Settings export error:', error)
    return NextResponse.json(
      { error: 'Failed to export settings' },
      { status: 500 }
    )
  }
} 