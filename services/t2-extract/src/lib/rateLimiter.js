/**
 * Rate Limiter with Token Bucket Algorithm for Quota Management
 * 
 * Implements configurable rate limiting to prevent 429 quota exhaustion
 * for both IntegratedGenAI and VertexAI engines.
 */

class TokenBucket {
  constructor(capacity, refillRate, refillInterval = 1000) {
    this.capacity = capacity;          // Maximum tokens
    this.tokens = capacity;            // Current tokens
    this.refillRate = refillRate;      // Tokens added per interval
    this.refillInterval = refillInterval; // Interval in ms
    this.lastRefill = Date.now();
    
    console.log(`[TokenBucket] 🪣 Initialized: capacity=${capacity}, refillRate=${refillRate}, interval=${refillInterval}ms`);
  }

  refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.refillInterval) * this.refillRate;
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
      console.log(`[TokenBucket] 🔄 Refilled: +${tokensToAdd} tokens, current=${this.tokens}`);
    }
  }

  async consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      console.log(`[TokenBucket] ✅ Consumed ${tokens} tokens, remaining=${this.tokens}`);
      return true;
    }
    
    console.log(`[TokenBucket] ❌ Insufficient tokens: need=${tokens}, available=${this.tokens}`);
    return false;
  }

  getStatus() {
    this.refill();
    return {
      tokens: this.tokens,
      capacity: this.capacity,
      usage: ((this.capacity - this.tokens) / this.capacity * 100).toFixed(1) + '%'
    };
  }
}

class RateLimiter {
  constructor() {
    // Environment-based configuration
    const integratedRPS = parseInt(process.env.INTEGRATED_GENAI_RPS || '10', 10);
    const vertexRPS = parseInt(process.env.VERTEX_AI_RPS || '8', 10);
    const bucketCapacity = parseInt(process.env.RATE_LIMITER_CAPACITY || '20', 10);
    
    // Create separate buckets for each engine
    this.integratedBucket = new TokenBucket(bucketCapacity, integratedRPS, 1000);
    this.vertexBucket = new TokenBucket(bucketCapacity, vertexRPS, 1000);
    
    console.log(`[RateLimiter] 🚦 Initialized dual engine rate limiting`);
    console.log(`[RateLimiter] 🔧 IntegratedGenAI: ${integratedRPS} RPS, VertexAI: ${vertexRPS} RPS`);
  }

  async checkRate(engine) {
    const bucket = engine === 'vertex-ai' ? this.vertexBucket : this.integratedBucket;
    const engineName = engine === 'vertex-ai' ? 'VertexAI' : 'IntegratedGenAI';
    
    console.log(`[RateLimiter] 🔍 Checking rate limit for ${engineName}`);
    
    const allowed = await bucket.consume(1);
    
    if (!allowed) {
      const status = bucket.getStatus();
      console.log(`[RateLimiter] 🚨 Rate limit exceeded for ${engineName}: ${status.usage} usage`);
      
      // Calculate wait time until next token becomes available
      const waitTimeMs = bucket.refillInterval;
      
      throw new RateLimitError(engineName, waitTimeMs, status);
    }
    
    console.log(`[RateLimiter] ✅ Rate limit passed for ${engineName}`);
    return true;
  }

  getStats() {
    return {
      integrated_genai: this.integratedBucket.getStatus(),
      vertex_ai: this.vertexBucket.getStatus(),
      timestamp: new Date().toISOString()
    };
  }
}

class RateLimitError extends Error {
  constructor(engine, retryAfter, bucketStatus) {
    super(`Rate limit exceeded for ${engine}`);
    this.name = 'RateLimitError';
    this.engine = engine;
    this.retryAfter = retryAfter;
    this.bucketStatus = bucketStatus;
    this.statusCode = 429;
  }

  toJSON() {
    return {
      type: 'https://api.outlier.example/problems/rate-limit-exceeded',
      title: 'Rate limit exceeded',
      status: 429,
      detail: `${this.engine} rate limit exceeded. Current usage: ${this.bucketStatus.usage}`,
      engine: this.engine,
      retry_after: Math.ceil(this.retryAfter / 1000), // Convert to seconds
      bucket_status: this.bucketStatus,
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

export { rateLimiter, RateLimitError };