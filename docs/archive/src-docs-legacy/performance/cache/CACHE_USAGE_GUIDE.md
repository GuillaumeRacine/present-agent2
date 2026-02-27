# Cache Usage Guide - Quick Start

## 🚀 Quick Start (5 Minutes)

### 1. Install Redis (Choose One)

**Option A: Local Redis (Best for Development)**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Verify
redis-cli ping  # Should return: PONG
```

**Option B: Redis Cloud (Best for Production)**
1. Sign up at https://redis.com/try-free/ (no credit card)
2. Create a database
3. Copy the connection URL

### 2. Configure Environment

Edit `.env.local`:

```env
# For Local Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OR for Redis Cloud
REDIS_URL=redis://default:password@your-instance.cloud.redislabs.com:12345

# Enable caching
CACHE_ENABLED=true
CACHE_STATS_INTERVAL=600
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Test the Cache

```bash
npm run test:cache
```

Expected output:
```
✓ All tests completed successfully!

Cache Statistics:
  Hits: 15
  Misses: 5
  Hit Rate: 75%
  Redis Available: Yes
```

### 5. Start the Server

```bash
npm run server
```

Monitor cache hits in logs:
```
[debug] Cache hit (Redis) { key: 'present-agent:embedding:a1b2c3d4' }
[info] Cached hybrid search results (15 candidates) for 15 minutes
```

## 📊 Performance Impact

### Before Caching
- Response time: **27.7 seconds**
- OpenAI API calls: **4-8 per request**

### After Caching (Warm Cache)
- Response time: **3-5 seconds** (85% faster)
- OpenAI API calls: **0-1 per request** (85% savings)

### First Request vs. Subsequent
```
Request 1 (cold cache): ~25s
Request 2 (warm cache): ~3-5s
Request 3+ (warm cache): ~3-5s
```

## 💡 What Gets Cached?

1. **Embeddings** (24h TTL)
   - Text embeddings for semantic search
   - Most expensive operation (OpenAI API)
   - Highest impact on performance

2. **Hybrid Search Results** (15min TTL)
   - Product search results
   - Database queries
   - Reduces Neo4j load

3. **Interest Searches** (1h TTL)
   - Interest-based product queries
   - Catalog queries

## 🔍 How to Verify It's Working

### Method 1: Check Logs
```bash
LOG_LEVEL=debug npm run server
```

Look for:
```
[debug] Cache hit (Redis) ...
[debug] Embedding cache hit ...
[info] Hybrid search results retrieved from cache ...
```

### Method 2: Make Duplicate Requests
```bash
# First request (slow)
time curl -X POST http://localhost:3001/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"recipientName": "Alex", "interests": ["technology"], "budget": 100}'

# Second request (fast - from cache)
time curl -X POST http://localhost:3001/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"recipientName": "Alex", "interests": ["technology"], "budget": 100}'
```

### Method 3: View Statistics
```bash
# In another terminal while server is running
redis-cli INFO stats
redis-cli KEYS "present-agent:*"
```

## 🛠️ Troubleshooting

### ❌ "Redis connection error"
**Solution**: Redis not running or wrong configuration

```bash
# Check if Redis is running
redis-cli ping

# Start Redis (macOS)
brew services start redis

# Start Redis (Linux)
sudo systemctl start redis-server

# Check Redis logs
brew services restart redis
tail -f /usr/local/var/log/redis.log  # macOS
tail -f /var/log/redis/redis-server.log  # Linux
```

### ❌ "Using in-memory fallback"
**Status**: Normal - cache still works, just not persistent

**To use Redis**:
1. Install Redis (see Quick Start)
2. Configure `.env.local`
3. Restart server

### ❌ "Low cache hit rate"
**Causes**:
- Cold cache (first use) - **Normal**
- Highly variable queries - **Expected**
- TTL too short - **Adjust in code**

**Solution**: Run multiple identical queries to warm up cache

### ❌ "High memory usage"
**Solution**: Using Redis instead of in-memory

```env
# Use Redis (external process, doesn't use Node.js memory)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 🧪 Testing Cache Performance

### Simple Test
```bash
npm run test:cache
```

### Benchmark Script
```bash
# Run benchmark twice to see cache impact
npm run benchmark
npm run benchmark  # Second run should be much faster
```

### Manual Performance Test
```typescript
// scripts/test-performance.ts
import { generateEmbedding } from './src/lib/llm.js';

const text = 'thoughtful gift for tech enthusiast';

// First call (cache miss)
console.time('First call');
await generateEmbedding(text);
console.timeEnd('First call');

// Second call (cache hit)
console.time('Second call');
await generateEmbedding(text);
console.timeEnd('Second call');
```

## 📈 Monitoring Production

### View Cache Statistics
```typescript
import { cache } from './src/lib/cache.js';

// Log current statistics
cache.logStats();

// Output:
// Cache Statistics {
//   hits: 245,
//   misses: 67,
//   hitRate: 78.53%,
//   errors: 0,
//   redisAvailable: true,
//   totalRequests: 312
// }
```

### Set Up Automatic Logging
In `.env.local`:
```env
CACHE_STATS_INTERVAL=600  # Log stats every 10 minutes
```

### Monitor Redis Directly
```bash
# Connect to Redis CLI
redis-cli

# View all cache keys
KEYS "present-agent:*"

# Check memory usage
INFO memory

# Monitor operations in real-time
MONITOR
```

## 🔄 Cache Management

### Clear Cache
```typescript
import { cache } from './src/lib/cache.js';

// Clear all cache
await cache.clearAll();

// Clear specific type
await cache.clearPrefix('embedding');
await cache.clearPrefix('hybrid-search');
```

### Manual Cache Operations
```typescript
import { cache, CacheTTL } from './src/lib/cache.js';

// Set value
await cache.set('my-key', { data: 'value' }, CacheTTL.PRODUCT_QUERY);

// Get value
const value = await cache.get('my-key');

// Delete value
await cache.delete('my-key');
```

## 📝 Cache Key Format

All keys follow this pattern:
```
present-agent:<type>:<hash>

Examples:
present-agent:embedding:a1b2c3d4e5f6789a
present-agent:hybrid-search:1a2b3c4d5e6f789a
present-agent:search:9f8e7d6c5b4a3210
```

## 🎯 Best Practices

1. **Keep Redis Running**: For best performance
2. **Monitor Hit Rate**: Aim for >70%
3. **Adjust TTLs**: Based on your update frequency
4. **Use Logging**: Enable stats interval
5. **Clear on Updates**: When catalog changes

## 🆘 Need Help?

1. **Check Logs**: `LOG_LEVEL=debug npm run server`
2. **Run Tests**: `npm run test:cache`
3. **Verify Redis**: `redis-cli ping`
4. **Review Stats**: `cache.logStats()`
5. **Check Docs**: See `CACHING_IMPLEMENTATION.md`

## ✅ Success Checklist

- [ ] Redis installed and running
- [ ] `.env.local` configured
- [ ] `npm install` completed
- [ ] `npm run test:cache` passes
- [ ] Server starts without errors
- [ ] Cache hits visible in logs
- [ ] Second request faster than first

If all checked, you're ready to go! 🎉

## 🚀 Next Steps

1. **Production Setup**: Use Redis Cloud
2. **Monitoring**: Set up alerts for cache hit rate
3. **Optimization**: Adjust TTLs based on usage patterns
4. **Scaling**: Consider Redis Cluster for high traffic

For detailed information, see `CACHING_IMPLEMENTATION.md`.
