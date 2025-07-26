import { z } from 'zod'

// Common validation patterns
const emailSchema = z.string().email('Invalid email format')
const phoneSchema = z.string().regex(/^[\+]?[(]?[\d\s\-\(\)]{7,20}$/, 'Invalid phone number format').optional()
const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name too long')

// Parent validation schemas
export const CreateParentSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.nullable(),
  address: z.string().max(500, 'Address too long').optional().nullable(),
  emergencyContact: z.string().max(100, 'Emergency contact name too long').optional().nullable(),
  emergencyPhone: phoneSchema.nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable()
})

export const UpdateParentSchema = CreateParentSchema.partial().extend({
  id: z.string().cuid('Invalid parent ID format')
})

// Payment plan validation schemas
export const CreatePaymentPlanSchema = z.object({
  parentId: z.string().cuid('Invalid parent ID'),
  type: z.enum(['monthly', 'seasonal', 'custom', 'full'], {
    errorMap: () => ({ message: 'Invalid payment plan type' })
  }),
  totalAmount: z.number().positive('Total amount must be positive'),
  installmentAmount: z.number().positive('Installment amount must be positive'),
  installments: z.number().int().positive('Installments must be a positive integer'),
  startDate: z.string().datetime('Invalid start date format'),
  description: z.string().max(500, 'Description too long').optional().nullable()
})

// Message template validation schemas
export const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name too long'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  body: z.string().min(1, 'Message body is required').max(5000, 'Message body too long'),
  category: z.enum(['general', 'payment', 'reminder', 'welcome', 'overdue', 'contract'], {
    errorMap: () => ({ message: 'Invalid template category' })
  }),
  channel: z.enum(['email', 'sms', 'both'], {
    errorMap: () => ({ message: 'Invalid communication channel' })
  }),
  variables: z.array(z.string()).default([])
})

// Contract validation schemas
export const CreateContractSchema = z.object({
  parentId: z.string().cuid('Invalid parent ID'),
  fileName: z.string().min(1, 'File name is required'),
  originalName: z.string().min(1, 'Original file name is required'),
  fileUrl: z.string().url('Invalid file URL'),
  fileSize: z.number().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
  templateType: z.enum(['seasonal', 'annual', 'custom']).optional().nullable(),
  expiresAt: z.string().datetime('Invalid expiration date').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable()
})

// Message sending validation schemas
export const SendMessageSchema = z.object({
  recipients: z.array(z.string().cuid('Invalid recipient ID')).min(1, 'At least one recipient required'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long').optional(),
  body: z.string().min(1, 'Message body is required').max(5000, 'Message body too long'),
  channel: z.enum(['email', 'sms'], {
    errorMap: () => ({ message: 'Invalid communication channel' })
  }),
  templateId: z.string().cuid('Invalid template ID').optional().nullable(),
  scheduledFor: z.string().datetime('Invalid scheduled date').optional().nullable()
})

// Search and filter validation schemas
export const SearchParentsSchema = z.object({
  search: z.string().max(100, 'Search term too long').optional(),
  status: z.enum(['all', 'active', 'inactive', 'suspended']).default('all'),
  contractStatus: z.enum(['all', 'pending', 'signed', 'expired']).optional(),
  paymentStatus: z.enum(['all', 'current', 'overdue', 'paid']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'email', 'status', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// Bulk operation validation schemas
export const BulkParentOperationSchema = z.object({
  operation: z.enum(['delete', 'activate', 'deactivate', 'export'], {
    errorMap: () => ({ message: 'Invalid bulk operation' })
  }),
  parentIds: z.array(z.string().cuid('Invalid parent ID')).min(1, 'At least one parent ID required')
})

// CSV import validation schema
export const CSVImportSchema = z.object({
  mapping: z.record(z.string(), z.string()),
  validateOnly: z.boolean().default(false),
  skipDuplicates: z.boolean().default(true)
})

// Validation helper functions
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      throw new Error(`Validation failed: ${messages.join(', ')}`)
    }
    throw error
  }
}

export function validatePartialData<T extends z.ZodRawShape>(schema: z.ZodObject<T>, data: unknown): Partial<z.infer<z.ZodObject<T>>> {
  try {
    return schema.partial().parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      throw new Error(`Validation failed: ${messages.join(', ')}`)
    }
    throw error
  }
}

// Sanitization helpers
export function sanitizeString(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null
  return input.trim().replace(/\s+/g, ' ') || null
}

export function sanitizeEmail(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null
  return input.trim().toLowerCase() || null
}

export function sanitizePhone(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null
  // Remove all non-digit characters except + at the beginning
  return input.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '') || null
}

// Data sanitization for parent objects
export function sanitizeParentData(data: any) {
  return {
    ...data,
    name: sanitizeString(data.name),
    email: sanitizeEmail(data.email),
    phone: sanitizePhone(data.phone),
    address: sanitizeString(data.address),
    emergencyContact: sanitizeString(data.emergencyContact),
    emergencyPhone: sanitizePhone(data.emergencyPhone),
    notes: sanitizeString(data.notes)
  }
} 