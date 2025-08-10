/**
 * In-Memory Job Queue Provider
 * Wraps the existing JobQueue implementation to satisfy the provider interface
 */

import { Job, JobStatus, JobPriority, JobPayload, JobResult, JobError, QueueStats } from '../types';
import { JobQueue } from '../queue';
import { JobQueueProvider, JobEnqueueRequest, RetryPolicy, calculateBackoffMs } from './index';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode } from '@/lib/errors/codes';
import crypto from 'crypto';

interface Reservation {
  jobId: string;
  workerId: string;
  expiresAt: number;
}

interface FailureRecord {
  count: number;
  nextRetryAt: number;
  lastError?: JobError;
}

export class InMemoryQueueProvider implements JobQueueProvider {
  private queue: JobQueue;
  private idempotencyCache: Map<string, string>;
  private reservations: Map<string, Reservation>;
  private failures: Map<string, FailureRecord>;
  private retryPolicies: Map<string, RetryPolicy>;
  private readonly LEASE_DURATION_MS = 30000; // 30 seconds
  private readonly IDEMPOTENCY_TTL_MS = 86400000; // 24 hours
  private idempotencyTimestamps: Map<string, number>;

  constructor(config?: any) {
    this.queue = new JobQueue(config);
    this.idempotencyCache = new Map();
    this.idempotencyTimestamps = new Map();
    this.reservations = new Map();
    this.failures = new Map();
    this.retryPolicies = new Map();
    
    // Start cleanup timer
    this.startCleanupTimer();
  }

  async enqueue(request: JobEnqueueRequest): Promise<Job> {
    // Check idempotency
    if (request.idempotencyKey) {
      // FIRST check if in backoff period (regardless of whether job exists)
      const failure = this.failures.get(request.idempotencyKey);
      if (failure && Date.now() < failure.nextRetryAt) {
        const retryAfter = Math.ceil((failure.nextRetryAt - Date.now()) / 1000);
        throw new AppError(ErrorCode.RATE_LIMITED, {
          detail: 'Job in backoff period after failure',
          retryAfter,
          instance: `/api/preview/veo`,
        });
      }
      
      // Then check for existing job
      const existingId = this.idempotencyCache.get(request.idempotencyKey);
      if (existingId) {
        const job = await this.getJob(existingId);
        if (job && (job.status === JobStatus.QUEUED || job.status === JobStatus.PROCESSING)) {
          return job;
        }
      }
    }
    
    // Store retry policy if provided - use idempotency key if available
    const jobId = `job-${crypto.randomUUID()}`;
    if (request.retryPolicy) {
      const policyKey = request.idempotencyKey || jobId;
      this.retryPolicies.set(policyKey, request.retryPolicy);
    }
    
    try {
      // Delegate to existing queue
      const job = this.queue.enqueue({
        type: request.type,
        payload: request.payload,
        priority: request.priority,
        requestId: request.requestId,
        idempotencyKey: request.idempotencyKey,
        metadata: request.metadata,
      });
      
      // Track idempotency
      if (request.idempotencyKey) {
        this.idempotencyCache.set(request.idempotencyKey, job.id);
        this.idempotencyTimestamps.set(request.idempotencyKey, Date.now());
      }
      
      return job;
    } catch (error) {
      // Ensure rate limit errors include retryAfter
      if (error instanceof AppError && error.code === ErrorCode.RATE_LIMITED) {
        if (!error.retryAfter) {
          // Create new error with retryAfter
          throw new AppError(ErrorCode.RATE_LIMITED, {
            detail: error.detail || 'Rate limit exceeded',
            retryAfter: 60,
            instance: '/api/preview/veo',
          });
        }
      }
      throw error;
    }
  }

  async reserve(workerId: string, types?: string[]): Promise<Job | null> {
    // Clean expired reservations
    this.cleanExpiredReservations();
    
    // If types specified, try to find matching job
    if (types && types.length > 0) {
      const queued = this.queue.getQueued();
      for (const job of queued) {
        if (types.includes(job.type)) {
          // Mark as processing
          this.queue.updateStatus(job.id, JobStatus.PROCESSING);
          
          // Create reservation
          this.reservations.set(job.id, {
            jobId: job.id,
            workerId,
            expiresAt: Date.now() + this.LEASE_DURATION_MS,
          });
          
          return job;
        }
      }
      return null;
    }
    
    // No type filter, get next available
    const job = await this.queue.processNext();
    if (!job) {
      return null;
    }
    
    // Create reservation
    this.reservations.set(job.id, {
      jobId: job.id,
      workerId,
      expiresAt: Date.now() + this.LEASE_DURATION_MS,
    });
    
    return job;
  }

