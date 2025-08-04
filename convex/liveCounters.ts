import { query } from "./_generated/server";

// BRAND NEW LIVE COUNTER FUNCTIONS - NO OLD CODE

export const getActiveTemplatesCount = query({
  args: {},
  handler: async (ctx) => {
    console.log('🎯 NEW: Getting Active Templates count...');
    
    // Get ALL templates from database
    const allTemplates = await ctx.db.query("templates").collect();
    console.log('📋 Total templates in DB:', allTemplates.length);
    
    // Filter for active ones
    const activeTemplates = allTemplates.filter(template => template.isActive === true);
    console.log('✅ Active templates found:', activeTemplates.length);
    console.log('📝 Active template names:', activeTemplates.map(t => t.name));
    
    return {
      count: activeTemplates.length,
      templates: activeTemplates.map(t => ({
        id: t._id,
        name: t.name,
        isActive: t.isActive
      }))
    };
  },
});

export const getMessagesSentCount = query({
  args: {},
  handler: async (ctx) => {
    console.log('📧 NEW: Getting Messages Sent count...');
    
    // Get ALL message logs from database
    const allMessages = await ctx.db.query("messageLogs").collect();
    console.log('📨 Total messages in DB:', allMessages.length);
    
    // Filter for sent messages only
    const sentMessages = allMessages.filter(msg => msg.status === "sent");
    console.log('✅ Sent messages found:', sentMessages.length);
    
    return {
      count: sentMessages.length,
      messages: sentMessages.map(m => ({
        id: m._id,
        parentName: m.parentName,
        status: m.status,
        sentAt: m.sentAt
      }))
    };
  },
});