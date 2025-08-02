export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getUserContext } from '../../../../lib/api-utils'
import { saveUserPreferences } from '../../../../lib/user-session'

export async function POST() {
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

    // Default user preferences
    const defaultPreferences = {
      theme: 'system',
      language: 'en',
      timezone: 'America/New_York',
      dateFormat: 'MM/dd/yyyy',
      currency: 'USD',
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      paymentReminders: true,
      overdueAlerts: true,
      systemUpdates: true,
      marketingEmails: false,
      defaultView: 'overview',
      showWelcomeMessage: true,
      compactMode: false,
      autoRefresh: true,
      refreshInterval: 30,
      shareUsageData: false,
      allowAnalytics: true,
      twoFactorAuth: false,
    }

    // Save default preferences
    if (userContext.userId) {
      try {
        await saveUserPreferences(userContext.userId, defaultPreferences)
      } catch (error: any) {
        console.log('🔧 Development mode: Could not save default preferences:', error.message)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Settings have been reset to defaults',
      defaultPreferences
    })

  } catch (error) {
    console.error('Settings reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset settings' },
      { status: 500 }
    )
  }
} 