/**
 * Fake Durable Queue Provider
 * Test double that simulates a durable queue with network delays and backoff behavior
 */

import crypto from 'crypto';
import { Job, JobStatus, JobPriority, JobPayload, JobResult, JobError, QueueStats } from '../types';
import { JobQueueProvider, JobEnqueueRequest, RetryPolicy, calculateBackoffMs } from './index';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode } from '@/lib/errors/codes';

interface StoredJob extends Job {
  reservation?: {
    workerId: string;
    expiresAt: number;
  };
}

interface FailureRecord {
  count: number;
  nextRetryAt: number;
  lastError?: JobError;
}

export class FakeDurableQueueProvider implements JobQueueProvider {
  private jobs: Map<string, StoredJob> = new Map();
  private jobsByIdempotencyKey: Map<string, string> = new Map();
  private failures: Map<string, FailureRecord> = new Map();
  private retryPolicies: Map<string, RetryPolicy> = new Map();
  private requestJobs: Map<string, Set<string>> = new Map();
  
  // Simulation settings
  private simulatedLatencyMs: number = 10;
  private simulateFailures: boolean = false;
  private failureRate: number = 0.1; // 10% failure rate when enabled
  
  constructor(options?: {
    simulatedLatencyMs?: number;
    simulateFailures?: boolean;
    failureRate?: number;
  }) {
    if (options?.simulatedLatencyMs !== undefined) {
      this.simulatedLatencyMs = options.simulatedLatencyMs;
    }
    if (options?.simulateFailures !== undefined) {
      this.simulateFailures = options.simulateFailures;
    }
    if (options?.failureRate !== undefined) {
      this.failureRate = options.failureRate;
    }
  }

