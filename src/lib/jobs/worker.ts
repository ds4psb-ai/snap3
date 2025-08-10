/**
 * Job worker for processing jobs (simulation)
 */

import { Job, JobStatus, JobResult, JobError } from './types';
import { JobQueue } from './queue';
import { JobTracker } from './tracker';
import { ErrorCode } from '@/lib/errors/codes';
import { AppError } from '@/lib/errors/app-error';
import { JobQueueProvider, createQueueProvider } from './providers';
import { InMemoryQueueProvider } from './providers/inmemory';
import { FakeDurableQueueProvider } from './providers/fake-durable';

export interface WorkerConfig {
  processInterval?: number; // ms
  simulationDelay?: number; // ms
  failureRate?: number; // 0-1
}

export class JobWorker {
  private queue: JobQueue;
  private tracker: JobTracker;
  private config: Required<WorkerConfig>;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(
    queue: JobQueue,
    tracker: JobTracker,
    config: WorkerConfig = {}
  ) {
    this.queue = queue;
    this.tracker = tracker;
    this.config = {
      processInterval: config.processInterval ?? 1000,
      simulationDelay: config.simulationDelay ?? 5000,
      failureRate: config.failureRate ?? 0.1,
    };
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.processJobs();
    }, this.config.processInterval);
    
    // Initial processing
    this.processJobs();
  }

  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async processJobs(): Promise<void> {
    if (!this.isRunning) return;
    
    // Clean up old data
    this.tracker.runCleanup();
    this.queue.cleanOldJobs(3600); // Clean jobs older than 1 hour
    
    // Process next job
    const job = await this.queue.processNext();
    if (!job) return;
    
    // Record transition
    this.tracker.recordTransition(job.id, JobStatus.QUEUED, JobStatus.PROCESSING);
    
    // Simulate processing
    this.simulateJobProcessing(job);
  }

  private async simulateJobProcessing(job: Job): Promise<void> {
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      const currentProgress = this.queue.getJob(job.id)?.progress ?? 0;
      if (currentProgress < 90) {
        this.queue.updateProgress(job.id, currentProgress + 10);
      }
    }, this.config.simulationDelay / 10);

    // Simulate processing delay
    setTimeout(() => {
      clearInterval(progressInterval);
      
      // Determine success or failure
      const shouldFail = Math.random() < this.config.failureRate;
      
      if (shouldFail) {
        this.handleJobFailure(job);
      } else {
        this.handleJobSuccess(job);
      }
    }, this.config.simulationDelay);
  }

  private handleJobSuccess(job: Job): void {
    const result: JobResult = {
      videoUrl: `https://storage.snap3.com/previews/${job.id}.mp4`,
      duration: 8,
      aspectRatio: '16:9',
      quality: job.payload.quality as string ?? '720p',
      fps: 30,
      bitrate: 5000000,
      synthIdDetected: Math.random() > 0.5,
    };
    
    this.queue.updateStatus(job.id, JobStatus.COMPLETED, result);
    this.tracker.recordTransition(job.id, JobStatus.PROCESSING, JobStatus.COMPLETED, { result });
  }

  private handleJobFailure(job: Job): void {
    // Determine failure reason
    const failureReasons = [
      {
        code: ErrorCode.PROVIDER_QUOTA_EXCEEDED,
        message: 'Provider quota exceeded',
        retryAfter: 3600,
      },
      {
        code: ErrorCode.PROVIDER_POLICY_BLOCKED,
        message: 'Content blocked by provider policy',
      },
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Internal processing error',
        retryAfter: 60,
      },
    ];
    
    const error = failureReasons[Math.floor(Math.random() * failureReasons.length)];
    
    // Check if should retry
    if (job.attempts < job.maxAttempts && error.retryAfter) {
      // Re-queue for retry
      setTimeout(() => {
        this.queue.updateStatus(job.id, JobStatus.QUEUED);
        this.tracker.recordTransition(job.id, JobStatus.FAILED, JobStatus.QUEUED, { 
          reason: 'retry',
          attempt: job.attempts,
        });
      }, error.retryAfter * 1000);
    } else {
      // Final failure
      this.queue.updateStatus(job.id, JobStatus.FAILED, null, error);
      this.tracker.recordTransition(job.id, JobStatus.PROCESSING, JobStatus.FAILED, { error });
    }
  }

  async processSpecificJob(jobId: string): Promise<void> {
    const job = this.queue.getJob(jobId);
    if (!job) return;
    
    if (job.status !== JobStatus.QUEUED) return;
    
    this.queue.updateStatus(jobId, JobStatus.PROCESSING);
    this.tracker.recordTransition(jobId, JobStatus.QUEUED, JobStatus.PROCESSING);
    
    await this.simulateJobProcessing(job);
  }

  getWorkerStatus(): {
    isRunning: boolean;
    config: WorkerConfig;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
    };
  }
}

// Singleton instances for the application
let queueInstance: JobQueue | null = null;
let providerInstance: JobQueueProvider | null = null;
let trackerInstance: JobTracker | null = null;
let workerInstance: JobWorker | null = null;

/**
 * Get the queue provider instance
 * Uses environment variable to select provider type
 */
export async function getQueueProvider(): Promise<JobQueueProvider> {
  if (!providerInstance) {
    const providerType = (process.env.QUEUE_PROVIDER || 'inmemory') as 'inmemory' | 'redis' | 'fake-durable';
    const config = {
      maxConcurrent: 2,
      maxQueueSize: 100,
      rateLimit: {
        perMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60'),
        perRequest: parseInt(process.env.RATE_LIMIT_PER_REQUEST || '2'),
      },
    };
    
    try {
      providerInstance = await createQueueProvider(providerType, config);
      console.log(`Job queue provider initialized: ${providerType}`);
    } catch (error) {
      console.error(`Failed to initialize ${providerType} provider, falling back to in-memory:`, error);
      
      // Fallback to in-memory
      providerInstance = new InMemoryQueueProvider(config);
      
      // Map provider errors to AppError
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('limit')) {
          throw new AppError(ErrorCode.PROVIDER_QUOTA_EXCEEDED, {
            detail: 'Queue provider quota exceeded',
            retryAfter: 60,
            instance: '/api/preview/veo',
          });
        }
      }
    }
  }
  return providerInstance;
}

/**
 * Get the job queue instance
 * For backward compatibility, wraps the provider
 */
export function getJobQueue(): JobQueue {
  if (!queueInstance) {
    // For now, create a regular JobQueue
    // In future, this could be a facade over the provider
    queueInstance = new JobQueue({
      maxConcurrent: 2,
      maxQueueSize: 100,
      rateLimit: {
        perMinute: 10,
        perRequest: 2,
      },
    });
  }
  return queueInstance;
}

export function getJobTracker(): JobTracker {
  if (!trackerInstance) {
    trackerInstance = new JobTracker();
  }
  return trackerInstance;
}

export function getJobWorker(): JobWorker {
  if (!workerInstance) {
    workerInstance = new JobWorker(
      getJobQueue(),
      getJobTracker(),
      {
        processInterval: 1000,
        simulationDelay: 5000,
        failureRate: 0.1,
      }
    );
    // Auto-start worker
    workerInstance.start();
  }
  return workerInstance;
}

// Initialize worker on module load
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  getJobWorker();
}