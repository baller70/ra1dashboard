// Test utilities for API endpoints and validation
import { NextRequest } from 'next/server'

// Mock request helper for testing
export function createMockRequest(
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const init: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    init.body = JSON.stringify(body)
  }

  return new NextRequest(url, init)
}

// Mock session helper
export const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin'
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

// Test data generators
export const testData = {
  parent: {
    valid: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      address: '123 Main St, City, State 12345',
      emergencyContact: 'Jane Doe',
      emergencyPhone: '+0987654321',
      notes: 'Test parent'
    },
    invalid: {
      noName: {
        email: 'test@example.com',
        phone: '+1234567890'
      },
      noEmail: {
        name: 'John Doe',
        phone: '+1234567890'
      },
      invalidEmail: {
        name: 'John Doe',
        email: 'invalid-email',
        phone: '+1234567890'
      },
      invalidPhone: {
        name: 'John Doe',
        email: 'test@example.com',
        phone: 'invalid-phone'
      }
    }
  },

  paymentPlan: {
    valid: {
      parentId: 'test-parent-id',
      type: 'monthly',
      totalAmount: 1000,
      installmentAmount: 100,
      installments: 10,
      startDate: new Date().toISOString(),
      description: 'Test payment plan'
    }
  },

  template: {
    valid: {
      name: 'Test Template',
      subject: 'Test Subject',
      body: 'Test message body with {{name}} variable',
      category: 'general',
      channel: 'email',
      variables: ['name']
    }
  }
}

// API response validators
export function validateApiResponse(response: Response, expectedStatus: number = 200) {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`)
  }
  return response
}

export async function validateJsonResponse(response: Response, expectedStatus: number = 200) {
  validateApiResponse(response, expectedStatus)
  
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Response is not JSON')
  }
  
  return response.json()
}

// Database connection test helper
export async function testDatabaseConnection() {
  try {
    const response = await fetch('http://localhost:3000/api/health')
    const health = await response.json()
    return health.database === 'connected'
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

// API endpoint test helper
export async function testApiEndpoint(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  expectedStatus: number = 200
) {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`http://localhost:3000${endpoint}`, options)
    const data = await validateJsonResponse(response, expectedStatus)
    
    return {
      success: true,
      status: response.status,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 0,
      data: null
    }
  }
}

// Validation test helpers
export function testValidation(validationFn: Function, testCases: any[]) {
  const results = testCases.map(testCase => {
    try {
      const result = validationFn(testCase.input)
      return {
        input: testCase.input,
        expected: testCase.expected,
        result,
        success: testCase.shouldPass,
        error: null
      }
    } catch (error) {
      return {
        input: testCase.input,
        expected: testCase.expected,
        result: null,
        success: !testCase.shouldPass,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  const passed = results.filter(r => r.success).length
  const total = results.length
  
  return {
    passed,
    total,
    success: passed === total,
    results
  }
}

// Performance test helper
export async function measureApiPerformance(
  endpoint: string,
  iterations: number = 10,
  method: string = 'GET',
  body?: any
) {
  const times: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now()
    await testApiEndpoint(endpoint, method, body)
    const end = Date.now()
    times.push(end - start)
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  
  return {
    average: avg,
    min,
    max,
    times,
    iterations
  }
} 