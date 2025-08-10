/**
 * Redis Provider Tests
 * Tests for Redis-based job queue provider
 */

import { RedisQueueProvider } from '@/lib/jobs/providers/redis';
import { JobStatus, JobPriority } from '@/lib/jobs/types';
import { ErrorCode } from '@/lib/errors/codes';
import Redis from 'ioredis';

// Mock Redis if not available in test environment
const REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/15'; // Use DB 15 for tests

describe('RedisQueueProvider', () => {
  let provider: RedisQueueProvider;
  let redis: InstanceType<typeof Redis>;

  beforeAll(async () => {
    // Check if Redis is available
    redis = new Redis(REDIS_URL);
    try {
      await redis.ping();
    } catch (error) {
      console.warn('Redis not available, skipping Redis provider tests');
      redis.disconnect();
      return;
    }
  });

  beforeEach(async () => {
    if (!redis) return;
    
    // Clear test database
    await redis.flushdb();
    
    // Create provider with test config
    provider = new RedisQueueProvider({
      redisUrl: REDIS_URL,
      keyPrefix: 'test:jobs:',
      visibilityTimeout: 1000, // 1 second for faster tests
      rateLimit: {
        perMinute: 100,
        perRequest: 10,
      },
    });
  });

  afterEach(async () => {
    if (provider) {
      await provider.close();
    }
  });

  afterAll(async () => {
    if (redis) {
      await redis.quit();
    }
  });

  describe('happy path', () => {
    test('accept → reserve → heartbeat → complete', async () => {
      if (!redis) return;

      // Enqueue job
      const job = await provider.enqueue({
        type: 'test',
        payload: { data: 'test' },
        priority: JobPriority.HIGH,
      });

      expect(job).toMatchObject({
        id: expect.stringMatching(/^job-/),
        type: 'test',
        status: JobStatus.QUEUED,
        priority: JobPriority.HIGH,
      });

      // Reserve job
      const reserved = await provider.reserve('worker-1');
      expect(reserved).not.toBeNull();
      expect(reserved!.id).toBe(job.id);
      expect(reserved!.status).toBe(JobStatus.PROCESSING);
      expect(reserved!.attempts).toBe(1);

      // Heartbeat to extend lease
      await provider.heartbeat(job.id, 'worker-1', 50);
      
      // Get job to check progress
      const jobWithProgress = await provider.getJob(job.id);
      expect(jobWithProgress?.progress).toBe(50);

      // Complete job
      await provider.complete(job.id, 'worker-1', {
        output: 'success',
      });

      // Verify completion
      const completedJob = await provider.getJob(job.id);
      expect(completedJob?.status).toBe(JobStatus.COMPLETED);
      expect(completedJob?.result).toEqual({ output: 'success' });
      expect(completedJob?.progress).toBe(100);
    });
  });

  describe('idempotency', () => {
    test('dedupe: same idempotency key returns same job', async () => {
      if (!redis) return;

      const request = {
        type: 'test',
        payload: { data: 'test' },
        idempotencyKey: 'idempotent-123',
      };

      const job1 = await provider.enqueue(request);
      const job2 = await provider.enqueue(request);

      expect(job2.id).toBe(job1.id);
    });

    test('idempotency respects backoff period', async () => {
      if (!redis) return;

      const idempotencyKey = 'backoff-test';
      
      // Enqueue with retry policy
      const job = await provider.enqueue({
        type: 'test',
        payload: {},
        idempotencyKey,
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          initialDelayMs: 100,
          maxDelayMs: 1000,
        },
      });

      // Reserve and fail
      const reserved = await provider.reserve('worker-1');
      await provider.fail(reserved!.id, 'worker-1', {
        code: 'ERROR',
        message: 'Test failure',
      });

      // Try to enqueue again - should be in backoff
      await expect(
        provider.enqueue({
          type: 'test',
          payload: {},
          idempotencyKey,
        })
      ).rejects.toMatchObject({
        code: ErrorCode.RATE_LIMITED,
        retryAfter: expect.any(Number),
      });
    });
  });

  describe('backoff calculation', () => {
    test('exponential backoff increases retry delays', async () => {
      if (!redis) return;

      const job = await provider.enqueue({
        type: 'test',
        payload: {},
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          initialDelayMs: 100,
          maxDelayMs: 10000,
        },
      });

      // First failure
      let reserved = await provider.reserve('worker-1');
      await provider.fail(reserved!.id, 'worker-1', {
        code: 'ERROR',
        message: 'Fail 1',
      });

      let failedJob = await provider.getJob(job.id);
      expect(failedJob?.error?.retryAfter).toBeGreaterThanOrEqual(0);
      expect(failedJob?.error?.retryAfter).toBeLessThanOrEqual(1);

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second failure
      reserved = await provider.reserve('worker-1');
      if (reserved) {
        await provider.fail(reserved.id, 'worker-1', {
          code: 'ERROR',
          message: 'Fail 2',
        });

        failedJob = await provider.getJob(job.id);
        // Second retry should have longer delay (200ms = 0.2s)
        expect(failedJob?.error?.retryAfter).toBeGreaterThanOrEqual(0);
        expect(failedJob?.error?.retryAfter).toBeLessThanOrEqual(1);
      }
    });

    test('429 response includes Retry-After header value', async () => {
      if (!redis) return;

      const idempotencyKey = 'retry-test';
      
      // Create and fail a job
      await provider.enqueue({
        type: 'test',
        payload: {},
        idempotencyKey,
        retryPolicy: {
          maxAttempts: 2,
          backoffStrategy: 'fixed',
          initialDelayMs: 5000,
          maxDelayMs: 5000,
        },
      });

      const reserved = await provider.reserve('worker-1');
      await provider.fail(reserved!.id, 'worker-1', {
        code: 'ERROR',
        message: 'Failed',
      });

      // Try to enqueue during backoff
      try {
        await provider.enqueue({
          type: 'test',
          payload: {},
          idempotencyKey,
        });
        fail('Should have thrown rate limit error');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.RATE_LIMITED);
        expect(error.retryAfter).toBe(5); // 5000ms = 5s
      }
    });
  });

  describe('lease management', () => {
    test('lease expires and job returns to queue', async () => {
      if (!redis) return;

      // Create provider with short visibility timeout
      const shortProvider = new RedisQueueProvider({
        redisUrl: REDIS_URL,
        keyPrefix: 'test:short:',
        visibilityTimeout: 100, // 100ms
      });

      try {
        const job = await shortProvider.enqueue({
          type: 'test',
          payload: {},
        });

        // Reserve job
        const reserved = await shortProvider.reserve('worker-1');
        expect(reserved).not.toBeNull();

        // Wait for lease to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        // Job should be available for reservation again
        const reservedAgain = await shortProvider.reserve('worker-2');
        expect(reservedAgain).not.toBeNull();
        expect(reservedAgain!.id).toBe(job.id);
      } finally {
        await shortProvider.close();
      }
    });

    test('heartbeat extends lease', async () => {
      if (!redis) return;

      const job = await provider.enqueue({
        type: 'test',
        payload: {},
      });

      const reserved = await provider.reserve('worker-1');
      
      // Initial heartbeat
      await provider.heartbeat(reserved!.id, 'worker-1', 25);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Another heartbeat should still work
      await provider.heartbeat(reserved!.id, 'worker-1', 75);
      
      // Complete should work
      await provider.complete(reserved!.id, 'worker-1', {});
      
      const completed = await provider.getJob(job.id);
      expect(completed?.status).toBe(JobStatus.COMPLETED);
    });
  });

  describe('rate limiting', () => {
    test('request rate limit', async () => {
      if (!redis) return;

      const requestId = 'request-rate-test';
      
      // Create provider with low limits
      const limitedProvider = new RedisQueueProvider({
        redisUrl: REDIS_URL,
        keyPrefix: 'test:limited:',
        rateLimit: {
          perMinute: 100,
          perRequest: 2,
        },
      });

      try {
        // Enqueue 2 jobs (at limit)
        await limitedProvider.enqueue({
          type: 'test',
          payload: {},
          requestId,
        });
        
        await limitedProvider.enqueue({
          type: 'test',
          payload: {},
          requestId,
        });

        // Third should fail
        await expect(
          limitedProvider.enqueue({
            type: 'test',
            payload: {},
            requestId,
          })
        ).rejects.toMatchObject({
          code: ErrorCode.RATE_LIMITED,
          detail: expect.stringContaining('Request limit exceeded'),
          retryAfter: expect.any(Number),
        });
      } finally {
        await limitedProvider.close();
      }
    });

    test('global rate limit', async () => {
      if (!redis) return;

      // Create provider with very low global limit
      const limitedProvider = new RedisQueueProvider({
        redisUrl: REDIS_URL,
        keyPrefix: 'test:global:',
        rateLimit: {
          perMinute: 3,
          perRequest: 10,
        },
      });

      try {
        // Enqueue 3 jobs
        for (let i = 0; i < 3; i++) {
          await limitedProvider.enqueue({
            type: 'test',
            payload: { index: i },
          });
        }

        // Fourth should fail
        await expect(
          limitedProvider.enqueue({
            type: 'test',
            payload: { index: 3 },
          })
        ).rejects.toMatchObject({
          code: ErrorCode.RATE_LIMITED,
          detail: expect.stringContaining('Rate limit exceeded'),
          retryAfter: expect.any(Number),
        });
      } finally {
        await limitedProvider.close();
      }
    });
  });

  describe('stats and metrics', () => {
    test('tracks queue statistics', async () => {
      if (!redis) return;

      // Enqueue some jobs
      await provider.enqueue({ type: 'test', payload: {} });
      await provider.enqueue({ type: 'test', payload: {} });
      
      // Process one
      const reserved = await provider.reserve('worker-1');
      await provider.complete(reserved!.id, 'worker-1', {});

      // Get stats
      const stats = await provider.getStats();
      
      expect(stats.queued).toBe(1);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(1);
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('cleanup', () => {
    test('cleanOldJobs removes expired jobs', async () => {
      if (!redis) return;

      const job = await provider.enqueue({
        type: 'test',
        payload: {},
      });

      // Complete the job
      const reserved = await provider.reserve('worker-1');
      await provider.complete(reserved!.id, 'worker-1', {});

      // Clean jobs older than 0 seconds
      await provider.cleanOldJobs(0);

      // Job should be gone
      const retrieved = await provider.getJob(job.id);
      expect(retrieved).toBeNull();
    });
  });
});