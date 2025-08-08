
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getUserContext, requireAuthWithApiKeyBypass } from '../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    // Use consistent authentication with API key bypass
    let userContext;
    try {
      userContext = await requireAuthWithApiKeyBypass(request);
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

    const userId = (userContext as any).userId || (userContext as any).id || 'dev-user';
    console.log('🔍 Getting settings for user:', userId);

    // Get settings from Convex using the working getUserSession approach
    let settingsData;
    try {
      // Find user by email
      const user = await convex.query(api.users.getUserByEmail, { 
        email: 'dev@thebasketballfactoryinc.com' 
      });

      if (user) {
        // Get user session data which contains settings
        const sessionData = await convex.query(api.users.getUserSession, { 
          userId: user._id 
        });
        
        if (sessionData && sessionData.sessionData && sessionData.sessionData.settings) {
          settingsData = sessionData.sessionData.settings;
          console.log('📊 Settings loaded from Convex user session:', settingsData);
        } else {
          console.log('📊 No settings found in user session');
          settingsData = null;
        }
      } else {
        console.log('📊 User not found');
        settingsData = null;
      }
    } catch (error) {
      console.log('⚠️ Failed to load settings from Convex:', error);
      settingsData = null;
    }

    // Default settings fallback
    const defaultSettings = [
      { key: 'program_name', value: 'Rise as One Basketball Program', description: 'Program name' },
      { key: 'program_fee', value: '1650', description: 'Annual program fee' },
      { key: 'email_from_address', value: 'admin@riseasone.com', description: 'Email from address' },
      { key: 'sms_from_number', value: '+1-555-0123', description: 'SMS from number' },
      { key: 'reminder_days', value: '7,1', description: 'Days before due date to send reminder' },
      { key: 'late_fee_amount', value: '25', description: 'Late fee amount' },
      { key: 'grace_period_days', value: '3', description: 'Grace period days' }
    ];

    // Convert system settings from Convex format to API format
    let systemSettings = [];
    if (settingsData && settingsData.systemSettings && Object.keys(settingsData.systemSettings).length > 0) {
      systemSettings = Object.keys(settingsData.systemSettings).map(key => ({
        key,
        value: settingsData.systemSettings[key].value,
        description: settingsData.systemSettings[key].description || ''
      }));
      console.log('✅ Using saved system settings from Convex');
    } else {
      systemSettings = defaultSettings;
      console.log('📊 Using default system settings');
    }

    // Get user preferences from Convex data or use defaults
    const userPreferences = settingsData?.userPreferences || {};

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
      user: settingsData?.user || {
        id: userId || 'dev-user',
        name: (userContext as any).user?.name || 'Development User',
        email: (userContext as any).userEmail || (userContext as any).email || 'dev@thebasketballfactoryinc.com',
        role: (userContext as any).userRole || (userContext as any).role || 'admin',
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

    const { userPreferences: incomingPrefs, systemSettings, userProfile } = (await request.json()) as any;
    const userPreferences: any = incomingPrefs;
    const userId = (userContext as any).userId || (userContext as any).id || 'dev-user';

    console.log('💾 Settings save request:', { 
      hasUserPrefs: !!userPreferences, 
      hasSystemSettings: !!systemSettings,
      hasUserProfile: !!userProfile,
      userId: userId,
      isAdmin: (userContext as any).isAdmin 
    });

    // Save settings using the working createUserSession approach
    try {
      // Prepare settings data in the same format as before
      const settingsData: any = {
        systemSettings: {},
        userPreferences: userPreferences || {},
        userProfile: userProfile || {},
        lastUpdated: Date.now()
      };

      // Convert systemSettings array to object format
      if (systemSettings && Array.isArray(systemSettings)) {
        systemSettings.forEach((setting: any) => {
          settingsData.systemSettings[setting.key] = {
            value: setting.value,
            description: setting.description || '',
            updatedAt: Date.now()
          };
        });
      }

      // Find or create user and save settings
      let user = await convex.query(api.users.getUserByEmail, { 
        email: 'dev@thebasketballfactoryinc.com' 
      });

      if (!user) {
        // Create user if doesn't exist
        user = await convex.mutation(api.users.getOrCreateUser, {
          email: 'dev@thebasketballfactoryinc.com',
          name: 'Development User'
        });
      }

      // Save settings using the working createUserSession approach
      if (user) {
        await convex.mutation(api.users.createUserSession, {
          userId: user._id,
          sessionData: {
            ...((user as any).sessionData || {}),
            settings: settingsData
          }
        });
      } else {
        throw new Error('User not found or created');
      }
      
      console.log('✅ Settings saved to Convex successfully using user session');
      
      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully',
        updatedPreferences: userPreferences,
        updatedSystemSettings: systemSettings
      });
      
    } catch (error: any) {
      console.error('❌ Convex settings save error:', error);
      throw new Error('Failed to save settings to Convex: ' + error.message);
    }
  } catch (error: any) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}
