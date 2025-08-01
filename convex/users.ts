import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get or create user by email
export const getOrCreateUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email, name, clerkId } = args;

    // Check if user already exists
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (user) {
      // Update user info if provided
      if (name && user.name !== name) {
        await ctx.db.patch(user._id, { 
          name,
          updatedAt: Date.now()
        });
        user = await ctx.db.get(user._id);
      }
      return user;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email,
      name: name || email.split('@')[0],
      role: "user", // Default role
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

// Get user by ID
export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Update user profile
export const updateUser = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Get all users (admin only)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Create user session data
export const createUserSession = mutation({
  args: {
    userId: v.id("users"),
    sessionData: v.any(),
  },
  handler: async (ctx, args) => {
    const { userId, sessionData } = args;
    
    // Store session data in user preferences or create a sessions table
    await ctx.db.patch(userId, {
      lastActive: Date.now(),
      sessionData,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get user session data
export const getUserSession = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user ? {
      user,
      sessionData: (user as any).sessionData || {},
      lastActive: (user as any).lastActive,
    } : null;
  },
});

// Save user settings (system settings + user preferences)
export const saveUserSettings = mutation({
  args: {
    userId: v.string(), // Using string to handle dev-user
    systemSettings: v.array(v.object({
      key: v.string(),
      value: v.string(),
      description: v.optional(v.string()),
    })),
    userPreferences: v.any(),
    userProfile: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, systemSettings, userPreferences, userProfile } = args;
    
    // For dev-user, we'll store in a special way or find/create user
    let user;
    if (userId === 'dev-user') {
      // Try to find dev user by email
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "dev@thebasketballfactoryinc.com"))
        .first();
      
      if (!user) {
        // Create dev user
        const newUserId = await ctx.db.insert("users", {
          email: "dev@thebasketballfactoryinc.com",
          name: "Development User",
          role: "admin",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        user = await ctx.db.get(newUserId);
      }
    } else {
      // Try to find user by ID (assuming it's a Convex ID)
      try {
        user = await ctx.db.get(userId as any);
      } catch {
        // If not a valid Convex ID, try by email
        user = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", userId))
          .first();
      }
    }
    
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Prepare settings data
    const settingsData = {
      systemSettings: systemSettings.reduce((acc, setting) => {
        acc[setting.key] = {
          value: setting.value,
          description: setting.description || '',
          updatedAt: Date.now()
        };
        return acc;
      }, {} as any),
      userPreferences,
      userProfile,
      lastUpdated: Date.now()
    };
    
    // Update user with settings
    await ctx.db.patch(user._id, {
      settings: settingsData,
      updatedAt: Date.now(),
    });
    
    return { 
      success: true, 
      userId: user._id,
      settingsData 
    };
  },
});

// Get user settings
export const getUserSettings = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    
    let user;
    if (userId === 'dev-user') {
      // Find dev user by email
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "dev@thebasketballfactoryinc.com"))
        .first();
    } else {
      // Try to find user by ID or email
      try {
        user = await ctx.db.get(userId as any);
      } catch {
        user = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", userId))
          .first();
      }
    }
    
    if (!user) {
      return null;
    }
    
    const settings = (user as any).settings || {};
    
    return {
      user: {
        id: user._id,
        email: (user as any).email,
        name: (user as any).name,
        role: (user as any).role,
      },
      systemSettings: settings.systemSettings || {},
      userPreferences: settings.userPreferences || {},
      userProfile: settings.userProfile || {},
      lastUpdated: settings.lastUpdated || null
    };
  },
}); 