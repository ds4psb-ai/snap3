import { Redis } from 'ioredis';

// Workspace-specific cache configuration
const WORKSPACE = process.env.NEXT_PUBLIC_WORKSPACE || 'exports';
const CACHE_PREFIX = process.env.CACHE_PREFIX || 'exports:';

// Use different Redis DB for isolation
// DB 0: main, DB 1: exports, DB 2: storage, DB 3: jobs, DB 4: sdk
const REDIS_DB = 1;

export const cacheConfig = {
  workspace: WORKSPACE,
  prefix: CACHE_PREFIX,
  ttl: {
    brief: 3600,      // 1 hour
    json: 3600,       // 1 hour
    evidence: 7200,   // 2 hours
    vdp: 86400,       // 24 hours
  },
  // Generate cache key with workspace prefix
  getKey: (type: string, id: string) => {
    return `${CACHE_PREFIX}${type}:${id}`;
  },
};

// Create Redis client for this workspace
export function createRedisClient() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: REDIS_DB,
    keyPrefix: CACHE_PREFIX,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('error', (err) => {
    console.error(`[${WORKSPACE}] Redis error:`, err);
  });

  redis.on('connect', () => {
    console.log(`[${WORKSPACE}] Redis connected to DB ${REDIS_DB}`);
  });

  return redis;
}

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const redis = createRedisClient();
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } finally {
      redis.disconnect();
    }
  },

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const redis = createRedisClient();
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } finally {
      redis.disconnect();
    }
  },

  async del(key: string): Promise<void> {
    const redis = createRedisClient();
    try {
      await redis.del(key);
    } finally {
      redis.disconnect();
    }
  },
};