  async heartbeat(jobId: string, workerId: string, progress?: number): Promise<void> {
    const reservation = this.reservations.get(jobId);
    
    if (!reservation) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: 'Job reservation not found',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    if (reservation.workerId !== workerId) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Worker does not own this job',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    // Extend lease
    reservation.expiresAt = Date.now() + this.LEASE_DURATION_MS;
    
    // Update progress if provided
    if (progress !== undefined) {
      this.queue.updateProgress(jobId, progress);
    }
  }

  async complete(jobId: string, workerId: string, result: JobResult): Promise<void> {
    const reservation = this.reservations.get(jobId);
    
    if (!reservation || reservation.workerId !== workerId) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Worker does not own this job',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    // Update job status
    this.queue.updateStatus(jobId, JobStatus.COMPLETED, result, null);
    
    // Clean up
    this.reservations.delete(jobId);
    const job = this.queue.getJob(jobId);
    if (job?.idempotencyKey) {
      this.failures.delete(job.idempotencyKey);
    }
  }

  async fail(jobId: string, workerId: string, error: JobError): Promise<void> {
    const reservation = this.reservations.get(jobId);
    
    if (!reservation || reservation.workerId !== workerId) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Worker does not own this job',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    const job = this.queue.getJob(jobId);
    if (!job) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: 'Job not found',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    // Calculate backoff if retry policy exists
    const failureKey = job.idempotencyKey || jobId;
    const retryPolicy = this.retryPolicies.get(failureKey);
    const failure = this.failures.get(failureKey) || { count: 0, nextRetryAt: 0 };
    
    failure.count++;
    failure.lastError = error;
    
    if (retryPolicy && failure.count < retryPolicy.maxAttempts) {
      const delayMs = calculateBackoffMs(failure.count, retryPolicy);
      failure.nextRetryAt = Date.now() + delayMs;
      error.retryAfter = Math.ceil(delayMs / 1000);
      
      // Store the failure record BEFORE updating job status
      this.failures.set(failureKey, failure);
    } else {
      // No more retries
      error.retryAfter = undefined;
      this.failures.set(failureKey, failure);
    }
    
    // Update job status
    this.queue.updateStatus(jobId, JobStatus.FAILED, null, error);
    
    // Clean up reservation
    this.reservations.delete(jobId);
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.queue.getJob(jobId);
  }

  async getStats(): Promise<QueueStats> {
    return this.queue.getStats();
  }

  async cleanOldJobs(maxAgeSeconds: number): Promise<void> {
    this.queue.cleanOldJobs(maxAgeSeconds);
    
    // Clean old idempotency keys based on maxAge parameter instead of fixed TTL
    const now = Date.now();
    const maxAgeMs = maxAgeSeconds * 1000;
    
    for (const [key, timestamp] of this.idempotencyTimestamps.entries()) {
      if (now - timestamp > maxAgeMs) {
        this.idempotencyCache.delete(key);
        this.idempotencyTimestamps.delete(key);
        this.failures.delete(key);
      }
    }
  }

  async getRequestJobs(requestId: string): Promise<Job[]> {
    return this.queue.getRequestJobs(requestId);
  }

  async getRequestJobCount(requestId: string): Promise<number> {
    return this.queue.getRequestJobCount(requestId);
  }

  private cleanExpiredReservations(): void {
    const now = Date.now();
    for (const [jobId, reservation] of this.reservations.entries()) {
      if (now > reservation.expiresAt) {
        // Reservation expired, return job to queue
        const job = this.queue.getJob(jobId);
        if (job && job.status === JobStatus.PROCESSING) {
          this.queue.updateStatus(jobId, JobStatus.QUEUED);
        }
        this.reservations.delete(jobId);
      }
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanExpiredReservations();
      // Clean old jobs every hour
      this.cleanOldJobs(3600);
    }, 60000); // Run every minute
  }
}