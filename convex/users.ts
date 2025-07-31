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