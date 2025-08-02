import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

// Simple in-memory cache with TTL
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  set(key: string, data: any, ttlMs: number = 30000) { // Default 30s TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  clear() {
    this.cache.clear()
  }
  
  // Clean expired entries
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

const queryCache = new QueryCache()

// Cleanup expired entries every 5 minutes
setInterval(() => queryCache.cleanup(), 5 * 60 * 1000)

export class CachedConvexClient {
  public convex: ConvexHttpClient
  
  constructor(url: string) {
    this.convex = new ConvexHttpClient(url)
  }
  
  async query(query: any, args: any = {}, cacheKey?: string, ttlMs?: number) {
    // Generate cache key if not provided
    const key = cacheKey || `${query._name || 'query'}_${JSON.stringify(args)}`
    
    // Check cache first
    const cached = queryCache.get(key)
    if (cached) {
      console.log(`📦 Cache hit for ${key}`)
      return cached
    }
    
    // Execute query
    console.log(`🔍 Cache miss, executing query: ${key}`)
    const result = await this.convex.query(query, args)
    
    // Cache result
    queryCache.set(key, result, ttlMs)
    
    return result
  }
  
  async mutation(mutation: any, args: any = {}) {
    // Mutations should clear related cache entries
    const result = await this.convex.mutation(mutation, args)
    
    // Clear cache for mutations that might affect data
    const mutationName = typeof mutation._name === 'string' ? mutation._name : ''
    if (mutationName.includes('create') || 
        mutationName.includes('update') || 
        mutationName.includes('delete')) {
      queryCache.clear()
    }
    
    return result
  }
  
  clearCache() {
    queryCache.clear()
  }
}

// Optimized batch query utility
export async function batchQueries<T>(
  convex: ConvexHttpClient,
  queries: Array<{ query: any; args: any; key?: string }>,
  options: { concurrency?: number; timeout?: number } = {}
): Promise<T[]> {
  const { concurrency = 5, timeout = 10000 } = options
  
  // Process queries in batches to avoid overwhelming the server
  const results: T[] = []
  
  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency)
    
    const batchPromises = batch.map(async ({ query, args, key }) => {
      const cacheKey = key || `${query._name}_${JSON.stringify(args)}`
      const cached = queryCache.get(cacheKey)
      
      if (cached) {
        return cached
      }
      
      const result = await Promise.race([
        convex.query(query, args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ])
      
      queryCache.set(cacheKey, result)
      return result
    })
    
    const batchResults = await Promise.allSettled(batchPromises)
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error(`Query failed:`, result.reason)
        results.push(null as any) // Add null for failed queries
      }
    })
  }
  
  return results
}

// Singleton cached client
export const cachedConvex = new CachedConvexClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
)

// Pre-warm cache with common queries
export async function preWarmCache() {
  try {
    console.log('🔥 Pre-warming cache with common queries...')
    
    // Pre-load dashboard stats
    await cachedConvex.query(api.dashboard.getDashboardStats, {}, 'dashboard_stats', 60000)
    
    // Pre-load recent activity
    await cachedConvex.query(api.dashboard.getRecentActivity, {}, 'recent_activity', 30000)
    
    // Pre-load templates
    await cachedConvex.query(api.templates.getTemplates, {}, 'templates', 300000) // 5 min cache
    
    console.log('✅ Cache pre-warming complete')
  } catch (error) {
    console.error('❌ Cache pre-warming failed:', error)
  }
}

// Export for use in API routes
export { queryCache } 