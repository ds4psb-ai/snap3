/**
 * In-Memory Job Queue Provider
 * Wraps the existing JobQueue implementation to satisfy the provider interface
 */

import { Job, JobStatus, JobPriority, JobPayload, JobResult, JobError, QueueStats } from '../types';
import { JobQueue } from '../queue';
import { JobQueueProvider, JobEnqueueRequest, RetryPolicy, calculateBackoffMs } from './index';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode } from '@/lib/errors/codes';
import { logger, createJobLogger, generateTraceId } from '../../logging/logger';
import { metricsCollector } from '../../metrics/collector';
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
    const traceId = generateTraceId();
    const log = logger.child({ traceId, queueName: 'inmemory', operation: 'enqueue' });
    
    log.info('Enqueueing job', { type: request.type, idempotencyKey: request.idempotencyKey });
    
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
      
      // Emit metrics
      const retryPolicy = this.retryPolicies.get(request.idempotencyKey || job.id);
      metricsCollector.recordJobAttempt({
        queueName: 'inmemory',
        jobId: job.id,
        traceId,
        attempts: 1,
        maxAttempts: retryPolicy?.maxAttempts || 1,
        status: 'queued'
      });
      
      log.info('Job enqueued successfully', { jobId: job.id });
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
    const traceId = generateTraceId();
    const log = logger.child({ traceId, queueName: 'inmemory', operation: 'reserve', workerId });
    
    log.debug('Worker attempting to reserve job', { types });
    
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
          
          log.info('Job reserved by worker', { jobId: job.id });
          
          // Emit metrics
          const retryPolicy = this.retryPolicies.get(job.idempotencyKey || job.id);
          const failure = this.failures.get(job.idempotencyKey || job.id);
          metricsCollector.recordJobAttempt({
            queueName: 'inmemory',
            jobId: job.id,
            traceId,
            attempts: (failure?.count || 0) + 1,
            maxAttempts: retryPolicy?.maxAttempts || 1,
            status: 'processing'
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
    
    log.info('Job reserved by worker', { jobId: job.id });
    
    // Emit metrics
    const retryPolicy = this.retryPolicies.get(job.idempotencyKey || job.id);
    const failure = this.failures.get(job.idempotencyKey || job.id);
    metricsCollector.recordJobAttempt({
      queueName: 'inmemory',
      jobId: job.id,
      traceId,
      attempts: (failure?.count || 0) + 1,
      maxAttempts: retryPolicy?.maxAttempts || 1,
      status: 'processing'
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
    const traceId = generateTraceId();
    const log = createJobLogger(jobId, traceId, 'inmemory');
    
    log.info('Completing job', { workerId });
    
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
    
    // Emit metrics
    if (job) {
      const processingTime = job.completedAt && job.startedAt ? 
        new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime() : 0;
      const failure = this.failures.get(job.idempotencyKey || jobId);
      
      metricsCollector.recordJobCompletion(
        'inmemory',
        jobId,
        traceId,
        processingTime,
        (failure?.count || 0) + 1
      );
    }
    
    log.info('Job completed successfully');
  }

  async fail(jobId: string, workerId: string, error: JobError): Promise<void> {
    const traceId = generateTraceId();
    const log = createJobLogger(jobId, traceId, 'inmemory');
    
    log.warn('Job failed', { workerId, error: error.message });
    
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
      
      // Emit metrics with nextAttemptAt
      metricsCollector.recordJobFailure(
        'inmemory',
        jobId,
        traceId,
        failure.count,
        retryPolicy.maxAttempts,
        new Date(failure.nextRetryAt),
        error.message
      );
      
      log.info('Job will be retried', { 
        attempts: failure.count, 
        maxAttempts: retryPolicy.maxAttempts,
        nextAttemptAt: new Date(failure.nextRetryAt).toISOString()
      });
    } else {
      // No more retries
      error.retryAfter = undefined;
      this.failures.set(failureKey, failure);
      
      // Emit final failure metrics
      metricsCollector.recordJobFailure(
        'inmemory',
        jobId,
        traceId,
        failure.count,
        retryPolicy?.maxAttempts || 1,
        undefined,
        error.message
      );
      
      log.error('Job failed permanently', { 
        attempts: failure.count,
        error: error.message 
      });
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
          
          const log = logger.child({ jobId, queueName: 'inmemory' });
          log.warn('Job lease expired, returning to queue', { 
            workerId: reservation.workerId 
          });
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