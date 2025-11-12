/**
 * Redis-based Caching Layer with In-Memory Fallback
 *
 * Provides caching for:
 * - Text embeddings (24h TTL)
 * - Interest searches (1h TTL)
 * - Hybrid search results (15min TTL)
 * - Product queries (1h TTL)
 *
 * Features:
 * - Graceful degradation to in-memory cache if Redis unavailable
 * - Automatic connection management
 * - Cache hit/miss statistics
 * - Consistent key naming convention
 * - TTL management
 * - Error handling
 */

import Redis from 'ioredis';
import { logger } from './logger.js';
import * as crypto from 'crypto';

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  redisAvailable: boolean;
  inMemoryFallback: boolean;
}

// In-memory cache entry
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  redisUrl?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  maxInMemorySize: number;
  enableStats: boolean;
}

// Default TTLs (in seconds)
export const CacheTTL = {
  EMBEDDING: 24 * 60 * 60,      // 24 hours
  INTEREST_SEARCH: 60 * 60,     // 1 hour
  HYBRID_SEARCH: 15 * 60,       // 15 minutes
  PRODUCT_QUERY: 60 * 60,       // 1 hour
  ARCHETYPE_QUERY: 60 * 60,     // 1 hour
} as const;

class CacheManager {
  private redis: Redis | null = null;
  private inMemoryCache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    redisAvailable: false,
    inMemoryFallback: false,
  };
  private config: CacheConfig;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enabled: process.env.CACHE_ENABLED !== 'false',
      redisUrl: process.env.REDIS_URL,
      redisHost: process.env.REDIS_HOST || 'localhost',
      redisPort: parseInt(process.env.REDIS_PORT || '6379'),
      redisPassword: process.env.REDIS_PASSWORD,
      maxInMemorySize: 1000,
      enableStats: true,
      ...config,
    };
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    // Return existing initialization promise if in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Already initialized
    if (this.isInitialized) {
      return;
    }

    this.initPromise = this._initialize();
    await this.initPromise;
    this.initPromise = null;
  }

  private async _initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Cache disabled via configuration');
      this.stats.inMemoryFallback = true;
      this.isInitialized = true;
      return;
    }

    try {
      // Initialize Redis client
      if (this.config.redisUrl) {
        this.redis = new Redis(this.config.redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.warn('Redis connection failed after 3 retries, falling back to in-memory cache');
              return null; // Stop retrying
            }
            return Math.min(times * 100, 2000);
          },
          lazyConnect: true,
        });
      } else {
        this.redis = new Redis({
          host: this.config.redisHost,
          port: this.config.redisPort,
          password: this.config.redisPassword,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.warn('Redis connection failed after 3 retries, falling back to in-memory cache');
              return null;
            }
            return Math.min(times * 100, 2000);
          },
          lazyConnect: true,
        });
      }

      // Set up error handlers
      this.redis.on('error', (err) => {
        logger.warn('Redis connection error, falling back to in-memory cache', { error: err.message });
        this.stats.redisAvailable = false;
        this.stats.inMemoryFallback = true;
        this.stats.errors++;
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.stats.redisAvailable = true;
        this.stats.inMemoryFallback = false;
      });

      this.redis.on('ready', () => {
        logger.info('Redis ready for operations');
        this.stats.redisAvailable = true;
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed, using in-memory cache');
        this.stats.redisAvailable = false;
        this.stats.inMemoryFallback = true;
      });

      // Try to connect
      await this.redis.connect();

      // Ping to verify connection
      await this.redis.ping();

      this.stats.redisAvailable = true;
      logger.info('Redis cache initialized successfully', {
        host: this.config.redisHost,
        port: this.config.redisPort,
      });
    } catch (error) {
      logger.warn('Failed to initialize Redis, using in-memory cache', { error });
      this.stats.redisAvailable = false;
      this.stats.inMemoryFallback = true;
      this.redis = null;
    }

    this.isInitialized = true;
  }

  /**
   * Generate consistent cache key
   */
  generateKey(prefix: string, data: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
    return `present-agent:${prefix}:${hash}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Try Redis first
      if (this.redis && this.stats.redisAvailable) {
        const value = await this.redis.get(key);
        if (value) {
          this.stats.hits++;
          if (this.config.enableStats) {
            logger.debug('Cache hit (Redis)', { key });
          }
          return JSON.parse(value) as T;
        }
      }

      // Try in-memory cache
      const entry = this.inMemoryCache.get(key);
      if (entry) {
        // Check if expired
        if (Date.now() < entry.expiresAt) {
          this.stats.hits++;
          if (this.config.enableStats) {
            logger.debug('Cache hit (in-memory)', { key });
          }
          return entry.value as T;
        } else {
          // Remove expired entry
          this.inMemoryCache.delete(key);
        }
      }

      // Cache miss
      this.stats.misses++;
      if (this.config.enableStats) {
        logger.debug('Cache miss', { key });
      }
      return null;
    } catch (error) {
      logger.warn('Cache get error', { key, error });
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const serialized = JSON.stringify(value);

      // Set in Redis if available
      if (this.redis && this.stats.redisAvailable) {
        await this.redis.setex(key, ttlSeconds, serialized);
        if (this.config.enableStats) {
          logger.debug('Cache set (Redis)', { key, ttl: ttlSeconds });
        }
      }

      // Always set in in-memory cache as fallback
      const expiresAt = Date.now() + ttlSeconds * 1000;
      this.inMemoryCache.set(key, { value, expiresAt });

      // Enforce max in-memory size (LRU-like eviction)
      if (this.inMemoryCache.size > this.config.maxInMemorySize) {
        const firstKey = this.inMemoryCache.keys().next().value;
        if (firstKey) {
          this.inMemoryCache.delete(firstKey);
        }
      }

      if (this.config.enableStats && (!this.redis || !this.stats.redisAvailable)) {
        logger.debug('Cache set (in-memory)', { key, ttl: ttlSeconds });
      }
    } catch (error) {
      logger.warn('Cache set error', { key, error });
      this.stats.errors++;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Delete from Redis
      if (this.redis && this.stats.redisAvailable) {
        await this.redis.del(key);
      }

      // Delete from in-memory cache
      this.inMemoryCache.delete(key);
    } catch (error) {
      logger.warn('Cache delete error', { key, error });
      this.stats.errors++;
    }
  }

  /**
   * Clear all cache entries with a prefix
   */
  async clearPrefix(prefix: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Clear from Redis
      if (this.redis && this.stats.redisAvailable) {
        const pattern = `present-agent:${prefix}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.info(`Cleared ${keys.length} keys from Redis with prefix: ${prefix}`);
        }
      }

      // Clear from in-memory cache
      const prefixPattern = `present-agent:${prefix}:`;
      let cleared = 0;
      const keysToDelete: string[] = [];
      this.inMemoryCache.forEach((_, key) => {
        if (key.startsWith(prefixPattern)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => {
        this.inMemoryCache.delete(key);
        cleared++;
      });
      if (cleared > 0) {
        logger.info(`Cleared ${cleared} keys from in-memory cache with prefix: ${prefix}`);
      }
    } catch (error) {
      logger.warn('Cache clear prefix error', { prefix, error });
      this.stats.errors++;
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Clear Redis
      if (this.redis && this.stats.redisAvailable) {
        const keys = await this.redis.keys('present-agent:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.info(`Cleared ${keys.length} keys from Redis`);
        }
      }

      // Clear in-memory cache
      const size = this.inMemoryCache.size;
      this.inMemoryCache.clear();
      logger.info(`Cleared ${size} keys from in-memory cache`);
    } catch (error) {
      logger.warn('Cache clear all error', { error });
      this.stats.errors++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number; totalRequests: number } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.errors = 0;
  }

  /**
   * Log cache statistics
   */
  logStats(): void {
    const stats = this.getStats();
    logger.info('Cache Statistics', {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${stats.hitRate}%`,
      errors: stats.errors,
      redisAvailable: stats.redisAvailable,
      inMemoryFallback: stats.inMemoryFallback,
      totalRequests: stats.totalRequests,
    });
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.warn('Error closing Redis connection', { error });
      }
    }
    this.inMemoryCache.clear();
    this.isInitialized = false;
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.stats.redisAvailable;
  }

  /**
   * Cleanup expired in-memory cache entries
   */
  cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    const keysToDelete: string[] = [];
    this.inMemoryCache.forEach((entry, key) => {
      if (now >= entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      this.inMemoryCache.delete(key);
      cleaned++;
    });
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired in-memory cache entries`);
    }
  }
}

