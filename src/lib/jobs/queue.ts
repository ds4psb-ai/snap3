/**
 * In-memory job queue implementation
 */

import crypto from 'crypto';
import { Job, JobStatus, JobPriority, JobType, QueueConfig, QueueStats, JobPayload, JobResult, JobError } from './types';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode } from '@/lib/errors/codes';

export class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private queue: string[] = [];
  private processing: Set<string> = new Set();
  private requestJobs: Map<string, string[]> = new Map();
  private rateLimitWindow: Map<string, number[]> = new Map();
  private config: Required<QueueConfig>;

  constructor(config: QueueConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 5,
      maxQueueSize: config.maxQueueSize ?? 1000,
      defaultPriority: config.defaultPriority ?? JobPriority.NORMAL,
      maxAttempts: config.maxAttempts ?? 3,
      rateLimit: {
        perMinute: config.rateLimit?.perMinute ?? 60,
        perRequest: config.rateLimit?.perRequest ?? 2,
      },
    };
  }

  enqueue(params: {
    type: string;
    payload: JobPayload;
    priority?: JobPriority;
    requestId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Job {
    // Check queue size
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new AppError(ErrorCode.RATE_LIMITED, {
        detail: 'Job queue is full',
        retryAfter: 60,
      });
    }

    // Check per-request limit
    if (params.requestId) {
      const requestJobs = this.requestJobs.get(params.requestId) ?? [];
      if (requestJobs.length >= this.config.rateLimit.perRequest) {
        throw new AppError(ErrorCode.RATE_LIMITED, {
          detail: `Request limit exceeded (${this.config.rateLimit.perRequest} jobs per request)`,
          retryAfter: 30,
        });
      }
    }

    // Check rate limit
    this.cleanRateLimitWindow();
    const now = Date.now();
    const windowKey = 'global';
    const window = this.rateLimitWindow.get(windowKey) ?? [];
    
    if (window.length >= this.config.rateLimit.perMinute) {
      const oldestTimestamp = window[0];
      const retryAfter = Math.ceil((oldestTimestamp + 60000 - now) / 1000);
      
      throw new AppError(ErrorCode.RATE_LIMITED, {
        detail: `Rate limit exceeded (${this.config.rateLimit.perMinute} jobs per minute)`,
        retryAfter,
      });
    }

    // Create job
    const job: Job = {
      id: `job-${crypto.randomUUID()}`,
      type: params.type,
      status: JobStatus.QUEUED,
      priority: params.priority ?? this.config.defaultPriority,
      payload: params.payload,
      progress: 0,
      attempts: 0,
      maxAttempts: this.config.maxAttempts,
      createdAt: now,
      updatedAt: now,
      requestId: params.requestId,
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
    };

    // Store job
    this.jobs.set(job.id, job);
    
    // Add to queue with priority
    this.insertIntoQueue(job.id, job.priority);
    
    // Track per-request
    if (params.requestId) {
      const requestJobs = this.requestJobs.get(params.requestId) ?? [];
      requestJobs.push(job.id);
      this.requestJobs.set(params.requestId, requestJobs);
    }
    
    // Track rate limit
    window.push(now);
    this.rateLimitWindow.set(windowKey, window);

    return job;
  }

  private insertIntoQueue(jobId: string, priority: JobPriority): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Find insertion point based on priority
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const queuedJob = this.jobs.get(this.queue[i]);
      if (queuedJob && queuedJob.priority < priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, jobId);
  }

  async processNext(): Promise<Job | null> {
    // Check concurrent limit
    if (this.processing.size >= this.config.maxConcurrent) {
      return null;
    }

    // Get next job from queue
    const jobId = this.queue.shift();
    if (!jobId) {
      return null;
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    // Update status
    job.status = JobStatus.PROCESSING;
    job.startedAt = Date.now();
    job.updatedAt = Date.now();
    job.attempts++;
    
    this.processing.add(jobId);
    
    return job;
  }

  updateStatus(
    jobId: string,
    status: JobStatus,
    result?: JobResult | null,
    error?: JobError | null
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    job.updatedAt = Date.now();

    if (result !== undefined) {
      job.result = result;
    }

    if (error !== undefined) {
      job.error = error;
    }

    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED || status === JobStatus.CANCELLED) {
      job.completedAt = Date.now();
      this.processing.delete(jobId);
      
      // Calculate progress
      if (status === JobStatus.COMPLETED) {
        job.progress = 100;
      }
    }

    if (status === JobStatus.PROCESSING) {
      this.processing.add(jobId);
    }
  }

  updateProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    job.progress = Math.min(100, Math.max(0, progress));
    job.updatedAt = Date.now();
  }

  getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) ?? null;
  }

  getQueued(): Job[] {
    return this.queue
      .map(id => this.jobs.get(id))
      .filter((job): job is Job => job !== undefined);
  }

  getProcessing(): Job[] {
    return Array.from(this.processing)
      .map(id => this.jobs.get(id))
      .filter((job): job is Job => job !== undefined);
  }

  getStats(): QueueStats {
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

  clear(): void {
    this.jobs.clear();
    this.queue = [];
    this.processing.clear();
    this.requestJobs.clear();
    this.rateLimitWindow.clear();
  }

  cleanOldJobs(maxAgeSeconds: number): void {
    const now = Date.now();
    const maxAge = maxAgeSeconds * 1000;

    for (const [id, job] of this.jobs.entries()) {
      if (
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED) &&
        (now - job.createdAt) > maxAge
      ) {
        this.jobs.delete(id);
        
        // Clean from request tracking
        if (job.requestId) {
          const requestJobs = this.requestJobs.get(job.requestId);
          if (requestJobs) {
            const filtered = requestJobs.filter(jid => jid !== id);
            if (filtered.length === 0) {
              this.requestJobs.delete(job.requestId);
            } else {
              this.requestJobs.set(job.requestId, filtered);
            }
          }
        }
      }
    }
  }

  private cleanRateLimitWindow(): void {
    const now = Date.now();
    const windowDuration = 60000; // 1 minute

    for (const [key, timestamps] of this.rateLimitWindow.entries()) {
      const filtered = timestamps.filter(ts => (now - ts) < windowDuration);
      if (filtered.length === 0) {
        this.rateLimitWindow.delete(key);
      } else {
        this.rateLimitWindow.set(key, filtered);
      }
    }
  }

  getRequestJobCount(requestId: string): number {
    return this.requestJobs.get(requestId)?.length ?? 0;
  }

  getRequestJobs(requestId: string): Job[] {
    const jobIds = this.requestJobs.get(requestId) ?? [];
    return jobIds
      .map(id => this.jobs.get(id))
      .filter((job): job is Job => job !== undefined);
  }
}