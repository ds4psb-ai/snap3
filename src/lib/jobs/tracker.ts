/**
 * Job tracker for idempotency and request tracking
 */

import { JobStatus, JobTransition } from './types';

interface IdempotencyEntry {
  jobId: string;
  createdAt: number;
  ttl: number;
}

interface RequestEntry {
  jobIds: string[];
  createdAt: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

export class JobTracker {
  private idempotencyKeys: Map<string, IdempotencyEntry> = new Map();
  private requestJobs: Map<string, RequestEntry> = new Map();
  private jobHistory: Map<string, JobTransition[]> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private globalStats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
  };

  // Idempotency management
  setIdempotencyKey(key: string, jobId: string, ttlSeconds = 86400): void {
    if (this.idempotencyKeys.has(key)) {
      return; // Don't overwrite existing key
    }
    
    this.idempotencyKeys.set(key, {
      jobId,
      createdAt: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  getJobByIdempotencyKey(key: string): string | null {
    const entry = this.idempotencyKeys.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.idempotencyKeys.delete(key);
      return null;
    }
    
    return entry.jobId;
  }

  hasIdempotencyKey(key: string): boolean {
    return this.getJobByIdempotencyKey(key) !== null;
  }

  cleanExpiredIdempotencyKeys(): void {
    const now = Date.now();
    for (const [key, entry] of this.idempotencyKeys.entries()) {
      if (now - entry.createdAt > entry.ttl) {
        this.idempotencyKeys.delete(key);
      }
    }
  }

  // Request tracking
  addJobToRequest(requestId: string, jobId: string): void {
    const entry = this.requestJobs.get(requestId) ?? {
      jobIds: [],
      createdAt: Date.now(),
    };
    
    if (!entry.jobIds.includes(jobId)) {
      entry.jobIds.push(jobId);
    }
    
    this.requestJobs.set(requestId, entry);
  }

  getJobsByRequestId(requestId: string): string[] {
    return this.requestJobs.get(requestId)?.jobIds ?? [];
  }

  getRequestJobCount(requestId: string): number {
    return this.getJobsByRequestId(requestId).length;
  }

  cleanOldRequests(maxAgeSeconds: number): void {
    const now = Date.now();
    const maxAge = maxAgeSeconds * 1000;
    
    for (const [requestId, entry] of this.requestJobs.entries()) {
      if (now - entry.createdAt > maxAge) {
        this.requestJobs.delete(requestId);
      }
    }
  }

  // Job history tracking
  recordTransition(jobId: string, from: JobStatus, to: JobStatus, metadata?: Record<string, unknown>): void {
    const history = this.jobHistory.get(jobId) ?? [];
    history.push({
      from,
      to,
      timestamp: Date.now(),
      metadata,
    });
    
    this.jobHistory.set(jobId, history);
    
    // Update global stats
    if (from === JobStatus.QUEUED && to === JobStatus.PROCESSING) {
      this.globalStats.totalJobs++;
    } else if (to === JobStatus.COMPLETED) {
      this.globalStats.completedJobs++;
    } else if (to === JobStatus.FAILED) {
      this.globalStats.failedJobs++;
    }
  }

  getJobHistory(jobId: string): JobTransition[] {
    return this.jobHistory.get(jobId) ?? [];
  }

  // Rate limit tracking
  recordRequest(clientId: string): void {
    const entry = this.rateLimits.get(clientId) ?? { timestamps: [] };
    entry.timestamps.push(Date.now());
    this.rateLimits.set(clientId, entry);
  }

  getRequestCount(clientId: string, windowSeconds: number): number {
    const entry = this.rateLimits.get(clientId);
    if (!entry) return 0;
    
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    // Filter timestamps within window
    entry.timestamps = entry.timestamps.filter(ts => now - ts < windowMs);
    
    // Clean up if empty
    if (entry.timestamps.length === 0) {
      this.rateLimits.delete(clientId);
      return 0;
    }
    
    return entry.timestamps.length;
  }

  getNextAvailableSlot(clientId: string, limit: number, windowSeconds: number): number {
    const count = this.getRequestCount(clientId, windowSeconds);
    
    if (count < limit) {
      return Date.now(); // Available now
    }
    
    const entry = this.rateLimits.get(clientId);
    if (!entry || entry.timestamps.length === 0) {
      return Date.now();
    }
    
    // Find the oldest timestamp that would fall outside the window
    const oldestInWindow = entry.timestamps[0];
    const windowMs = windowSeconds * 1000;
    
    return oldestInWindow + windowMs + 1;
  }

  cleanOldRateLimits(windowSeconds: number): void {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    for (const [clientId, entry] of this.rateLimits.entries()) {
      entry.timestamps = entry.timestamps.filter(ts => now - ts < windowMs);
      
      if (entry.timestamps.length === 0) {
        this.rateLimits.delete(clientId);
      }
    }
  }

  // Global statistics
  getGlobalStats(): {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
  } {
    const { totalJobs, completedJobs, failedJobs } = this.globalStats;
    const totalProcessed = completedJobs + failedJobs;
    const successRate = totalProcessed > 0 ? completedJobs / totalProcessed : 0;
    
    return {
      totalJobs,
      completedJobs,
      failedJobs,
      successRate,
    };
  }

  // Cleanup
  clear(): void {
    this.idempotencyKeys.clear();
    this.requestJobs.clear();
    this.jobHistory.clear();
    this.rateLimits.clear();
    this.globalStats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    };
  }

  // Periodic cleanup
  runCleanup(): void {
    this.cleanExpiredIdempotencyKeys();
    this.cleanOldRequests(600); // Clean requests older than 10 minutes
    this.cleanOldRateLimits(60); // Clean rate limits older than 1 minute
  }
}