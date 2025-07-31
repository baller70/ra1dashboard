
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getUserContext, requireAuthWithApiKeyBypass } from '../../../lib/api-utils'
import { getUserPreferences, saveUserPreferences } from '../../../lib/user-session'
import { convexHttp } from '../../../lib/db'
import { api } from '../../../convex/_generated/api'

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

    // Get user preferences with fallback
    let userPreferences: any = {};
    if (userContext.userId) {
      try {
        userPreferences = await getUserPreferences(userContext.userId);
      } catch (error) {
        console.log('🔧 Development mode: Using default preferences')
        userPreferences = {};
      }
    }

    // Get system settings from database
    let systemSettings = [];
    try {
      const dbSettings = await convexHttp.query(api.systemSettings.getSystemSettings, {});
      systemSettings = dbSettings.map(setting => ({
        key: setting.key,
        value: setting.value,
        description: setting.description || ''
      }));
      
      // If no settings in database, use defaults
      if (systemSettings.length === 0) {
        systemSettings = [
          { key: 'program_name', value: 'Rise as One Basketball Program', description: 'Program name' },
          { key: 'program_fee', value: '1650', description: 'Annual program fee' },
          { key: 'email_from_address', value: 'admin@riseasone.com', description: 'Email from address' },
          { key: 'sms_from_number', value: '+1-555-0123', description: 'SMS from number' },
          { key: 'reminder_days', value: '7,1', description: 'Days before due date to send reminder' },
          { key: 'late_fee_amount', value: '25', description: 'Late fee amount' },
          { key: 'grace_period_days', value: '3', description: 'Grace period days' }
        ];
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
      // Use defaults on error
      systemSettings = [
        { key: 'program_name', value: 'Rise as One Basketball Program', description: 'Program name' },
        { key: 'program_fee', value: '1650', description: 'Annual program fee' },
        { key: 'email_from_address', value: 'admin@riseasone.com', description: 'Email from address' },
        { key: 'sms_from_number', value: '+1-555-0123', description: 'SMS from number' },
        { key: 'reminder_days', value: '7,1', description: 'Days before due date to send reminder' },
        { key: 'late_fee_amount', value: '25', description: 'Late fee amount' },
        { key: 'grace_period_days', value: '3', description: 'Grace period days' }
      ];
    }

    return NextResponse.json({
      systemSettings,
      userPreferences: {
        theme: userPreferences.theme || 'system',
        language: userPreferences.language || 'en',
        timezone: userPreferences.timezone || 'America/New_York',
        dateFormat: userPreferences.dateFormat || 'MM/dd/yyyy',
        currency: userPreferences.currency || 'USD',
        emailNotifications: userPreferences.emailNotifications !== false,
        smsNotifications: userPreferences.smsNotifications !== false,
        pushNotifications: userPreferences.pushNotifications !== false,
        paymentReminders: userPreferences.paymentReminders !== false,
        overdueAlerts: userPreferences.overdueAlerts !== false,
        systemUpdates: userPreferences.systemUpdates !== false,
        marketingEmails: userPreferences.marketingEmails || false,
        defaultView: userPreferences.defaultView || 'overview',
        showWelcomeMessage: userPreferences.showWelcomeMessage !== false,
        compactMode: userPreferences.compactMode || false,
        autoRefresh: userPreferences.autoRefresh !== false,
        refreshInterval: userPreferences.refreshInterval || 30,
        shareUsageData: userPreferences.shareUsageData || false,
        allowAnalytics: userPreferences.allowAnalytics !== false,
        twoFactorAuth: userPreferences.twoFactorAuth || false,
        ...userPreferences
      },
      user: {
        id: userContext.userId || 'dev-user',
        name: (userContext as any).user?.name || 'Development User',
        email: userContext.userEmail || 'dev@thebasketballfactoryinc.com',
        role: userContext.userRole || 'admin',
        phone: '',
        organization: 'Rise as One Basketball',
        avatar: ''
      }
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Use enhanced authentication with API key bypass for Vercel compatibility
    await requireAuthWithApiKeyBypass(request);

    // Try to get user context, but don't fail if it's not available
    let userContext;
    try {
      userContext = await getUserContext()
      // Ensure isAdmin is set if userRole is admin
      if (!userContext.isAdmin && userContext.userRole === 'admin') {
        userContext.isAdmin = true;
      }
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
    
    // Force admin privileges for development/testing
    if (!userContext.userId || userContext.userId === 'dev-user') {
      userContext.isAdmin = true;
      userContext.userRole = 'admin';
    }

    const { userPreferences: incomingPrefs, systemSettings } = (await request.json()) as any;
    const userPreferences: any = incomingPrefs;

    console.log('💾 Settings save request:', { 
      hasUserPrefs: !!userPreferences, 
      hasSystemSettings: !!systemSettings,
      userId: userContext.userId,
      isAdmin: userContext.isAdmin 
    });

    // Save user preferences
    if (userPreferences && userContext.userId) {
      try {
        console.log('💾 Saving user preferences:', userPreferences);
        await saveUserPreferences(userContext.userId, userPreferences);
        console.log('✅ User preferences saved successfully');
      } catch (error: any) {
        console.error('❌ Settings save error:', error)
        throw new Error('Failed to save user preferences: ' + error.message);
      }
    }

    // Save system settings to database
    console.log('🔍 System settings check:', { 
      hasSystemSettings: !!systemSettings, 
      isArray: Array.isArray(systemSettings),
      isAdmin: userContext.isAdmin,
      userContext: userContext
    });
    
    if (systemSettings && Array.isArray(systemSettings) && userContext.isAdmin) {
      try {
        console.log('💾 Saving system settings:', systemSettings);
        const result = await convexHttp.mutation(api.systemSettings.bulkUpdateSystemSettings, {
          settings: systemSettings.map(setting => ({
            key: setting.key,
            value: setting.value,
            description: setting.description || ''
          }))
        });
        console.log('✅ System settings saved successfully:', result);
      } catch (error: any) {
        console.error('❌ System settings save error:', error);
        throw new Error('Failed to save system settings: ' + error.message);
      }
    } else {
      console.log('⚠️ System settings not saved due to failed conditions');
    }

    return NextResponse.json({ 
      success: true,
      message: 'Settings updated successfully',
      updatedPreferences: userPreferences || null,
      updatedSystemSettings: userContext.isAdmin ? systemSettings : null
    })
  } catch (error: any) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}
