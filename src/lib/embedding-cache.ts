/**
 * Embedding Cache Utility
 *
 * Provides in-memory caching for embeddings to reduce API calls and improve performance.
 * Cache uses LRU strategy with TTL to balance memory and freshness.
 */

import { generateEmbedding } from './llm.js';
import { logger } from './logger.js';
import { createHash } from 'crypto';

interface CacheEntry {
  embedding: number[];
  timestamp: number;
  hitCount: number;
}

class EmbeddingCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttlMs: number; // Time to live in milliseconds

  constructor(maxSize: number = 1000, ttlMinutes: number = 60) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Generate cache key from text
   */
  private getCacheKey(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.ttlMs;
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('Evicted oldest cache entry', { key: oldestKey });
    }
  }

  /**
   * Get embedding from cache or generate new one
   */
  async get(text: string): Promise<number[]> {
    const key = this.getCacheKey(text);
    const cached = this.cache.get(key);

    // Cache hit - valid entry
    if (cached && this.isValid(cached)) {
      cached.hitCount++;
      logger.debug('Embedding cache hit', { key: key.substring(0, 8), hitCount: cached.hitCount });
      return cached.embedding;
    }

    // Cache miss - generate new embedding
    logger.debug('Embedding cache miss', { key: key.substring(0, 8) });
    const embedding = await generateEmbedding(text);

    // Add to cache
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      hitCount: 0,
    });

    return embedding;
  }

  /**
   * Get multiple embeddings in parallel (with caching)
   */
  async getMany(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.get(text)));
  }

  /**
   * Pre-warm cache with common queries
   */
  async warmup(commonTexts: string[]): Promise<void> {
    logger.info('Warming up embedding cache', { count: commonTexts.length });
    await this.getMany(commonTexts);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('Embedding cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    avgHitCount: number;
  } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      avgHitCount: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned expired cache entries', { count: cleaned });
    }

    return cleaned;
  }
}

// Global singleton instance
export const embeddingCache = new EmbeddingCache(1000, 60);

// Periodic cleanup (every 10 minutes)
setInterval(() => {
  embeddingCache.cleanExpired();
}, 10 * 60 * 1000);