// Global cache instance
export const cache = new CacheManager();

// Helper functions for common cache operations

/**
 * Cache wrapper for embedding generation
 */
export async function withEmbeddingCache<T extends number[]>(
  text: string,
  generator: (text: string) => Promise<T>
): Promise<T> {
  const key = cache.generateKey('embedding', text);

  // Try to get from cache
  const cached = await cache.get<T>(key);
  if (cached) {
    return cached;
  }

  // Generate and cache
  const embedding = await generator(text);
  await cache.set(key, embedding, CacheTTL.EMBEDDING);
  return embedding;
}

/**
 * Cache wrapper for search results
 */
export async function withSearchCache<T>(
  searchParams: any,
  ttl: number,
  searcher: () => Promise<T>
): Promise<T> {
  const key = cache.generateKey('search', searchParams);

  // Try to get from cache
  const cached = await cache.get<T>(key);
  if (cached) {
    return cached;
  }

  // Search and cache
  const results = await searcher();
  await cache.set(key, results, ttl);
  return results;
}

/**
 * Initialize cache on module load
 */
cache.initialize().catch((error) => {
  logger.warn('Cache initialization failed, using in-memory fallback', { error });
});

// Cleanup expired entries periodically (every 5 minutes)
setInterval(() => {
  cache.cleanupExpired();
}, 5 * 60 * 1000);

// Log stats periodically (every 10 minutes) if enabled
if (process.env.CACHE_STATS_INTERVAL) {
  const interval = parseInt(process.env.CACHE_STATS_INTERVAL);
  setInterval(() => {
    cache.logStats();
  }, interval * 1000);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await cache.close();
});

process.on('SIGINT', async () => {
  await cache.close();
});

export default cache;
