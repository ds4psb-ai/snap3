/**
 * Tests for job queue system
 */

import { JobQueue } from '@/lib/jobs/queue';
import { JobStatus, JobPriority } from '@/lib/jobs/types';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode } from '@/lib/errors/codes';

describe('JobQueue', () => {
  let queue: JobQueue;

  beforeEach(() => {
    queue = new JobQueue({
      maxConcurrent: 2,
      maxQueueSize: 100,
      rateLimit: {
        perMinute: 10,
        perRequest: 2,
      },
    });
  });

  afterEach(() => {
    queue.clear();
  });

  describe('enqueue', () => {
    it('should add job to queue', () => {
      const job = queue.enqueue({
        type: 'preview',
        payload: { veo3Id: 'test-123', prompt: 'test' },
      });

      expect(job.id).toBeDefined();
      expect(job.status).toBe(JobStatus.QUEUED);
      expect(job.type).toBe('preview');
    });

    it('should respect max queue size', () => {
      const smallQueue = new JobQueue({ maxQueueSize: 2 });
      
      smallQueue.enqueue({ type: 'preview', payload: {} });
      smallQueue.enqueue({ type: 'preview', payload: {} });
      
      expect(() => {
        smallQueue.enqueue({ type: 'preview', payload: {} });
      }).toThrow(AppError);
    });

    it('should handle priority jobs', () => {
      const normalJob = queue.enqueue({
        type: 'preview',
        payload: {},
      });

      const priorityJob = queue.enqueue({
        type: 'preview',
        payload: {},
        priority: JobPriority.HIGH,
      });

      const jobs = queue.getQueued();
      expect(jobs[0].id).toBe(priorityJob.id);
      expect(jobs[1].id).toBe(normalJob.id);
    });
  });

  describe('rate limiting', () => {
    it('should enforce per-request limit', () => {
      const requestId = 'req-123';
      
      queue.enqueue({ type: 'preview', payload: {}, requestId });
      queue.enqueue({ type: 'preview', payload: {}, requestId });
      
      expect(() => {
        queue.enqueue({ type: 'preview', payload: {}, requestId });
      }).toThrow(AppError);
    });

    it('should enforce per-minute rate limit', () => {
      // Add 10 jobs (rate limit)
      for (let i = 0; i < 10; i++) {
        queue.enqueue({ type: 'preview', payload: {} });
      }

      // 11th job should trigger rate limit
      expect(() => {
        queue.enqueue({ type: 'preview', payload: {} });
      }).toThrow(AppError);
    });

    it('should reset rate limit after time window', () => {
      jest.useFakeTimers();
      
      // Fill up rate limit
      for (let i = 0; i < 10; i++) {
        queue.enqueue({ type: 'preview', payload: {} });
      }

      // Should be rate limited
      expect(() => {
        queue.enqueue({ type: 'preview', payload: {} });
      }).toThrow();

      // Advance time by 1 minute
      jest.advanceTimersByTime(60000);

      // Should work now
      expect(() => {
        queue.enqueue({ type: 'preview', payload: {} });
      }).not.toThrow();

      jest.useRealTimers();
    });
  });

  describe('job retrieval', () => {
    it('should get job by id', () => {
      const job = queue.enqueue({ type: 'preview', payload: { test: true } });
      
      const retrieved = queue.getJob(job.id);
      expect(retrieved).toEqual(job);
    });

    it('should return null for non-existent job', () => {
      const retrieved = queue.getJob('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should get queued jobs', () => {
      queue.enqueue({ type: 'preview', payload: {} });
      queue.enqueue({ type: 'preview', payload: {} });
      
      const queued = queue.getQueued();
      expect(queued).toHaveLength(2);
      expect(queued.every(j => j.status === JobStatus.QUEUED)).toBe(true);
    });

    it('should get stats', () => {
      queue.enqueue({ type: 'preview', payload: {} });
      queue.enqueue({ type: 'preview', payload: {} });
      
      const stats = queue.getStats();
      expect(stats.queued).toBe(2);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('job processing', () => {
    it('should process next job', async () => {
      const job = queue.enqueue({ type: 'preview', payload: {} });
      
      const processing = await queue.processNext();
      expect(processing?.id).toBe(job.id);
      expect(processing?.status).toBe(JobStatus.PROCESSING);
    });

    it('should respect max concurrent', async () => {
      const smallQueue = new JobQueue({ maxConcurrent: 1 });
      
      smallQueue.enqueue({ type: 'preview', payload: {} });
      smallQueue.enqueue({ type: 'preview', payload: {} });
      
      const first = await smallQueue.processNext();
      expect(first).toBeDefined();
      
      const second = await smallQueue.processNext();
      expect(second).toBeNull(); // Max concurrent reached
    });

    it('should update job status', () => {
      const job = queue.enqueue({ type: 'preview', payload: {} });
      
      queue.updateStatus(job.id, JobStatus.PROCESSING);
      expect(queue.getJob(job.id)?.status).toBe(JobStatus.PROCESSING);
      
      queue.updateStatus(job.id, JobStatus.COMPLETED, {
        videoUrl: 'test.mp4',
      });
      
      const completed = queue.getJob(job.id);
      expect(completed?.status).toBe(JobStatus.COMPLETED);
      expect(completed?.result).toEqual({ videoUrl: 'test.mp4' });
    });

    it('should handle job failure', () => {
      const job = queue.enqueue({ type: 'preview', payload: {} });
      
      queue.updateStatus(job.id, JobStatus.FAILED, null, {
        code: ErrorCode.PROVIDER_QUOTA_EXCEEDED,
        message: 'Quota exceeded',
      });
      
      const failed = queue.getJob(job.id);
      expect(failed?.status).toBe(JobStatus.FAILED);
      expect(failed?.error?.code).toBe(ErrorCode.PROVIDER_QUOTA_EXCEEDED);
    });
  });

  describe('cleanup', () => {
    it('should clear all jobs', () => {
      queue.enqueue({ type: 'preview', payload: {} });
      queue.enqueue({ type: 'preview', payload: {} });
      
      queue.clear();
      
      const stats = queue.getStats();
      expect(stats.queued).toBe(0);
      expect(stats.total).toBe(0);
    });

    it('should clean old completed jobs', () => {
      jest.useFakeTimers();
      
      const job = queue.enqueue({ type: 'preview', payload: {} });
      queue.updateStatus(job.id, JobStatus.COMPLETED);
      
      // Advance time by MORE than 1 hour (1 hour + 1 second)
      jest.advanceTimersByTime(3601000);
      
      queue.cleanOldJobs(3600); // Clean jobs older than 1 hour
      
      expect(queue.getJob(job.id)).toBeNull();
      
      jest.useRealTimers();
    });
  });
});