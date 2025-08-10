/**
 * Redis-based Job Queue Provider
 * Durable queue implementation using Redis for persistence
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import { Job, JobStatus, JobPriority, JobPayload, JobResult, JobError, QueueStats } from '../types';
import { JobQueueProvider, JobEnqueueRequest, RetryPolicy, calculateBackoffMs } from './index';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode } from '@/lib/errors/codes';

interface RedisJob {
  id: string;
  type: string;
  status: JobStatus;
  priority: JobPriority;
  payload: JobPayload;
  progress: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  requestId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  result?: JobResult;
  error?: JobError;
  nextAttemptAt?: number;
  retryPolicy?: RetryPolicy;
}

interface RedisProviderConfig {
  redisUrl?: string;
  upstashUrl?: string;
  upstashToken?: string;
  keyPrefix?: string;
  visibilityTimeout?: number; // ms
  idempotencyTTL?: number; // ms
  jobTTL?: number; // seconds
  maxQueueSize?: number;
  rateLimit?: {
    perMinute: number;
    perRequest: number;
  };
}

export class RedisQueueProvider implements JobQueueProvider {
  private redis: InstanceType<typeof Redis>;
  private config: Required<Omit<RedisProviderConfig, 'redisUrl' | 'upstashUrl' | 'upstashToken'>>;
  private readonly QUEUE_KEY: string;
  private readonly PROCESSING_KEY: string;
  private readonly JOBS_KEY: string;
  private readonly IDEMPOTENCY_KEY: string;
  private readonly LEASE_KEY: string;
  private readonly METRICS_KEY: string;
  private readonly RATE_LIMIT_KEY: string;

  constructor(config: RedisProviderConfig = {}) {
    // Initialize Redis client
    if (config.redisUrl || process.env.REDIS_URL) {
      this.redis = new Redis(config.redisUrl || process.env.REDIS_URL!);
    } else if ((config.upstashUrl || process.env.UPSTASH_REDIS_REST_URL) && 
               (config.upstashToken || process.env.UPSTASH_REDIS_REST_TOKEN)) {
      // Upstash REST API support
      const url = config.upstashUrl || process.env.UPSTASH_REDIS_REST_URL!;
      const token = config.upstashToken || process.env.UPSTASH_REDIS_REST_TOKEN!;
      
      // Parse Upstash URL to get Redis connection
      const parsedUrl = new URL(url);
      this.redis = new Redis({
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port || '443'),
        password: token,
        tls: parsedUrl.protocol === 'https:' ? {} : undefined,
      });
    } else {
      throw new Error('Redis connection configuration required: REDIS_URL or UPSTASH_REDIS_REST_URL/TOKEN');
    }

    // Configure settings
    this.config = {
      keyPrefix: config.keyPrefix ?? 'snap3:jobs:',
      visibilityTimeout: config.visibilityTimeout ?? 30000, // 30 seconds
      idempotencyTTL: config.idempotencyTTL ?? 86400000, // 24 hours
      jobTTL: config.jobTTL ?? 3600, // 1 hour
      maxQueueSize: config.maxQueueSize ?? 1000,
      rateLimit: config.rateLimit ?? {
        perMinute: 60,
        perRequest: 2,
      },
    };

    // Key namespaces
    const prefix = this.config.keyPrefix;
    this.QUEUE_KEY = `${prefix}queue`;
    this.PROCESSING_KEY = `${prefix}processing`;
    this.JOBS_KEY = `${prefix}jobs`;
    this.IDEMPOTENCY_KEY = `${prefix}idem`;
    this.LEASE_KEY = `${prefix}lease`;
    this.METRICS_KEY = `${prefix}metrics`;
    this.RATE_LIMIT_KEY = `${prefix}ratelimit`;
  }

  async enqueue(request: JobEnqueueRequest): Promise<Job> {
    // Check idempotency
    if (request.idempotencyKey) {
      const idempotencyHash = this.hashIdempotencyKey(request.idempotencyKey);
      const existingJobId = await this.redis.get(`${this.IDEMPOTENCY_KEY}:${idempotencyHash}`);
      
      if (existingJobId) {
        const existingJob = await this.getJob(existingJobId);
        if (existingJob) {
          // Check if job is in backoff period
          if (existingJob.status === JobStatus.FAILED && existingJob.nextAttemptAt) {
            if (Date.now() < existingJob.nextAttemptAt) {
              const retryAfter = Math.ceil((existingJob.nextAttemptAt - Date.now()) / 1000);
              throw new AppError(ErrorCode.RATE_LIMITED, {
                detail: 'Job in backoff period after failure',
                retryAfter,
                instance: '/api/preview/veo',
              });
            }
          } else if (existingJob.status === JobStatus.QUEUED || existingJob.status === JobStatus.PROCESSING) {
            // Return existing job
            return existingJob;
          }
        }
      }
    }

    // Check queue size
    const queueSize = await this.redis.zcard(this.QUEUE_KEY);
    if (queueSize >= this.config.maxQueueSize) {
      throw new AppError(ErrorCode.RATE_LIMITED, {
        detail: 'Job queue is full',
        retryAfter: 60,
        instance: '/api/preview/veo',
      });
    }

    // Check rate limits
    if (request.requestId) {
      const requestKey = `${this.RATE_LIMIT_KEY}:req:${request.requestId}`;
      const requestCount = await this.redis.incr(requestKey);
      
      if (requestCount === 1) {
        await this.redis.expire(requestKey, 60); // 1 minute TTL
      }
      
      if (requestCount > this.config.rateLimit.perRequest) {
        throw new AppError(ErrorCode.RATE_LIMITED, {
          detail: `Request limit exceeded (${this.config.rateLimit.perRequest} jobs per request)`,
          retryAfter: 30,
          instance: '/api/preview/veo',
        });
      }
    }

    // Global rate limit
    const globalKey = `${this.RATE_LIMIT_KEY}:global`;
    const globalCount = await this.redis.incr(globalKey);
    
    if (globalCount === 1) {
      await this.redis.expire(globalKey, 60);
    }
    
    if (globalCount > this.config.rateLimit.perMinute) {
      throw new AppError(ErrorCode.RATE_LIMITED, {
        detail: `Rate limit exceeded (${this.config.rateLimit.perMinute} jobs per minute)`,
        retryAfter: 60,
        instance: '/api/preview/veo',
      });
    }

    // Create job
    const jobId = `job-${crypto.randomUUID()}`;
    const now = Date.now();
    const redisJob: RedisJob = {
      id: jobId,
      type: request.type,
      status: JobStatus.QUEUED,
      priority: request.priority ?? JobPriority.NORMAL,
      payload: request.payload,
      progress: 0,
      attempts: 0,
      maxAttempts: request.retryPolicy?.maxAttempts ?? 3,
      createdAt: now,
      updatedAt: now,
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      metadata: request.metadata,
      retryPolicy: request.retryPolicy,
    };

    // Store job in Redis
    const jobKey = `${this.JOBS_KEY}:${jobId}`;
    await this.redis.set(jobKey, JSON.stringify(redisJob), 'EX', this.config.jobTTL);

    // Add to queue (sorted by priority and timestamp)
    const score = this.calculateQueueScore(redisJob.priority, now);
    await this.redis.zadd(this.QUEUE_KEY, score, jobId);

    // Store idempotency key
    if (request.idempotencyKey) {
      const idempotencyHash = this.hashIdempotencyKey(request.idempotencyKey);
      const idempotencyTTL = Math.floor(this.config.idempotencyTTL / 1000);
      await this.redis.set(
        `${this.IDEMPOTENCY_KEY}:${idempotencyHash}`,
        jobId,
        'EX',
        idempotencyTTL
      );
    }

    // Update metrics
    await this.updateMetrics('enqueued');

    return this.redisJobToJob(redisJob);
  }

  async reserve(workerId: string, types?: string[]): Promise<Job | null> {
    // Clean expired leases
    await this.cleanExpiredLeases();

    // Get next job from queue
    let jobId: string | null = null;
    
    if (types && types.length > 0) {
      // Filter by job type
      const jobIds = await this.redis.zrange(this.QUEUE_KEY, 0, -1);
      
      for (const id of jobIds) {
        const jobKey = `${this.JOBS_KEY}:${id}`;
        const jobData = await this.redis.get(jobKey);
        
        if (jobData) {
          const job = JSON.parse(jobData) as RedisJob;
          if (types.includes(job.type)) {
            jobId = id;
            break;
          }
        }
      }
    } else {
      // Get highest priority job
      const result = await this.redis.zpopmin(this.QUEUE_KEY, 1);
      if (result && result.length >= 2) {
        jobId = result[0] as string;
      }
    }

    if (!jobId) {
      return null;
    }

    // Get job data
    const jobKey = `${this.JOBS_KEY}:${jobId}`;
    const jobData = await this.redis.get(jobKey);
    
    if (!jobData) {
      return null;
    }

    const redisJob = JSON.parse(jobData) as RedisJob;

    // Update job status
    redisJob.status = JobStatus.PROCESSING;
    redisJob.startedAt = Date.now();
    redisJob.updatedAt = Date.now();
    redisJob.attempts++;

    // Save updated job
    await this.redis.set(jobKey, JSON.stringify(redisJob), 'EX', this.config.jobTTL);

    // Create lease
    const leaseKey = `${this.LEASE_KEY}:${jobId}`;
    const leaseData = {
      workerId,
      expiresAt: Date.now() + this.config.visibilityTimeout,
    };
    await this.redis.set(
      leaseKey,
      JSON.stringify(leaseData),
      'PX',
      this.config.visibilityTimeout
    );

    // Move to processing set
    if (types && types.length > 0) {
      await this.redis.zrem(this.QUEUE_KEY, jobId);
    }
    await this.redis.sadd(this.PROCESSING_KEY, jobId);

    // Update metrics
    await this.updateMetrics('reserved');

    return this.redisJobToJob(redisJob);
  }

  async heartbeat(jobId: string, workerId: string, progress?: number): Promise<void> {
    const leaseKey = `${this.LEASE_KEY}:${jobId}`;
    const leaseData = await this.redis.get(leaseKey);
    
    if (!leaseData) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: 'Job lease not found',
        instance: `/api/jobs/${jobId}`,
      });
    }

    const lease = JSON.parse(leaseData);
    
    if (lease.workerId !== workerId) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Worker does not own this job',
        instance: `/api/jobs/${jobId}`,
      });
    }

    // Extend lease
    const newLease = {
      workerId,
      expiresAt: Date.now() + this.config.visibilityTimeout,
    };
    await this.redis.set(
      leaseKey,
      JSON.stringify(newLease),
      'PX',
      this.config.visibilityTimeout
    );

    // Update progress if provided
    if (progress !== undefined) {
      const jobKey = `${this.JOBS_KEY}:${jobId}`;
      const jobData = await this.redis.get(jobKey);
      
      if (jobData) {
        const job = JSON.parse(jobData) as RedisJob;
        job.progress = Math.min(100, Math.max(0, progress));
        job.updatedAt = Date.now();
        await this.redis.set(jobKey, JSON.stringify(job), 'EX', this.config.jobTTL);
      }
    }
  }

  async complete(jobId: string, workerId: string, result: JobResult): Promise<void> {
    // Verify lease
    const leaseKey = `${this.LEASE_KEY}:${jobId}`;
    const leaseData = await this.redis.get(leaseKey);
    
    if (!leaseData) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Job lease not found',
        instance: `/api/jobs/${jobId}`,
      });
    }

    const lease = JSON.parse(leaseData);
    
    if (lease.workerId !== workerId) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Worker does not own this job',
        instance: `/api/jobs/${jobId}`,
      });
    }

    // Update job
    const jobKey = `${this.JOBS_KEY}:${jobId}`;
    const jobData = await this.redis.get(jobKey);
    
    if (!jobData) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: 'Job not found',
        instance: `/api/jobs/${jobId}`,
      });
    }

    const job = JSON.parse(jobData) as RedisJob;
    job.status = JobStatus.COMPLETED;
    job.result = result;
    job.progress = 100;
    job.completedAt = Date.now();
    job.updatedAt = Date.now();

    // Save completed job
    await this.redis.set(jobKey, JSON.stringify(job), 'EX', this.config.jobTTL);

    // Clean up
    await this.redis.del(leaseKey);
    await this.redis.srem(this.PROCESSING_KEY, jobId);

    // Update metrics
    await this.updateMetrics('completed', job.startedAt ? Date.now() - job.startedAt : undefined);
  }

  async fail(jobId: string, workerId: string, error: JobError): Promise<void> {
    // Verify lease
    const leaseKey = `${this.LEASE_KEY}:${jobId}`;
    const leaseData = await this.redis.get(leaseKey);
    
    if (!leaseData) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Job lease not found',
        instance: `/api/jobs/${jobId}`,
      });
    }

    const lease = JSON.parse(leaseData);
    
    if (lease.workerId !== workerId) {
      throw new AppError(ErrorCode.FORBIDDEN, {
        detail: 'Worker does not own this job',
        instance: `/api/jobs/${jobId}`,
      });
    }

    // Update job
    const jobKey = `${this.JOBS_KEY}:${jobId}`;
    const jobData = await this.redis.get(jobKey);
    
    if (!jobData) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: 'Job not found',
        instance: `/api/jobs/${jobId}`,
      });
    }

    const job = JSON.parse(jobData) as RedisJob;
    
    // Calculate backoff if should retry
    if (job.retryPolicy && job.attempts < job.maxAttempts) {
      const delayMs = calculateBackoffMs(job.attempts, job.retryPolicy);
      job.nextAttemptAt = Date.now() + delayMs;
      error.retryAfter = Math.ceil(delayMs / 1000);
      
      // Re-queue for retry
      job.status = JobStatus.QUEUED;
      const score = this.calculateQueueScore(job.priority, job.nextAttemptAt);
      await this.redis.zadd(this.QUEUE_KEY, score, jobId);
    } else {
      // No more retries
      job.status = JobStatus.FAILED;
      job.completedAt = Date.now();
    }

    job.error = error;
    job.updatedAt = Date.now();

    // Save job
    await this.redis.set(jobKey, JSON.stringify(job), 'EX', this.config.jobTTL);

    // Clean up
    await this.redis.del(leaseKey);
    await this.redis.srem(this.PROCESSING_KEY, jobId);

    // Update metrics
    await this.updateMetrics('failed');
  }

  async getJob(jobId: string): Promise<Job | null> {
    const jobKey = `${this.JOBS_KEY}:${jobId}`;
    const jobData = await this.redis.get(jobKey);
    
    if (!jobData) {
      return null;
    }

    const redisJob = JSON.parse(jobData) as RedisJob;
    return this.redisJobToJob(redisJob);
  }

  async getStats(): Promise<QueueStats> {
    const [
      queuedCount,
      processingCount,
      metricsData,
    ] = await Promise.all([
      this.redis.zcard(this.QUEUE_KEY),
      this.redis.scard(this.PROCESSING_KEY),
      this.redis.hgetall(this.METRICS_KEY),
    ]);

    const completed = parseInt(metricsData.completed || '0');
    const failed = parseInt(metricsData.failed || '0');
    const totalProcessingTime = parseInt(metricsData.totalProcessingTime || '0');
    const processedCount = parseInt(metricsData.processedCount || '0');

    const total = queuedCount + processingCount + completed + failed;
    const avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : undefined;
    const successRate = (completed + failed) > 0 ? completed / (completed + failed) : undefined;

    return {
      queued: queuedCount,
      processing: processingCount,
      completed,
      failed,
      cancelled: 0, // Not tracked separately
      total,
      avgProcessingTime,
      successRate,
    };
  }

  async cleanOldJobs(maxAgeSeconds: number): Promise<void> {
    const cutoffTime = Date.now() - (maxAgeSeconds * 1000);
    
    // Get all job IDs
    const pattern = `${this.JOBS_KEY}:*`;
    const keys = await this.scanKeys(pattern);
    
    for (const key of keys) {
      const jobData = await this.redis.get(key);
      if (jobData) {
        const job = JSON.parse(jobData) as RedisJob;
        
        if (job.createdAt < cutoffTime && 
            (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED)) {
          // Delete old job
          await this.redis.del(key);
          
          // Clean up related keys
          if (job.idempotencyKey) {
            const idempotencyHash = this.hashIdempotencyKey(job.idempotencyKey);
            await this.redis.del(`${this.IDEMPOTENCY_KEY}:${idempotencyHash}`);
          }
        }
      }
    }
  }

  async getRequestJobs(requestId: string): Promise<Job[]> {
    const pattern = `${this.JOBS_KEY}:*`;
    const keys = await this.scanKeys(pattern);
    const jobs: Job[] = [];
    
    for (const key of keys) {
      const jobData = await this.redis.get(key);
      if (jobData) {
        const redisJob = JSON.parse(jobData) as RedisJob;
        if (redisJob.requestId === requestId) {
          jobs.push(this.redisJobToJob(redisJob));
        }
      }
    }
    
    return jobs;
  }

  async getRequestJobCount(requestId: string): Promise<number> {
    const jobs = await this.getRequestJobs(requestId);
    return jobs.length;
  }

  /**
   * Clean up expired leases and return jobs to queue
   */
  private async cleanExpiredLeases(): Promise<void> {
    const pattern = `${this.LEASE_KEY}:*`;
    const keys = await this.scanKeys(pattern);
    
    for (const key of keys) {
      const leaseData = await this.redis.get(key);
      if (!leaseData) {
        // Lease expired, check if job needs to be requeued
        const jobId = key.split(':').pop()!;
        const inProcessing = await this.redis.sismember(this.PROCESSING_KEY, jobId);
        
        if (inProcessing) {
          // Return to queue
          const jobKey = `${this.JOBS_KEY}:${jobId}`;
          const jobData = await this.redis.get(jobKey);
          
          if (jobData) {
            const job = JSON.parse(jobData) as RedisJob;
            job.status = JobStatus.QUEUED;
            job.updatedAt = Date.now();
            
            await this.redis.set(jobKey, JSON.stringify(job), 'EX', this.config.jobTTL);
            const score = this.calculateQueueScore(job.priority, Date.now());
            await this.redis.zadd(this.QUEUE_KEY, score, jobId);
            await this.redis.srem(this.PROCESSING_KEY, jobId);
          }
        }
      }
    }
  }

  /**
   * Calculate queue score for priority sorting
   * Higher priority = lower score (processed first)
   */
  private calculateQueueScore(priority: JobPriority, timestamp: number): number {
    const priorityWeight: Record<JobPriority, number> = {
      [JobPriority.URGENT]: -1000000000, // Highest priority (lowest score)
      [JobPriority.HIGH]: 0,
      [JobPriority.NORMAL]: 1000000000,
      [JobPriority.LOW]: 2000000000,
    };
    return priorityWeight[priority] + timestamp;
  }

  /**
   * Hash idempotency key for consistent storage
   */
  private hashIdempotencyKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Convert Redis job to API job format
   */
  private redisJobToJob(redisJob: RedisJob): Job {
    return {
      id: redisJob.id,
      type: redisJob.type,
      status: redisJob.status,
      priority: redisJob.priority,
      payload: redisJob.payload,
      progress: redisJob.progress,
      attempts: redisJob.attempts,
      maxAttempts: redisJob.maxAttempts,
      createdAt: redisJob.createdAt,
      updatedAt: redisJob.updatedAt,
      startedAt: redisJob.startedAt,
      completedAt: redisJob.completedAt,
      requestId: redisJob.requestId,
      idempotencyKey: redisJob.idempotencyKey,
      metadata: redisJob.metadata,
      result: redisJob.result ?? null,
      error: redisJob.error,
    };
  }

  /**
   * Update metrics
   */
  private async updateMetrics(event: string, processingTime?: number): Promise<void> {
    const multi = this.redis.multi();
    
    switch (event) {
      case 'enqueued':
        multi.hincrby(this.METRICS_KEY, 'enqueued', 1);
        break;
      case 'reserved':
        multi.hincrby(this.METRICS_KEY, 'reserved', 1);
        break;
      case 'completed':
        multi.hincrby(this.METRICS_KEY, 'completed', 1);
        if (processingTime) {
          multi.hincrby(this.METRICS_KEY, 'totalProcessingTime', processingTime);
          multi.hincrby(this.METRICS_KEY, 'processedCount', 1);
        }
        break;
      case 'failed':
        multi.hincrby(this.METRICS_KEY, 'failed', 1);
        break;
    }
    
    await multi.exec();
  }

  /**
   * Scan keys with pattern (handles large keyspaces)
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const [newCursor, foundKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = newCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');
    
    return keys;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}