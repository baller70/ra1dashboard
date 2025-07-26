
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

export type TemplateWithRelations = Template & {
  messageLogs?: MessageLog[];
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
export type DashboardStats = {
  totalParents: number;
  totalPayments: number;
  totalRevenue: number;
  overduePayments: number;
  recentActivity: any[];
};

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
    email: string;
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
