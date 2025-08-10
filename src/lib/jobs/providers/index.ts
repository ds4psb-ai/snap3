/**
 * Job Queue Provider Interface
 * Abstraction layer for different queue implementations (in-memory, Redis, BullMQ, etc.)
 */

import { Job, JobStatus, JobPriority, JobPayload, JobResult, JobError, QueueStats } from '../types';

/**
 * Retry policy configuration for jobs
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  initialDelayMs: number;
  maxDelayMs: number;
}

/**
 * Request to enqueue a new job
 */
export interface JobEnqueueRequest {
  type: string;
  payload: JobPayload;
  priority?: JobPriority;
  requestId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  retryPolicy?: RetryPolicy;
}

/**
 * Job Queue Provider Interface
 * All implementations must satisfy this contract
 */
export interface JobQueueProvider {
  /**
   * Enqueue a new job
   * @param request Job configuration
   * @returns The created job
   * @throws AppError with RATE_LIMITED if queue is full or rate limited
   */
  enqueue(request: JobEnqueueRequest): Promise<Job>;

  /**
   * Reserve a job for processing
   * @param workerId Unique identifier for the worker
   * @param types Optional list of job types to filter
   * @returns Next available job or null if none available
   */
  reserve(workerId: string, types?: string[]): Promise<Job | null>;

  /**
   * Send heartbeat to extend job lease
   * @param jobId Job identifier
   * @param workerId Worker that owns the job
   * @param progress Optional progress update (0-100)
   * @throws AppError with FORBIDDEN if worker doesn't own the job
   */
  heartbeat(jobId: string, workerId: string, progress?: number): Promise<void>;

  /**
   * Mark job as completed
   * @param jobId Job identifier
   * @param workerId Worker that owns the job
   * @param result Job result data
   * @throws AppError with FORBIDDEN if worker doesn't own the job
   */
  complete(jobId: string, workerId: string, result: JobResult): Promise<void>;

  /**
   * Mark job as failed
   * @param jobId Job identifier
   * @param workerId Worker that owns the job
   * @param error Error details including optional retryAfter
   * @throws AppError with FORBIDDEN if worker doesn't own the job
   */
  fail(jobId: string, workerId: string, error: JobError): Promise<void>;

  /**
   * Get job by ID
   * @param jobId Job identifier
   * @returns Job or null if not found
   */
  getJob(jobId: string): Promise<Job | null>;

  /**
   * Get queue statistics
   * @returns Current queue stats
   */
  getStats(): Promise<QueueStats>;

  /**
   * Clean old completed/failed jobs
   * @param maxAgeSeconds Maximum age in seconds
   */
  cleanOldJobs(maxAgeSeconds: number): Promise<void>;

  /**
   * Get jobs for a specific request
   * @param requestId Request identifier
   * @returns List of jobs for the request
   */
  getRequestJobs?(requestId: string): Promise<Job[]>;

  /**
   * Get job count for a specific request
   * @param requestId Request identifier
   * @returns Number of jobs for the request
   */
  getRequestJobCount?(requestId: string): Promise<number>;
}

/**
 * Calculate backoff delay based on retry policy
 */
export function calculateBackoffMs(
  attempt: number,
  policy: RetryPolicy
): number {
  let delayMs: number;
  
  switch (policy.backoffStrategy) {
    case 'exponential':
      delayMs = policy.initialDelayMs * Math.pow(2, attempt - 1);
      break;
    case 'linear':
      delayMs = policy.initialDelayMs * attempt;
      break;
    case 'fixed':
      delayMs = policy.initialDelayMs;
      break;
    default:
      delayMs = policy.initialDelayMs;
  }
  
  return Math.min(delayMs, policy.maxDelayMs);
}

/**
 * Create a queue provider based on configuration
 */
export async function createQueueProvider(
  type: 'inmemory' | 'redis' | 'fake-durable' = 'inmemory',
  config?: any
): Promise<JobQueueProvider> {
  switch (type) {
    case 'redis': {
      // Check if Redis is configured
      const hasRedis = process.env.REDIS_URL || 
                      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
      
      if (!hasRedis) {
        console.warn('Redis not configured, falling back to in-memory provider');
        const { InMemoryQueueProvider } = await import('./inmemory');
        return new InMemoryQueueProvider(config);
      }
      
      const { RedisQueueProvider } = await import('./redis');
      return new RedisQueueProvider(config);
    }
    
    case 'fake-durable': {
      const { FakeDurableQueueProvider } = await import('./fake-durable');
      return new FakeDurableQueueProvider(config);
    }
    
    case 'inmemory':
    default: {
      const { InMemoryQueueProvider } = await import('./inmemory');
      return new InMemoryQueueProvider(config);
    }
  }
}