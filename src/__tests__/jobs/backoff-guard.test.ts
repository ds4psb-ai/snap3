/**
 * Backoff Guard Unit Tests
 * Ensures exponential backoff timing accuracy within ±50ms tolerance
 */

import { calculateBackoffMs, RetryPolicy } from '@/lib/jobs/providers';
import { InMemoryQueueProvider } from '@/lib/jobs/providers/inmemory';
import { JobStatus } from '@/lib/jobs/types';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode } from '@/lib/errors/codes';

describe('Backoff Guard - Timing Accuracy', () => {
  const TOLERANCE_MS = 50; // ±50ms tolerance

  describe('calculateBackoffMs', () => {
    it('should calculate exponential backoff correctly', () => {
      const policy: RetryPolicy = {
        maxAttempts: 5,
        backoffStrategy: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 60000,
      };

      // Test exponential progression: 1s, 2s, 4s, 8s, 16s
      expect(calculateBackoffMs(1, policy)).toBe(1000);
      expect(calculateBackoffMs(2, policy)).toBe(2000);
      expect(calculateBackoffMs(3, policy)).toBe(4000);
      expect(calculateBackoffMs(4, policy)).toBe(8000);
      expect(calculateBackoffMs(5, policy)).toBe(16000);
    });

    it('should respect maxDelayMs cap', () => {
      const policy: RetryPolicy = {
        maxAttempts: 10,
        backoffStrategy: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      };

      // Should hit the cap at 10s
      expect(calculateBackoffMs(5, policy)).toBe(10000); // Would be 16s without cap
      expect(calculateBackoffMs(6, policy)).toBe(10000); // Would be 32s without cap
      expect(calculateBackoffMs(7, policy)).toBe(10000); // Would be 64s without cap
    });

    it('should calculate linear backoff correctly', () => {
      const policy: RetryPolicy = {
        maxAttempts: 5,
        backoffStrategy: 'linear',
        initialDelayMs: 1000,
        maxDelayMs: 60000,
      };

      // Test linear progression: 1s, 2s, 3s, 4s, 5s
      expect(calculateBackoffMs(1, policy)).toBe(1000);
      expect(calculateBackoffMs(2, policy)).toBe(2000);
      expect(calculateBackoffMs(3, policy)).toBe(3000);
      expect(calculateBackoffMs(4, policy)).toBe(4000);
      expect(calculateBackoffMs(5, policy)).toBe(5000);
    });

    it('should use fixed delay for fixed strategy', () => {
      const policy: RetryPolicy = {
        maxAttempts: 5,
        backoffStrategy: 'fixed',
        initialDelayMs: 2000,
        maxDelayMs: 60000,
      };

      // Should always return the same delay
      expect(calculateBackoffMs(1, policy)).toBe(2000);
      expect(calculateBackoffMs(2, policy)).toBe(2000);
      expect(calculateBackoffMs(3, policy)).toBe(2000);
      expect(calculateBackoffMs(4, policy)).toBe(2000);
      expect(calculateBackoffMs(5, policy)).toBe(2000);
    });
  });

  describe('Backoff Timing with ±50ms Tolerance', () => {
    let provider: InMemoryQueueProvider;
    let startTime: number;

    beforeEach(() => {
      provider = new InMemoryQueueProvider();
      startTime = Date.now();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should enforce backoff period within ±50ms tolerance', async () => {
      const idempotencyKey = 'test-backoff-timing';
      const retryPolicy: RetryPolicy = {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      };

      // Enqueue job with retry policy
      const job = await provider.enqueue({
        type: 'test',
        payload: { test: 'data' },
        idempotencyKey,
        retryPolicy,
      });

      // Reserve and fail the job
      const reserved = await provider.reserve('worker-1');
      expect(reserved?.id).toBe(job.id);

      await provider.fail(job.id, 'worker-1', {
        message: 'Test failure',
        code: 'TEST_ERROR',
      });

      // Attempt to enqueue immediately - should fail with rate limit
      await expect(
        provider.enqueue({
          type: 'test',
          payload: { test: 'data' },
          idempotencyKey,
        })
      ).rejects.toThrow(AppError);

      // Advance time to just before backoff expires (1000ms - 50ms tolerance)
      jest.advanceTimersByTime(950);

      // Should still be rate limited
      await expect(
        provider.enqueue({
          type: 'test',
          payload: { test: 'data' },
          idempotencyKey,
        })
      ).rejects.toThrow(AppError);

      // Advance to exactly the backoff time
      jest.advanceTimersByTime(50);

      // Should now succeed (within tolerance)
      const retryJob = await provider.enqueue({
        type: 'test',
        payload: { test: 'data' },
        idempotencyKey,
        retryPolicy,
      });
      expect(retryJob).toBeDefined();
    });

    it('should calculate correct backoff for multiple failures', async () => {
      const idempotencyKey = 'test-multiple-backoff';
      const retryPolicy: RetryPolicy = {
        maxAttempts: 4,
        backoffStrategy: 'exponential',
        initialDelayMs: 500,
        maxDelayMs: 10000,
      };

      // Expected delays: 500ms, 1000ms, 2000ms
      const expectedDelays = [500, 1000, 2000];

      for (let attempt = 0; attempt < expectedDelays.length; attempt++) {
        // Enqueue job
        const job = await provider.enqueue({
          type: 'test',
          payload: { attempt },
          idempotencyKey,
          retryPolicy,
        });

        // Reserve and fail
        const reserved = await provider.reserve('worker-1');
        expect(reserved?.id).toBe(job.id);

        await provider.fail(job.id, 'worker-1', {
          message: `Failure ${attempt + 1}`,
          code: 'TEST_ERROR',
        });

        // Verify rate limit with correct retryAfter
        try {
          await provider.enqueue({
            type: 'test',
            payload: { attempt },
            idempotencyKey,
          });
          fail('Should have thrown rate limit error');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          const appError = error as AppError;
          expect(appError.code).toBe(ErrorCode.RATE_LIMITED);
          
          // Verify retryAfter is within tolerance
          const expectedRetryAfter = Math.ceil(expectedDelays[attempt] / 1000);
          expect(appError.retryAfter).toBeGreaterThanOrEqual(expectedRetryAfter - 1);
          expect(appError.retryAfter).toBeLessThanOrEqual(expectedRetryAfter + 1);
        }

        // Advance time past the backoff period
        jest.advanceTimersByTime(expectedDelays[attempt] + TOLERANCE_MS);
      }
    });

    it('should handle edge case of immediate retry after backoff expires', async () => {
      const idempotencyKey = 'test-edge-case';
      const retryPolicy: RetryPolicy = {
        maxAttempts: 2,
        backoffStrategy: 'fixed',
        initialDelayMs: 2000,
        maxDelayMs: 10000,
      };

      // First attempt
      const job1 = await provider.enqueue({
        type: 'test',
        payload: { attempt: 1 },
        idempotencyKey,
        retryPolicy,
      });

      const reserved1 = await provider.reserve('worker-1');
      await provider.fail(job1.id, 'worker-1', {
        message: 'First failure',
        code: 'TEST_ERROR',
      });

      // Advance exactly to backoff expiry
      jest.advanceTimersByTime(2000);

      // Should succeed immediately at expiry
      const job2 = await provider.enqueue({
        type: 'test',
        payload: { attempt: 2 },
        idempotencyKey,
        retryPolicy,
      });
      expect(job2).toBeDefined();

      // Complete the job this time
      const reserved2 = await provider.reserve('worker-1');
      await provider.complete(job2.id, 'worker-1', { success: true });

      // Verify job is completed
      const finalJob = await provider.getJob(job2.id);
      expect(finalJob?.status).toBe(JobStatus.COMPLETED);
    });

    it('should maintain accurate timing across different backoff strategies', async () => {
      const strategies: Array<{ 
        strategy: RetryPolicy['backoffStrategy']; 
        expectedDelays: number[] 
      }> = [
        { strategy: 'exponential', expectedDelays: [100, 200, 400] },
        { strategy: 'linear', expectedDelays: [100, 200, 300] },
        { strategy: 'fixed', expectedDelays: [100, 100, 100] },
      ];

      for (const { strategy, expectedDelays } of strategies) {
        // Test each strategy independently with clean provider
        const testProvider = new InMemoryQueueProvider();
        
        for (let i = 0; i < expectedDelays.length; i++) {
          const idempotencyKey = `test-${strategy}-${i}`;
          const retryPolicy: RetryPolicy = {
            maxAttempts: 4,
            backoffStrategy: strategy,
            initialDelayMs: 100,
            maxDelayMs: 1000,
          };
          
          const job = await testProvider.enqueue({
            type: 'test',
            payload: { strategy, attempt: i },
            idempotencyKey,
            retryPolicy,
          });

          const reserved = await testProvider.reserve('worker-1');
          expect(reserved?.id).toBe(job.id);
          
          await testProvider.fail(job.id, 'worker-1', {
            message: `${strategy} failure ${i}`,
            code: 'TEST_ERROR',
          });

          // Immediately after failure should be rate limited
          await expect(
            testProvider.enqueue({
              type: 'test',
              payload: { strategy },
              idempotencyKey,
            })
          ).rejects.toThrow(AppError);

          // Advance to just before expected delay expires
          jest.advanceTimersByTime(expectedDelays[i] - 10);

          // Should still be rate limited (within tolerance)
          await expect(
            testProvider.enqueue({
              type: 'test',
              payload: { strategy },
              idempotencyKey,
            })
          ).rejects.toThrow(AppError);

          // Advance past the backoff period
          jest.advanceTimersByTime(20);

          // Should now succeed (past backoff + tolerance)
          const retryJob = await testProvider.enqueue({
            type: 'test',
            payload: { strategy, retry: true },
            idempotencyKey,
            retryPolicy,
          });
          expect(retryJob).toBeDefined();

          // Complete the job
          const reserved2 = await testProvider.reserve('worker-1');
          expect(reserved2?.id).toBe(retryJob.id);
          await testProvider.complete(retryJob.id, 'worker-1', { success: true });
        }
      }
    });
  });
});