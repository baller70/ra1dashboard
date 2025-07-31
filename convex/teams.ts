import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all teams function
export const getTeams = query({
  args: { 
    includeParents: v.optional(v.boolean()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const { includeParents = false, limit = 100 } = args;
    
    // Get teams
    const teams = await ctx.db.query("teams")
      .order("desc")
      .take(limit);
    
    if (!includeParents) {
      return teams;
    }
    
    // Include parents for each team
    const teamsWithParents = [];
    for (const team of teams) {
      const parents = await ctx.db.query("parents")
        .filter(q => q.eq(q.field("teamId"), team._id))
        .collect();
      
      teamsWithParents.push({
        ...team,
        parents
      });
    }
    
    return teamsWithParents;
  },
});

// Create team function
export const createTeam = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { name, description, color = '#f97316' } = args;
    
    const teamId = await ctx.db.insert("teams", {
      name,
      description,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return teamId;
  },
});

// Update team function
export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { teamId, name, description, color } = args;
    
    const updates: any = {
      updatedAt: Date.now()
    };
    
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    
    await ctx.db.patch(teamId, updates);
    
    return teamId;
  },
});

// Delete team function
export const deleteTeam = mutation({
  args: {
    teamId: v.id("teams")
  },
  handler: async (ctx, args) => {
    const { teamId } = args;
    
    // Remove team reference from parents
    const parents = await ctx.db.query("parents")
      .filter(q => q.eq(q.field("teamId"), teamId))
      .collect();
    
    for (const parent of parents) {
      await ctx.db.patch(parent._id, {
        teamId: undefined,
        updatedAt: Date.now()
      });
    }
    
    // Delete the team
    await ctx.db.delete(teamId);
    
    return { success: true };
  },
});

// Assign parents to team function
export const assignParentsToTeam = mutation({
  args: {
    teamId: v.optional(v.id("teams")),
    parentIds: v.array(v.id("parents"))
  },
  handler: async (ctx, args) => {
    const { teamId, parentIds } = args;
    
    // Verify team exists if teamId is provided
    if (teamId) {
      const team = await ctx.db.get(teamId);
      if (!team) {
        throw new Error("Team not found");
      }
    }
    
    // Verify all parent IDs exist
    const parents = [];
    for (const parentId of parentIds) {
      const parent = await ctx.db.get(parentId);
      if (!parent) {
        throw new Error(`Parent with ID ${parentId} not found`);
      }
      parents.push(parent);
    }
    
    // Update all parents with the new team assignment
    const updatedParents = [];
    for (const parentId of parentIds) {
      await ctx.db.patch(parentId, {
        teamId: teamId || undefined,
        updatedAt: Date.now()
      });
      
      // Get updated parent with team info
      const updatedParent = await ctx.db.get(parentId);
      let team = null;
      if (updatedParent?.teamId) {
        team = await ctx.db.get(updatedParent.teamId as any);
      }
      
      updatedParents.push({
        ...updatedParent,
        team
      });
    }
    
    return {
      success: true,
      assignedCount: parentIds.length,
      parents: updatedParents
    };
  },
});
