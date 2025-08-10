
import { Doc, Id } from "../convex/_generated/dataModel";

// Convex document types - only using tables that exist in schema
export type Parent = Doc<"parents">;
export type PaymentPlan = Doc<"paymentPlans">;
export type Payment = Doc<"payments">;
export type PaymentInstallment = Doc<"paymentInstallments">;
export type Template = Doc<"templates">;
export type MessageLog = Doc<"messageLogs">;
export type User = Doc<"users">;
export type Team = Doc<"teams">;
export type AuditLog = Doc<"auditLogs">;
export type SystemSettings = Doc<"systemSettings">;

// Extended types with relations
export type ParentWithRelations = Parent & {
  paymentPlans?: PaymentPlan[];
  payments?: Payment[];
  messageLogs?: MessageLog[];
  team?: Team;
};

export type PaymentWithRelations = Payment & {
  parent?: Parent;
  paymentPlan?: PaymentPlan;
  installments?: PaymentInstallment[];
};

export type PaymentPlanWithRelations = PaymentPlan & {
  parent?: Parent;
  payments?: Payment[];
};

// Utility types
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type MessageChannel = 'email' | 'sms' | 'both';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'completed' | 'cancelled';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RecommendationStatus = 'pending' | 'accepted' | 'dismissed' | 'implemented';

// API Response types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T = any> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Dashboard types
/* Deprecated duplicate DashboardStats type (old version preserved for reference)

export type DashboardStats_DEPRECATED = {
  // old fields deprecated - use new DashboardStats interface below
// totalParents: number;
  totalPayments: number;
  totalRevenue: number;
  overduePayments: number;
  recentActivity: any[];
};
*/

// Communication types
export type BulkMessageRequest = {
  recipients: string[];
  template: string;
  variables?: Record<string, any>;
  channel: MessageChannel;
  scheduledFor?: number;
};

export type MessageTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  channel: MessageChannel;
};

// Analytics types
export type RevenueData = {
  month: string;
  revenue: number;
  payments: number;
};

export type PaymentAnalytics = {
  totalRevenue: number;
  totalPayments: number;
  averagePayment: number;
  overdueAmount: number;
  overdueCount: number;
  revenueByMonth: RevenueData[];
};

// Stripe types
export type StripePaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
};

// AI types
export type AIAnalysisResult = {
  insights: string[];
  recommendations: string[];
  score: number;
  confidence: number;
};

export type AIMessageGeneration = {
  subject: string;
  body: string;
  tone: 'formal' | 'friendly' | 'urgent';
  personalization: Record<string, any>;
};

export type AIRecommendationWithRelations = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: RecommendationStatus;
  confidence: number;
  estimatedImpact: string;
  createdAt: string;
  implementedAt?: string;
  isExecuted?: boolean;
  autoExecutable?: boolean;
  metadata?: Record<string, any>;

  // Optional properties referenced in the AI insights UI
  expectedImpact?: string;
  context?: string;
  actions?: string[];
  executionResult?: string;
  expiresAt?: number;

  // Permit other ad-hoc props in future without compile errors
  [key: string]: any;
};

// Bulk upload types
export type BulkUploadParent = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
};

export type ValidationError = {
  row: number;
  field: string;
  message: string;
  value: string;
};

export type BulkUploadValidation = {
  data: BulkUploadParent[];
  errors: ValidationError[];
  duplicates: Array<{
    // For backward compatibility: server may return `email` or `combo` (email|name)
    email?: string;
    combo?: string;
    rows: number[];
    existsInDb: boolean;
  }>;
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    duplicateRows: number;
  };
};

export type BulkImportResult = {
  success: boolean;
  created: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    message: string;
  }>;
  successfulParents: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

// Add missing export types to satisfy compiler references
export type AIMessageRequest = {
  parentId: string
  templateId?: string
  variables?: Record<string, any>
  channel?: MessageChannel
  scheduledFor?: number

  // Additional optional fields used by various pages
  context?: string
  customInstructions?: string
  includePersonalization?: boolean

  // Allow unforeseen fields without failing type-checking
  [key: string]: any
}

export type PaymentTrend = {
  period: string // e.g. '2025-07' or 'Jul 2025'
  revenue: number
  payments: number
}

export type PaymentStats = {
  total: number
  paid: number
  pending: number
  overdue: number
}

// Placeholder type definitions for recurring messages
export type RecurringMessage = {
  _id: Id<"recurringMessages">
  parentIds: Id<"parents">[]
  templateId?: Id<"templates">
  channel: MessageChannel
  frequency: RecurringFrequency
  nextRunAt: number
  instances: Array<{
    scheduledAt: number
    sentAt?: number
    successCount: number
    recipientCount: number
  }>
  createdAt: number
}

/* Deprecated duplicate
export type RecurringMessageWithRelations_DEPRECATED = RecurringMessage & {
//   template?: Template
  // parents?: Parent[]
// }
*/

// Placeholder for template version relations
export type TemplateVersion = {
  _id: string // Id<"templateVersions">
  templateId: Id<"templates">
  versionNumber: number
  content: string
  subject?: string
  createdAt: number
  improvements?: Array<{
    description: string
    accepted: boolean
  }>
  analytics?: Array<{
    metric: string
    value: number
  }>
}

/* Deprecated duplicate
export type TemplateVersionWithRelations_DEPRECATED = TemplateVersion & {
//   template?: Template
  author?: User
}
*/

// Extend existing placeholder types with optional fields used across the UI ---------------------------------

// -- Dashboard stats additional metrics
export interface DashboardStats {
  totalParents: number
  totalRevenue: number
  overduePayments: number
  pendingPayments: number
  paymentSuccessRate: number
  messagesSentThisMonth: number
  activeTemplates: number
  averagePaymentTime: number
}

// -- Recurring messages extended fields
export type RecurringMessageWithRelations = RecurringMessage & {
  id?: string // convenient string id (alias for _id)
  name?: string
  subject?: string
  body?: string
  interval?: RecurringFrequency
  intervalValue?: number
  targetAudience?: string
  recipients?: string[]
  startDate?: number
  stopConditions?: string
  isActive?: boolean
  pausedAt?: number
  template?: TemplateWithRelations | Template
  parents?: ParentWithRelations[] | Parent[]
}

// -- Template related extended types --------------------------------------------------
export type TemplateWithRelations = Template & {
  id?: string
  name?: string
  subject?: string
  body?: string
  channel?: MessageChannel
  category?: string
  createdAt?: number
  updatedAt?: number
  versions?: TemplateVersionWithRelations[]
  scheduledMessages?: RecurringMessageWithRelations[]
  messageLogs?: MessageLog[]
}

export type TemplateVersionWithRelations = TemplateVersion & {
  id?: string // alias
  version?: number // alias for versionNumber used in UI
  body?: string
  isAiGenerated?: boolean
  createdBy?: string
  performanceScore?: number
  usageCount?: number
  changeDescription?: string
  aiPrompt?: string
  analytics?: Array<{
    metricType?: string
    metric?: string
    value: number
  }>
  improvements?: Array<{
    id?: string
    description: string
    accepted: boolean
    improvementType?: string
    confidence?: number
    reason?: string
    originalText?: string
    improvedText?: string
    acceptedAt?: number
  }>
}

// --------------------------------------------------------------------------------------
