#!/usr/bin/env tsx

import { performance } from 'perf_hooks'

interface PerformanceMetrics {
  timestamp: number
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  cacheHit?: boolean
  memoryUsage: NodeJS.MemoryUsage
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxMetrics = 1000 // Keep last 1000 requests
  
  startRequest(endpoint: string, method: string) {
    return {
      endpoint,
      method,
      startTime: performance.now(),
      startMemory: process.memoryUsage()
    }
  }
  
  endRequest(
    requestData: ReturnType<typeof this.startRequest>,
    statusCode: number,
    cacheHit: boolean = false
  ) {
    const endTime = performance.now()
    const responseTime = endTime - requestData.startTime
    
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      endpoint: requestData.endpoint,
      method: requestData.method,
      responseTime,
      statusCode,
      cacheHit,
      memoryUsage: process.memoryUsage()
    }
    
    this.metrics.push(metric)
    
    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
    
    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`🐌 Slow request: ${requestData.method} ${requestData.endpoint} took ${responseTime.toFixed(2)}ms`)
    }
    
    return metric
  }
  
  getStats(timeWindowMs: number = 60000) {
    const cutoff = Date.now() - timeWindowMs
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff)
    
    if (recentMetrics.length === 0) {
      return null
    }
    
    const responseTimes = recentMetrics.map(m => m.responseTime)
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length
    
    return {
      totalRequests: recentMetrics.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      medianResponseTime: this.median(responseTimes),
      p95ResponseTime: this.percentile(responseTimes, 95),
      slowRequests: recentMetrics.filter(m => m.responseTime > 1000).length,
      cacheHitRate: (cacheHits / recentMetrics.length) * 100,
      memoryUsage: process.memoryUsage(),
      timeWindow: `${timeWindowMs / 1000}s`
    }
  }
  
  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid]
  }
  
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }
  
  logStats() {
    const stats = this.getStats()
    if (!stats) {
      console.log('📊 No performance data available')
      return
    }
    
    console.log('\n📊 Performance Stats (Last 60s):')
    console.log(`   Total Requests: ${stats.totalRequests}`)
    console.log(`   Avg Response Time: ${stats.averageResponseTime.toFixed(2)}ms`)
    console.log(`   Median Response Time: ${stats.medianResponseTime.toFixed(2)}ms`)
    console.log(`   95th Percentile: ${stats.p95ResponseTime.toFixed(2)}ms`)
    console.log(`   Slow Requests (>1s): ${stats.slowRequests}`)
    console.log(`   Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`)
    console.log(`   Memory Usage: ${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`)
    console.log('─'.repeat(50))
  }
  
  exportMetrics(filename?: string) {
    const data = {
      exportedAt: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.getStats(24 * 60 * 60 * 1000) // Last 24 hours
    }
    
    const fs = require('fs')
    const path = require('path')
    
    const exportFile = filename || `performance-${Date.now()}.json`
    const exportPath = path.join(process.cwd(), 'logs', exportFile)
    
    // Ensure logs directory exists
    const logsDir = path.dirname(exportPath)
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2))
    console.log(`📁 Performance metrics exported to: ${exportPath}`)
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Auto-log stats every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    performanceMonitor.logStats()
  }, 5 * 60 * 1000)
}

// Middleware helper for API routes
export function withPerformanceMonitoring(
  handler: (req: any, res: any) => Promise<any>
) {
  return async (req: any, res: any) => {
    const requestData = performanceMonitor.startRequest(req.url, req.method)
    
    try {
      const result = await handler(req, res)
      performanceMonitor.endRequest(requestData, res.status || 200)
      return result
    } catch (error) {
      performanceMonitor.endRequest(requestData, 500)
      throw error
    }
  }
}

// CLI tool
if (require.main === module) {
  const command = process.argv[2]
  
  switch (command) {
    case 'stats':
      performanceMonitor.logStats()
      break
    case 'export':
      performanceMonitor.exportMetrics()
      break
    default:
      console.log('Usage: tsx performance-monitor.ts [stats|export]')
  }
} 