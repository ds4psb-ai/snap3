// Workspace-specific cache configuration
const WORKSPACE = process.env.NEXT_PUBLIC_WORKSPACE || 'exports';
const CACHE_PREFIX = process.env.CACHE_PREFIX || 'exports:';

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

// In-memory cache implementation (replace with Redis when available)
const memoryCache = new Map<string, { value: any; expires: number }>();

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const cached = memoryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      memoryCache.delete(key);
      return null;
    }
    
    return cached.value;
  },

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + (ttl * 1000) : Date.now() + (3600 * 1000);
    memoryCache.set(key, { value, expires });
  },

  async del(key: string): Promise<void> {
    memoryCache.delete(key);
  },
};