  /**
   * Simulate network delay
   */
  private async simulateDelay(ms?: number): Promise<void> {
    const delay = ms ?? this.simulatedLatencyMs;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Simulate random failures for testing
   */
  private maybeSimulateFailure(): void {
    if (this.simulateFailures && Math.random() < this.failureRate) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, {
        detail: 'Simulated network failure',
        instance: '/api/jobs',
      });
    }
  }

  async enqueue(request: JobEnqueueRequest): Promise<Job> {
    await this.simulateDelay();
    this.maybeSimulateFailure();
    
    // Check idempotency
    if (request.idempotencyKey) {
      const existingJobId = this.jobsByIdempotencyKey.get(request.idempotencyKey);
      if (existingJobId) {
        const existingJob = this.jobs.get(existingJobId);
        if (existingJob && (existingJob.status === JobStatus.QUEUED || existingJob.status === JobStatus.PROCESSING)) {
          return existingJob;
        }
        
        // Check backoff period
        const failure = this.failures.get(request.idempotencyKey);
        if (failure && Date.now() < failure.nextRetryAt) {
          const retryAfter = Math.ceil((failure.nextRetryAt - Date.now()) / 1000);
          throw new AppError(ErrorCode.RATE_LIMITED, {
            detail: 'Job in backoff period',
            retryAfter,
            instance: '/api/preview/veo',
          });
        }
      }
    }
    
    // Create job
    const job: StoredJob = {
      id: `job-${crypto.randomUUID()}`,
      type: request.type,
      status: JobStatus.QUEUED,
      priority: request.priority ?? JobPriority.NORMAL,
      payload: request.payload,
      progress: 0,
      attempts: 0,
      maxAttempts: request.retryPolicy?.maxAttempts ?? 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      metadata: request.metadata,
    };
    
    // Store job
    this.jobs.set(job.id, job);
    
    // Track idempotency
    if (request.idempotencyKey) {
      this.jobsByIdempotencyKey.set(request.idempotencyKey, job.id);
    }
    
    // Track retry policy
    if (request.retryPolicy) {
      this.retryPolicies.set(job.id, request.retryPolicy);
    }
    
    // Track per-request
    if (request.requestId) {
      const requestSet = this.requestJobs.get(request.requestId) || new Set();
      requestSet.add(job.id);
      this.requestJobs.set(request.requestId, requestSet);
    }
    
    return job;
  }

  async reserve(workerId: string, types?: string[]): Promise<Job | null> {
    await this.simulateDelay();
    
    // Find next available job
    for (const job of this.jobs.values()) {
      if (job.status !== JobStatus.QUEUED) continue;
      if (types && !types.includes(job.type)) continue;
      if (job.reservation && job.reservation.expiresAt > Date.now()) continue;
      
      // Reserve the job
      job.status = JobStatus.PROCESSING;
      job.startedAt = Date.now();
      job.updatedAt = Date.now();
      job.attempts = (job.attempts || 0) + 1;
      job.reservation = {
        workerId,
        expiresAt: Date.now() + 30000, // 30 second lease
      };
      
      return job;
    }
    
    return null;
  }

  async heartbeat(jobId: string, workerId: string, progress?: number): Promise<void> {
    await this.simulateDelay();
    
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: 'Job not found',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    if (!job.reservation || job.reservation.workerId !== workerId) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Worker does not own this job',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    // Extend lease
    job.reservation.expiresAt = Date.now() + 30000;
    job.updatedAt = Date.now();
    
    // Update progress
    if (progress !== undefined) {
      job.progress = Math.min(100, Math.max(0, progress));
    }
  }

  async complete(jobId: string, workerId: string, result: JobResult): Promise<void> {
    await this.simulateDelay();
    
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: 'Job not found',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    if (!job.reservation || job.reservation.workerId !== workerId) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Worker does not own this job',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    // Mark as completed
    job.status = JobStatus.COMPLETED;
    job.result = result;
    job.progress = 100;
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    delete job.reservation;
    
    // Clear failure record
    if (job.idempotencyKey) {
      this.failures.delete(job.idempotencyKey);
    }
  }

  async fail(jobId: string, workerId: string, error: JobError): Promise<void> {
    await this.simulateDelay();
    
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: 'Job not found',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    if (!job.reservation || job.reservation.workerId !== workerId) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Worker does not own this job',
        instance: `/api/jobs/${jobId}`,
      });
    }
    
    // Calculate backoff
    const failureKey = job.idempotencyKey || jobId;
    const failure = this.failures.get(failureKey) || { count: 0, nextRetryAt: 0 };
    const retryPolicy = this.retryPolicies.get(jobId);
    
    failure.count++;
    failure.lastError = error;
    
    if (retryPolicy && failure.count < retryPolicy.maxAttempts) {
      const delayMs = calculateBackoffMs(failure.count, retryPolicy);
      failure.nextRetryAt = Date.now() + delayMs;
      error.retryAfter = Math.ceil(delayMs / 1000);
    } else {
      // No more retries
      error.retryAfter = undefined;
    }
    
    this.failures.set(failureKey, failure);
    
    // Mark as failed
    job.status = JobStatus.FAILED;
    job.error = error;
    job.completedAt = Date.now();
    job.updatedAt = Date.now();
    delete job.reservation;
  }

  async getJob(jobId: string): Promise<Job | null> {
    await this.simulateDelay(5); // Smaller delay for reads
    const job = this.jobs.get(jobId);
    return job || null;
  }

  async getStats(): Promise<QueueStats> {
    await this.simulateDelay(5);
    
    let queued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;
    let cancelled = 0;
    let totalProcessingTime = 0;
    let processedCount = 0;
    
    for (const job of this.jobs.values()) {
      switch (job.status) {
        case JobStatus.QUEUED:
          queued++;
          break;
        case JobStatus.PROCESSING:
          processing++;
          break;
        case JobStatus.COMPLETED:
          completed++;
          if (job.startedAt && job.completedAt) {
            totalProcessingTime += job.completedAt - job.startedAt;
            processedCount++;
          }
          break;
        case JobStatus.FAILED:
          failed++;
          break;
        case JobStatus.CANCELLED:
          cancelled++;
          break;
      }
    }
    
    const total = this.jobs.size;
    const avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : undefined;
    const successRate = (completed + failed) > 0 ? completed / (completed + failed) : undefined;
    
    return {
      queued,
      processing,
      completed,
      failed,
      cancelled,
      total,
      avgProcessingTime,
      successRate,
    };
  }

  async cleanOldJobs(maxAgeSeconds: number): Promise<void> {
    await this.simulateDelay();
    
    const now = Date.now();
    const maxAgeMs = maxAgeSeconds * 1000;
    
    for (const [id, job] of this.jobs.entries()) {
      const isTerminal = job.status === JobStatus.COMPLETED || 
                        job.status === JobStatus.FAILED || 
                        job.status === JobStatus.CANCELLED;
      
      if (isTerminal && (now - job.createdAt) > maxAgeMs) {
        this.jobs.delete(id);
        
        // Clean related data
        if (job.idempotencyKey) {
          this.jobsByIdempotencyKey.delete(job.idempotencyKey);
        }
        
        if (job.requestId) {
          const requestSet = this.requestJobs.get(job.requestId);
          if (requestSet) {
            requestSet.delete(id);
            if (requestSet.size === 0) {
              this.requestJobs.delete(job.requestId);
            }
          }
        }
      }
    }
  }

  async getRequestJobs(requestId: string): Promise<Job[]> {
    await this.simulateDelay(5);
    
    const jobIds = this.requestJobs.get(requestId);
    if (!jobIds) return [];
    
    const jobs: Job[] = [];
    for (const id of jobIds) {
      const job = this.jobs.get(id);
      if (job) jobs.push(job);
    }
    
    return jobs;
  }

  async getRequestJobCount(requestId: string): Promise<number> {
    await this.simulateDelay(5);
    return this.requestJobs.get(requestId)?.size ?? 0;
  }

  /**
   * Test helper: Clear all data
   */
  reset(): void {
    this.jobs.clear();
    this.jobsByIdempotencyKey.clear();
    this.failures.clear();
    this.retryPolicies.clear();
    this.requestJobs.clear();
  }

  /**
   * Test helper: Set simulation parameters
   */
  setSimulation(options: {
    latencyMs?: number;
    simulateFailures?: boolean;
    failureRate?: number;
  }): void {
    if (options.latencyMs !== undefined) {
      this.simulatedLatencyMs = options.latencyMs;
    }
    if (options.simulateFailures !== undefined) {
      this.simulateFailures = options.simulateFailures;
    }
    if (options.failureRate !== undefined) {
      this.failureRate = options.failureRate;
    }
  }
}