// server/services/redis.service.js
const Redis = require('ioredis');
const config = require('../config');

// Shared fallback memory store
const memoryStore = new Map();
const fallbackRedis = {
  async get(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  async set(key, value) {
    memoryStore.set(key, value);
    return 'OK';
  },
  async setex(key, ttlSeconds, value) {
    memoryStore.set(key, value);
    setTimeout(() => memoryStore.delete(key), ttlSeconds * 1000).unref?.();
    return 'OK';
  },
  async del(key) {
    return memoryStore.delete(key) ? 1 : 0;
  },
};

if (config.USE_MOCK_SERVICES) {
  module.exports = fallbackRedis;
  return;
}

// Configure Redis with fail-fast settings so it doesn't block the event loop
const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 1, // fail queries immediately if connection is down
  enableOfflineQueue: false, // do not queue operations when offline
});

// Gracefully catch Redis connection errors
redis.on('error', (err) => {
  console.warn('Redis Connection Warning:', err.message);
});

// Wrapper that checks connection status and falls back to in-memory store if Redis is unavailable
const redisWrapper = {
  async get(key) {
    if (redis.status === 'ready') {
      try {
        return await redis.get(key);
      } catch (err) {
        console.warn('Redis GET failed, falling back to memory:', err.message);
      }
    }
    return fallbackRedis.get(key);
  },
  
  async set(key, value) {
    if (redis.status === 'ready') {
      try {
        return await redis.set(key, value);
      } catch (err) {
        console.warn('Redis SET failed, falling back to memory:', err.message);
      }
    }
    return fallbackRedis.set(key, value);
  },

  async setex(key, ttlSeconds, value) {
    if (redis.status === 'ready') {
      try {
        return await redis.setex(key, ttlSeconds, value);
      } catch (err) {
        console.warn('Redis SETEX failed, falling back to memory:', err.message);
      }
    }
    return fallbackRedis.setex(key, ttlSeconds, value);
  },

  async del(key) {
    if (redis.status === 'ready') {
      try {
        return await redis.del(key);
      } catch (err) {
        console.warn('Redis DEL failed, falling back to memory:', err.message);
      }
    }
    return fallbackRedis.del(key);
  },
  
  status: redis.status,
  on: redis.on.bind(redis),
};

module.exports = redisWrapper;

