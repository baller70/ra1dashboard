import { query } from "./_generated/server";
import { v } from "convex/values";

export const debugParents = query({
  args: {},
  handler: async (ctx, args) => {
    console.log("🔍 Debug: Starting parent query...");
    
    // Step 1: Basic query
    let parentsQuery = ctx.db.query("parents");
    console.log("🔍 Debug: Created basic query");
    
    // Step 2: Collect all
    const allParents = await parentsQuery.collect();
    console.log(`🔍 Debug: Collected ${allParents.length} parents`);
    
    // Step 3: Log each parent
    allParents.forEach((parent, index) => {
      console.log(`🔍 Debug: Parent ${index + 1}: ${parent.name} (${parent.email}) - ID: ${parent._id}`);
    });
    
    return {
      count: allParents.length,
      parents: allParents.map(p => ({ 
        _id: p._id, 
        name: p.name, 
        email: p.email,
        status: p.status,
        createdAt: p.createdAt
      }))
    };
  },
});
