import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    role: v.string(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    lastActive: v.optional(v.number()),
    sessionData: v.optional(v.any()),
    clerkId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"]),

  parents: defineTable({
    name: v.string(),
    email: v.string(),
    // New: optional child/player name associated with this parent
    childName: v.optional(v.string()),
    // New: dedicated Parent Email used for assessments/communications
    parentEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    status: v.string(),
    contractStatus: v.optional(v.string()),
    contractUrl: v.optional(v.string()),
    contractUploadedAt: v.optional(v.number()),
    contractExpiresAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePaymentMethodId: v.optional(v.string()),
    teamId: v.optional(v.string()),
    program: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_team", ["teamId"]),

  paymentPlans: defineTable({
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    type: v.optional(v.string()),
    status: v.optional(v.string()),
    parentId: v.optional(v.any()),
    totalAmount: v.optional(v.number()),
    installmentAmount: v.optional(v.number()),
    installments: v.optional(v.number()),
    startDate: v.optional(v.any()),
    endDate: v.optional(v.any()),
    description: v.optional(v.string()),
    name: v.optional(v.string()),
    frequency: v.optional(v.string()),
    nextDueDate: v.optional(v.any()),
    stripePriceId: v.optional(v.any()),
    stripeSubscriptionId: v.optional(v.any()),
    paymentMethod: v.optional(v.string()),
  })
    .index("by_parent", ["parentId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"]),

  payments: defineTable({
    parentId: v.optional(v.any()),
    paymentPlanId: v.optional(v.any()),
    dueDate: v.optional(v.number()),
    amount: v.optional(v.number()),
    status: v.optional(v.string()),
    stripeInvoiceId: v.optional(v.any()),
    stripePaymentId: v.optional(v.any()),
    paidAt: v.optional(v.number()),
    failureReason: v.optional(v.any()),
    remindersSent: v.optional(v.number()),
    lastReminderSent: v.optional(v.number()),
    notes: v.optional(v.string()),
    description: v.optional(v.string()), // Payment label/description
    paymentMethod: v.optional(v.string()), // Add paymentMethod field
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_parent", ["parentId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"])
    .index("by_payment_plan", ["paymentPlanId"])
    .index("by_parent_status", ["parentId", "status"]),

  paymentInstallments: defineTable({
    parentPaymentId: v.id("payments"),
    parentId: v.id("parents"),
    paymentPlanId: v.optional(v.id("paymentPlans")),
    installmentNumber: v.number(),
    totalInstallments: v.number(),
    amount: v.number(),
    dueDate: v.number(),
    status: v.string(), // 'pending', 'paid', 'overdue', 'failed'
    paidAt: v.optional(v.number()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeInvoiceId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    remindersSent: v.number(),
    lastReminderSent: v.optional(v.number()),
    gracePeriodEnd: v.optional(v.number()),
    isInGracePeriod: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent_payment", ["parentPaymentId"])
    .index("by_parent", ["parentId"])
    .index("by_payment_plan", ["paymentPlanId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"])
    .index("by_parent_status", ["parentId", "status"])
    .index("by_overdue", ["status", "dueDate"])
    .index("by_grace_period", ["isInGracePeriod", "gracePeriodEnd"]),

  teams: defineTable({
    name: v.string(),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    order: v.optional(v.float64()),
    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_name", ["name"])
    .index("by_order", ["order"]),

  templates: defineTable({
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    content: v.optional(v.string()),
    body: v.optional(v.string()),
    channel: v.optional(v.string()),
    type: v.optional(v.string()),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    isAiGenerated: v.optional(v.boolean()),
    usageCount: v.optional(v.number()),
    variables: v.optional(v.any()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_type", ["type"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  messageLogs: defineTable({
    content: v.optional(v.string()), // Field exists as 'body' in data
    createdAt: v.optional(v.number()), // Missing in some records
    failureReason: v.optional(v.string()),
    parentId: v.string(),
    sentAt: v.optional(v.float64()),
    status: v.string(),
    subject: v.string(),
    templateId: v.optional(v.string()),
    type: v.optional(v.string()),
    body: v.optional(v.string()),
    channel: v.optional(v.string()),
    deliveredAt: v.optional(v.number()),
    errorMessage: v.optional(v.any()),
    metadata: v.optional(v.any()),
    readAt: v.optional(v.any()),
  })
    .index("by_parent", ["parentId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_sent_date", ["sentAt"]),

  auditLogs: defineTable({
    userId: v.optional(v.any()),
    action: v.optional(v.string()),
    resource: v.optional(v.string()),
    resourceId: v.optional(v.any()),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_resource", ["resource"])
    .index("by_created_at", ["createdAt"]),

  systemSettings: defineTable({
    key: v.string(),
    value: v.optional(v.any()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    createdAt: v.optional(v.any()),
    updatedAt: v.optional(v.any()),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // NEXT PHASE OPPORTUNITIES - NEW SCHEMA TABLES

  // 1. CONTRACTS MANAGEMENT SYSTEM
  contracts: defineTable({
    parentId: v.id("parents"),
    fileName: v.string(),
    originalName: v.string(),
    fileUrl: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    status: v.string(), // 'pending', 'signed', 'expired', 'rejected'
    templateType: v.optional(v.string()),
    notes: v.optional(v.string()),
    signedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    uploadedAt: v.number(),
    signatureData: v.optional(v.any()), // Digital signature metadata
    remindersSent: v.number(),
    lastReminderSent: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_status", ["status"])
    .index("by_expires_at", ["expiresAt"])
    .index("by_template_type", ["templateType"])
    .index("by_parent_status", ["parentId", "status"])
    .index("by_overdue", ["status", "expiresAt"]),

  contractTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    templateType: v.string(), // 'enrollment', 'waiver', 'payment', 'custom'
    fileUrl: v.string(),
    isActive: v.boolean(),
    variables: v.array(v.string()), // Placeholders like {parentName}, {childName}
    autoExpireDays: v.optional(v.number()),
    reminderSchedule: v.optional(v.array(v.number())), // Days before expiry to send reminders
    usageCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["templateType"])
    .index("by_active", ["isActive"]),

  // 2. ADVANCED AI RECOMMENDATIONS
  aiRecommendations: defineTable({
    parentId: v.optional(v.id("parents")),
    paymentId: v.optional(v.id("payments")),
    contractId: v.optional(v.id("contracts")),
    type: v.string(), // 'payment_reminder', 'contract_followup', 'risk_assessment', 'engagement'
    priority: v.string(), // 'low', 'medium', 'high', 'urgent'
    title: v.string(),
    description: v.string(),
    recommendation: v.string(),
    aiConfidence: v.number(), // 0-100
    dataPoints: v.any(), // Analysis data used to generate recommendation
    status: v.string(), // 'pending', 'accepted', 'dismissed', 'executed'
    actions: v.array(v.object({
      type: v.string(),
      label: v.string(),
      parameters: v.optional(v.any()),
    })),
    acceptedAt: v.optional(v.number()),
    executedAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
    feedback: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_type", ["type"])
    .index("by_priority", ["priority"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_parent_status", ["parentId", "status"]),

  aiRecommendationActions: defineTable({
    recommendationId: v.id("aiRecommendations"),
    actionType: v.string(), // 'send_message', 'create_payment_plan', 'schedule_call', 'update_status'
    parameters: v.any(),
    status: v.string(), // 'pending', 'executing', 'completed', 'failed'
    result: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    executedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_recommendation", ["recommendationId"])
    .index("by_status", ["status"])
    .index("by_type", ["actionType"]),

  // 3. SCHEDULED MESSAGE AUTOMATION
  scheduledMessages: defineTable({
    parentId: v.id("parents"),
    templateId: v.optional(v.id("templates")),
    subject: v.string(),
    body: v.string(),
    channel: v.string(), // 'email', 'sms'
    scheduledFor: v.number(),
    status: v.string(), // 'scheduled', 'sent', 'failed', 'cancelled'
    messageType: v.string(), // 'reminder', 'followup', 'notification', 'custom'
    priority: v.string(), // 'low', 'normal', 'high'
    retryCount: v.number(),
    maxRetries: v.number(),
    sentAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_scheduled_for", ["scheduledFor"])
    .index("by_status", ["status"])
    .index("by_type", ["messageType"])
    .index("by_channel", ["channel"])
    .index("by_parent_status", ["parentId", "status"])
    .index("by_due_messages", ["status", "scheduledFor"]),

  recurringMessages: defineTable({
    parentId: v.optional(v.id("parents")),
    templateId: v.optional(v.id("templates")),
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    channel: v.string(), // 'email', 'sms'
    messageType: v.string(), // 'payment_reminder', 'check_in', 'newsletter'
    interval: v.string(), // 'daily', 'weekly', 'monthly', 'custom'
    intervalValue: v.number(), // How many intervals (e.g., every 2 weeks)
    startDate: v.number(),
    endDate: v.optional(v.number()),
    isActive: v.boolean(),
    targetAudience: v.string(), // 'all', 'overdue_payments', 'specific_parents', 'payment_plan_type'
    audienceFilter: v.optional(v.any()), // Filtering criteria
    nextRun: v.optional(v.number()),
    lastRun: v.optional(v.number()),
    totalSent: v.number(),
    pausedAt: v.optional(v.number()),
    pausedReason: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_active", ["isActive"])
    .index("by_next_run", ["nextRun"])
    .index("by_type", ["messageType"])
    .index("by_channel", ["channel"])
    .index("by_due_recurring", ["isActive", "nextRun"]),

  recurringInstances: defineTable({
    recurringMessageId: v.id("recurringMessages"),
    scheduledFor: v.number(),
    status: v.string(), // 'scheduled', 'sent', 'failed', 'cancelled'
    sentAt: v.optional(v.number()),
    recipientCount: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    failureReason: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_recurring_message", ["recurringMessageId"])
    .index("by_scheduled_for", ["scheduledFor"])
    .index("by_status", ["status"]),

  recurringRecipients: defineTable({
    recurringMessageId: v.id("recurringMessages"),
    parentId: v.id("parents"),
    isActive: v.boolean(),
    addedAt: v.number(),
    removedAt: v.optional(v.number()),
  })
    .index("by_recurring_message", ["recurringMessageId"])
    .index("by_parent", ["parentId"])
    .index("by_active", ["isActive"])
    .index("by_message_parent", ["recurringMessageId", "parentId"]),

  // 4. BACKGROUND JOB PROCESSING
  backgroundJobs: defineTable({
    type: v.string(), // 'email_batch', 'payment_sync', 'data_export', 'ai_analysis'
    status: v.string(), // 'pending', 'running', 'completed', 'failed', 'cancelled'
    priority: v.string(), // 'low', 'normal', 'high', 'urgent'
    progress: v.number(), // 0-100
    currentStep: v.optional(v.string()),
    totalSteps: v.optional(v.number()),
    data: v.any(), // Job-specific data
    result: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    parentJobId: v.optional(v.id("backgroundJobs")),
    createdBy: v.string(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    actualDuration: v.optional(v.number()),
    retryCount: v.number(),
    maxRetries: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_created_by", ["createdBy"])
    .index("by_parent_job", ["parentJobId"])
    .index("by_pending_jobs", ["status", "priority"])
    .index("by_created_at", ["createdAt"]),

  jobLogs: defineTable({
    jobId: v.id("backgroundJobs"),
    level: v.string(), // 'info', 'warning', 'error', 'debug'
    message: v.string(),
    data: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_job", ["jobId"])
    .index("by_level", ["level"])
    .index("by_timestamp", ["timestamp"]),

  // 5. COMPREHENSIVE MESSAGE LOGGING (Enhanced)
  messageThreads: defineTable({
    parentId: v.id("parents"),
    subject: v.string(),
    type: v.string(), // 'payment_reminder', 'contract_followup', 'general'
    status: v.string(), // 'active', 'resolved', 'closed'
    priority: v.string(), // 'low', 'normal', 'high'
    messageCount: v.number(),
    lastMessageAt: v.number(),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_last_message", ["lastMessageAt"]),

  messageAttachments: defineTable({
    messageLogId: v.id("messageLogs"),
    fileName: v.string(),
    originalName: v.string(),
    fileUrl: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    uploadedAt: v.number(),
  })
    .index("by_message", ["messageLogId"]),

  messageAnalytics: defineTable({
    messageLogId: v.id("messageLogs"),
    parentId: v.id("parents"),
    channel: v.string(),
    messageType: v.string(),
    opened: v.boolean(),
    openedAt: v.optional(v.number()),
    clicked: v.boolean(),
    clickedAt: v.optional(v.number()),
    replied: v.boolean(),
    repliedAt: v.optional(v.number()),
    bounced: v.boolean(),
    bouncedAt: v.optional(v.number()),
    unsubscribed: v.boolean(),
    unsubscribedAt: v.optional(v.number()),
    deviceType: v.optional(v.string()),
    location: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_message", ["messageLogId"])
    .index("by_parent", ["parentId"])
    .index("by_channel", ["channel"])
    .index("by_opened", ["opened"])
    .index("by_clicked", ["clicked"]),

  // STRIPE INTEGRATION ENHANCEMENTS
  stripeWebhookEvents: defineTable({
    stripeEventId: v.string(),
    eventType: v.string(),
    processed: v.boolean(),
    data: v.any(),
    error: v.optional(v.string()),
    retryCount: v.number(),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_stripe_event_id", ["stripeEventId"])
    .index("by_event_type", ["eventType"])
    .index("by_processed", ["processed"])
    .index("by_created_at", ["createdAt"]),

  stripeSubscriptions: defineTable({
    parentId: v.id("parents"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    priceId: v.optional(v.string()),
    quantity: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_status", ["status"]),

  stripeInvoices: defineTable({
    parentId: v.id("parents"),
    stripeInvoiceId: v.string(),
    stripeCustomerId: v.string(),
    subscriptionId: v.optional(v.string()),
    status: v.string(),
    amountDue: v.number(),
    amountPaid: v.number(),
    amountRemaining: v.number(),
    currency: v.string(),
    dueDate: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    paymentIntentId: v.optional(v.string()),
    hostedInvoiceUrl: v.optional(v.string()),
    invoicePdf: v.optional(v.string()),
    attemptCount: v.number(),
    nextPaymentAttempt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_stripe_invoice_id", ["stripeInvoiceId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"]),

  notifications: defineTable({
    title: v.string(),
    message: v.string(),
    type: v.string(), // 'payment_reminder', 'payment_overdue', 'payment_received', 'contract_expiring', 'system_alert'
    priority: v.string(), // 'low', 'medium', 'high', 'urgent'
    isRead: v.boolean(),
    userId: v.optional(v.id("users")),
    parentId: v.optional(v.id("parents")),
    paymentId: v.optional(v.id("payments")),
    contractId: v.optional(v.id("contracts")),
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_parent", ["parentId"])
    .index("by_type", ["type"])
    .index("by_priority", ["priority"])
    .index("by_read_status", ["isRead"])
    .index("by_created_at", ["createdAt"]),

  // PLAYERS AND ASSESSMENTS
  players: defineTable({
    parentId: v.id("parents"),
    name: v.string(),
    age: v.optional(v.string()),
    team: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_name", ["name"]),

  assessments: defineTable({
    parentId: v.id("parents"),
    playerId: v.id("players"),
    programName: v.optional(v.string()),
    skills: v.array(v.object({ skillName: v.string(), rating: v.number() })),
    aiParentSuggestions: v.optional(v.string()),
    aiGameplayAnalysis: v.optional(v.string()),
    aiProgressSummary: v.optional(v.string()),
    category: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_player", ["playerId"])
    .index("by_created_at", ["createdAt"]),

  // LEAGUE FEE SYSTEM
  seasons: defineTable({
    name: v.string(), // "Summer League 2024", "Fall Tournament 2024"
    type: v.string(), // "summer_league", "fall_tournament"
    year: v.number(), // 2024
    startDate: v.number(),
    endDate: v.number(),
    registrationDeadline: v.optional(v.number()),
    isActive: v.boolean(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_year", ["year"])
    .index("by_active", ["isActive"])
    .index("by_type_year", ["type", "year"]),

  leagueFees: defineTable({
    seasonId: v.id("seasons"),
    parentId: v.id("parents"),
    amount: v.number(), // Base fee amount ($95)
    processingFee: v.optional(v.number()), // Stripe processing fee for online payments
    totalAmount: v.number(), // amount + processingFee (for online) or just amount (for in-person)
    paymentMethod: v.string(), // "online", "in_person"
    status: v.string(), // "pending", "paid", "overdue", "cancelled"
    dueDate: v.number(),
    paidAt: v.optional(v.number()),
    stripePaymentLinkId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    remindersSent: v.number(),
    lastReminderSent: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_season", ["seasonId"])
    .index("by_parent", ["parentId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"])
    .index("by_season_parent", ["seasonId", "parentId"])
    .index("by_season_status", ["seasonId", "status"])
    .index("by_overdue", ["status", "dueDate"])
    .index("by_payment_method", ["paymentMethod"]),

  leagueFeeReminders: defineTable({
    leagueFeeId: v.id("leagueFees"),
    parentId: v.id("parents"),
    seasonId: v.id("seasons"),
    reminderType: v.string(), // "initial", "first_reminder", "second_reminder", "final_notice"
    scheduledFor: v.number(),
    sentAt: v.optional(v.number()),
    status: v.string(), // "scheduled", "sent", "failed", "cancelled"
    messageLogId: v.optional(v.id("messageLogs")),
    failureReason: v.optional(v.string()),
    retryCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_league_fee", ["leagueFeeId"])
    .index("by_parent", ["parentId"])
    .index("by_season", ["seasonId"])
    .index("by_scheduled_for", ["scheduledFor"])
    .index("by_status", ["status"])
    .index("by_reminder_type", ["reminderType"])
    .index("by_due_reminders", ["status", "scheduledFor"]),

});