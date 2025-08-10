/**
 * Tests for job tracker and idempotency
 */

import { JobTracker } from '@/lib/jobs/tracker';
import { Job, JobStatus } from '@/lib/jobs/types';

describe('JobTracker', () => {
  let tracker: JobTracker;

  beforeEach(() => {
    tracker = new JobTracker();
  });

  afterEach(() => {
    tracker.clear();
  });

  describe('idempotency', () => {
    it('should track idempotency keys', () => {
      const key = 'idempotent-key-123';
      const jobId = 'job-123';
      
      tracker.setIdempotencyKey(key, jobId);
      
      const retrieved = tracker.getJobByIdempotencyKey(key);
      expect(retrieved).toBe(jobId);
    });

    it('should return existing job for duplicate idempotency key', () => {
      const key = 'idempotent-key-123';
      const jobId1 = 'job-123';
      const jobId2 = 'job-456';
      
      tracker.setIdempotencyKey(key, jobId1);
      tracker.setIdempotencyKey(key, jobId2); // Should be ignored
      
      const retrieved = tracker.getJobByIdempotencyKey(key);
      expect(retrieved).toBe(jobId1); // Original job
    });

    it('should expire idempotency keys', () => {
      jest.useFakeTimers();
      
      const key = 'idempotent-key-123';
      const jobId = 'job-123';
      
      tracker.setIdempotencyKey(key, jobId, 3600); // 1 hour TTL
      
      // Advance time by 30 minutes
      jest.advanceTimersByTime(1800000);
      expect(tracker.getJobByIdempotencyKey(key)).toBe(jobId);
      
      // Advance time by another 31 minutes (total 61 minutes)
      jest.advanceTimersByTime(1860000);
      expect(tracker.getJobByIdempotencyKey(key)).toBeNull();
      
      jest.useRealTimers();
    });

    it('should check if idempotency key exists', () => {
      const key = 'idempotent-key-123';
      
      expect(tracker.hasIdempotencyKey(key)).toBe(false);
      
      tracker.setIdempotencyKey(key, 'job-123');
      expect(tracker.hasIdempotencyKey(key)).toBe(true);
    });
  });

  describe('request tracking', () => {
    it('should track jobs by request ID', () => {
      const requestId = 'req-123';
      const jobId1 = 'job-1';
      const jobId2 = 'job-2';
      
      tracker.addJobToRequest(requestId, jobId1);
      tracker.addJobToRequest(requestId, jobId2);
      
      const jobs = tracker.getJobsByRequestId(requestId);
      expect(jobs).toEqual([jobId1, jobId2]);
    });

    it('should count jobs per request', () => {
      const requestId = 'req-123';
      
      expect(tracker.getRequestJobCount(requestId)).toBe(0);
      
      tracker.addJobToRequest(requestId, 'job-1');
      expect(tracker.getRequestJobCount(requestId)).toBe(1);
      
      tracker.addJobToRequest(requestId, 'job-2');
      expect(tracker.getRequestJobCount(requestId)).toBe(2);
    });

    it('should clean up old request data', () => {
      jest.useFakeTimers();
      
      const requestId = 'req-123';
      tracker.addJobToRequest(requestId, 'job-1');
      
      // Advance time by MORE than 10 minutes (10 minutes + 1 second)
      jest.advanceTimersByTime(601000);
      
      tracker.cleanOldRequests(600); // Clean requests older than 10 minutes
      
      expect(tracker.getRequestJobCount(requestId)).toBe(0);
      
      jest.useRealTimers();
    });
  });

  describe('job history', () => {
    it('should track job transitions', () => {
      const jobId = 'job-123';
      
      tracker.recordTransition(jobId, JobStatus.QUEUED, JobStatus.PROCESSING);
      tracker.recordTransition(jobId, JobStatus.PROCESSING, JobStatus.COMPLETED);
      
      const history = tracker.getJobHistory(jobId);
      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        from: JobStatus.QUEUED,
        to: JobStatus.PROCESSING,
      });
      expect(history[1]).toMatchObject({
        from: JobStatus.PROCESSING,
        to: JobStatus.COMPLETED,
      });
    });

    it('should include timestamps in history', () => {
      const jobId = 'job-123';
      const now = Date.now();
      
      tracker.recordTransition(jobId, JobStatus.QUEUED, JobStatus.PROCESSING);
      
      const history = tracker.getJobHistory(jobId);
      expect(history[0].timestamp).toBeGreaterThanOrEqual(now);
    });
  });

  describe('rate limit tracking', () => {
    it('should track rate limit windows', () => {
      const clientId = 'client-123';
      
      tracker.recordRequest(clientId);
      tracker.recordRequest(clientId);
      tracker.recordRequest(clientId);
      
      const count = tracker.getRequestCount(clientId, 60); // Last 60 seconds
      expect(count).toBe(3);
    });

    it('should only count recent requests', () => {
      jest.useFakeTimers();
      
      const clientId = 'client-123';
      
      tracker.recordRequest(clientId);
      
      // Advance time by 30 seconds
      jest.advanceTimersByTime(30000);
      tracker.recordRequest(clientId);
      
      // Advance time by another 31 seconds (total 61 seconds)
      jest.advanceTimersByTime(31000);
      tracker.recordRequest(clientId);
      
      // Count requests in last 60 seconds (should exclude first one)
      const count = tracker.getRequestCount(clientId, 60);
      expect(count).toBe(2);
      
      jest.useRealTimers();
    });

    it('should calculate next available slot', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);
      
      const clientId = 'client-123';
      
      // Fill rate limit (10 per minute)
      for (let i = 0; i < 10; i++) {
        tracker.recordRequest(clientId);
      }
      
      const nextSlot = tracker.getNextAvailableSlot(clientId, 10, 60);
      expect(nextSlot).toBeGreaterThan(now);
      expect(nextSlot).toBeLessThanOrEqual(now + 60001); // Add 1ms tolerance
      
      jest.useRealTimers();
    });
  });

  describe('statistics', () => {
    it('should track global stats', () => {
      tracker.recordTransition('job-1', JobStatus.QUEUED, JobStatus.PROCESSING);
      tracker.recordTransition('job-2', JobStatus.QUEUED, JobStatus.PROCESSING);
      tracker.recordTransition('job-1', JobStatus.PROCESSING, JobStatus.COMPLETED);
      tracker.recordTransition('job-2', JobStatus.PROCESSING, JobStatus.FAILED);
      
      const stats = tracker.getGlobalStats();
      expect(stats.totalJobs).toBe(2);
      expect(stats.completedJobs).toBe(1);
      expect(stats.failedJobs).toBe(1);
    });

    it('should calculate success rate', () => {
      tracker.recordTransition('job-1', JobStatus.PROCESSING, JobStatus.COMPLETED);
      tracker.recordTransition('job-2', JobStatus.PROCESSING, JobStatus.COMPLETED);
      tracker.recordTransition('job-3', JobStatus.PROCESSING, JobStatus.FAILED);
      
      const stats = tracker.getGlobalStats();
      expect(stats.successRate).toBeCloseTo(0.67, 2);
    });
  });

  describe('cleanup', () => {
    it('should clear all tracking data', () => {
      tracker.setIdempotencyKey('key-1', 'job-1');
      tracker.addJobToRequest('req-1', 'job-1');
      tracker.recordTransition('job-1', JobStatus.QUEUED, JobStatus.PROCESSING);
      
      tracker.clear();
      
      expect(tracker.getJobByIdempotencyKey('key-1')).toBeNull();
      expect(tracker.getRequestJobCount('req-1')).toBe(0);
      expect(tracker.getJobHistory('job-1')).toEqual([]);
    });
  });
});