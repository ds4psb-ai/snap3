import { Request, Response, NextFunction } from 'express';
import { validateRateLimit } from '../utils/validation';
import winston from 'winston';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

export class RateLimiter {
  private requests = new Map<string, number[]>();
  private options: Required<RateLimitOptions>;
  private logger: winston.Logger;

  constructor(options: RateLimitOptions, logger: winston.Logger) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      message: options.message || 'Too many requests, please try again later',
      keyGenerator: options.keyGenerator || ((req) => req.ip || 'unknown'),
      onLimitReached: options.onLimitReached || (() => {}),
    };
    this.logger = logger;

    // Clean up old entries periodically
    setInterval(() => {
      this.cleanup();
    }, this.options.windowMs);
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = this.options.keyGenerator(req);
    const now = Date.now();

    // Validate rate limit
    const isAllowed = validateRateLimit(
      key,
      this.requests,
      this.options.windowMs,
      this.options.maxRequests
    );

    if (!isAllowed) {
      const retryAfter = Math.ceil(this.options.windowMs / 1000);
      
      this.logger.warn('Rate limit exceeded', {
        key,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      this.options.onLimitReached(req, res);

      res.status(429).set({
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': this.options.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(now + this.options.windowMs).toISOString(),
      }).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: this.options.message,
          details: {
            retryAfter: retryAfter,
            limit: this.options.maxRequests,
            windowMs: this.options.windowMs,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });

      return;
    }

    // Calculate remaining requests
    const clientRequests = this.requests.get(key) || [];
    const validRequests = clientRequests.filter(timestamp => 
      now - timestamp < this.options.windowMs
    );
    const remaining = Math.max(0, this.options.maxRequests - validRequests.length);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': this.options.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(now + this.options.windowMs).toISOString(),
    });

    next();
  };

  private cleanup() {
    const now = Date.now();
    
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(timestamp => 
        now - timestamp < this.options.windowMs
      );
      
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }

    this.logger.debug(`Rate limiter cleanup completed. Active keys: ${this.requests.size}`);
  }

  getStats() {
    const now = Date.now();
    let totalActiveRequests = 0;
    let activeClients = 0;

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(timestamp => 
        now - timestamp < this.options.windowMs
      );
      
      if (validTimestamps.length > 0) {
        totalActiveRequests += validTimestamps.length;
        activeClients++;
      }
    }

    return {
      activeClients,
      totalActiveRequests,
      windowMs: this.options.windowMs,
      maxRequests: this.options.maxRequests,
    };
  }
}

export function createRateLimitMiddleware(
  options: RateLimitOptions,
  logger: winston.Logger
) {
  const rateLimiter = new RateLimiter(options, logger);
  return rateLimiter.middleware;
}