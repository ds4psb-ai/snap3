/**
 * Problem+JSON Adapter Tests
 * Ensures RFC 9457 compliance and proper 429 response handling
 */

import { ProviderErrorAdapter, ProviderErrorType, withProviderErrorHandling } from '@/lib/errors/provider-adapter';
import { ErrorCode } from '@/lib/errors/codes';
import { AppError } from '@/lib/errors/app-error';
import { InMemoryQueueProvider } from '@/lib/jobs/providers/inmemory';
import { FakeDurableQueueProvider } from '@/lib/jobs/providers/fake-durable';

describe('Problem+JSON Adapter - RFC 9457 Compliance', () => {
  let adapter: ProviderErrorAdapter;

  beforeEach(() => {
    adapter = new ProviderErrorAdapter('test-trace-123');
  });

  describe('RFC 9457 Structure Validation', () => {
    it('should include all required Problem Details fields', () => {
      const problem = adapter.toProblem(
        ProviderErrorType.RATE_LIMITED,
        {
          provider: 'TestProvider',
          originalError: { message: 'Rate limit exceeded' },
        },
        '/api/test'
      );

      // Required fields
      expect(problem.type).toBeDefined();
      expect(problem.title).toBeDefined();
      expect(problem.status).toBeDefined();
      expect(problem.code).toBeDefined();

      // Optional but recommended fields
      expect(problem.detail).toBeDefined();
      expect(problem.instance).toBe('/api/test');
      expect(problem.timestamp).toBeDefined();
      expect(problem.traceId).toBe('test-trace-123');
    });

    it('should use correct Content-Type header', () => {
      const response = adapter.toResponse(
        ProviderErrorType.RATE_LIMITED,
        { provider: 'TestProvider' }
      );

      expect(response.headers.get('Content-Type')).toBe('application/problem+json');
    });

    it('should map error codes to correct HTTP status', () => {
      const testCases: Array<[ProviderErrorType, number]> = [
        [ProviderErrorType.RATE_LIMITED, 429],
        [ProviderErrorType.QUOTA_EXCEEDED, 429],
        [ProviderErrorType.UNAUTHORIZED, 401],
        [ProviderErrorType.FORBIDDEN, 403],
        [ProviderErrorType.RESOURCE_NOT_FOUND, 404],
        [ProviderErrorType.CONFLICT, 409],
        [ProviderErrorType.VALIDATION_ERROR, 400],
        [ProviderErrorType.SERVICE_UNAVAILABLE, 503],
      ];

      for (const [errorType, expectedStatus] of testCases) {
        const response = adapter.toResponse(errorType, { provider: 'Test' });
        expect(response.status).toBe(expectedStatus);
      }
    });
  });

  describe('429 Rate Limit Response Handling', () => {
    it('should include Retry-After header for rate limit errors', () => {
      const response = adapter.toResponse(
        ProviderErrorType.RATE_LIMITED,
        {
          provider: 'TestProvider',
          originalError: { retryAfter: 30 },
        }
      );

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('30');
    });

    it('should include retryAfter in response body', async () => {
      const response = adapter.toResponse(
        ProviderErrorType.RATE_LIMITED,
        {
          provider: 'TestProvider',
          originalError: { retryAfter: 45 },
        }
      );

      const body = await response.json();
      expect(body.retryAfter).toBe(45);
      expect(body.code).toBe(ErrorCode.RATE_LIMITED);
    });

    it('should handle quota exceeded with appropriate retry time', () => {
      const response = adapter.toResponse(
        ProviderErrorType.QUOTA_EXCEEDED,
        {
          provider: 'TestProvider',
          originalError: { retryAfter: 3600 },
        }
      );

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('3600');
    });

    it('should extract retryAfter from various formats', () => {
      const testCases = [
        { retryAfter: 60 },
        { retry_after: 90 },
        { retryAfterSeconds: 120 },
        { retryAfterMs: 45000 }, // Should convert to 45 seconds
        { headers: { 'retry-after': '180' } },
        { headers: { 'Retry-After': '240' } },
        { headers: { 'x-retry-after': '300' } },
      ];

      for (const originalError of testCases) {
        const problem = adapter.toProblem(
          ProviderErrorType.RATE_LIMITED,
          { provider: 'Test', originalError }
        );

        expect(problem.retryAfter).toBeGreaterThan(0);
      }
    });

    it('should provide default retryAfter values', () => {
      // Rate limited without explicit retry-after
      const rateLimitProblem = adapter.toProblem(
        ProviderErrorType.RATE_LIMITED,
        { provider: 'Test', originalError: {} }
      );
      expect(rateLimitProblem.retryAfter).toBe(60);

      // Quota exceeded without explicit retry-after
      const quotaProblem = adapter.toProblem(
        ProviderErrorType.QUOTA_EXCEEDED,
        { provider: 'Test', originalError: {} }
      );
      expect(quotaProblem.retryAfter).toBe(3600);
    });
  });

  describe('Provider-Specific Error Mapping', () => {
    it('should handle SQS errors correctly', async () => {
      const sqsErrors = [
        { code: 'ThrottlingException', expectedType: ErrorCode.RATE_LIMITED },
        { code: 'OverLimit', expectedType: ErrorCode.RATE_LIMITED },
        { code: 'ServiceUnavailable', expectedType: ErrorCode.SERVICE_UNAVAILABLE },
        { code: 'AccessDenied', expectedType: ErrorCode.FORBIDDEN },
        { code: 'QueueDoesNotExist', expectedType: ErrorCode.RESOURCE_NOT_FOUND },
      ];

      for (const { code, expectedType } of sqsErrors) {
        const response = adapter.fromSQSError(
          { code, message: `SQS error: ${code}` },
          '/api/queue/sqs'
        );
        
        const body = await response.json();
        expect(body.code).toBe(expectedType);
        expect(body.detail).toContain('SQS');
      }
    });

    it('should handle Redis/Upstash errors correctly', async () => {
      const redisErrors = [
        { message: 'Rate limit exceeded', expectedType: ErrorCode.RATE_LIMITED },
        { message: 'Quota limit exceeded', expectedType: ErrorCode.PROVIDER_QUOTA_EXCEEDED },
        { message: 'Connection timeout', expectedType: ErrorCode.TIMEOUT },
        { message: 'NOAUTH Authentication required', expectedType: ErrorCode.UNAUTHORIZED },
      ];

      for (const { message, expectedType } of redisErrors) {
        const response = adapter.fromRedisError(
          { message },
          '/api/queue/redis'
        );
        
        const body = await response.json();
        expect(body.code).toBe(expectedType);
        expect(body.detail).toContain('Redis');
      }
    });

    it('should handle Upstash rate limit headers', async () => {
      const response = adapter.fromRedisError(
        {
          message: 'Request failed',
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Date.now() + 60000),
          },
        },
        '/api/queue/upstash'
      );

      expect(response.status).toBe(429);
      const retryAfter = response.headers.get('Retry-After');
      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter!, 10)).toBeGreaterThan(0);
      expect(parseInt(retryAfter!, 10)).toBeLessThanOrEqual(60);
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve provider context in error details', async () => {
      const response = adapter.toResponse(
        ProviderErrorType.RATE_LIMITED,
        {
          provider: 'CustomProvider',
          originalError: { message: 'Custom rate limit' },
          context: {
            queue: 'high-priority',
            region: 'us-east-1',
            attempt: 3,
          },
        }
      );

      const body = await response.json();
      expect(body.detail).toContain('CustomProvider');
      expect(body.detail).toContain('queue="high-priority"');
      expect(body.detail).toContain('region="us-east-1"');
      expect(body.detail).toContain('attempt=3');
    });

    it('should include trace ID for request correlation', async () => {
      const response = adapter.toResponse(
        ProviderErrorType.INTERNAL_ERROR,
        { provider: 'Test' }
      );

      const body = await response.json();
      expect(body.traceId).toBe('test-trace-123');
    });
  });

  describe('withProviderErrorHandling Middleware', () => {
    it('should wrap provider operations with error handling', async () => {
      // Successful operation
      const result = await withProviderErrorHandling(
        'TestProvider',
        async () => 'success',
        '/api/test'
      );
      expect(result).toBe('success');

      // Failed operation with rate limit
      await expect(
        withProviderErrorHandling(
          'TestProvider',
          async () => {
            throw { status: 429, message: 'Rate limited' };
          },
          '/api/test'
        )
      ).rejects.toThrow(AppError);
    });

    it('should enhance AppError with provider context', async () => {
      try {
        await withProviderErrorHandling(
          'TestProvider',
          async () => {
            throw new AppError(ErrorCode.RATE_LIMITED, {
              detail: 'Too many requests',
              retryAfter: 30,
            });
          },
          '/api/test'
        );
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        const appError = error as AppError;
        expect(appError.detail).toContain('TestProvider');
        expect(appError.retryAfter).toBe(30);
      }
    });

    it('should detect and convert provider errors', async () => {
      const errorScenarios = [
        { error: { status: 429 }, expectedCode: ErrorCode.RATE_LIMITED },
        { error: { statusCode: 403 }, expectedCode: ErrorCode.FORBIDDEN },
        { error: { code: 'QUOTA_EXCEEDED' }, expectedCode: ErrorCode.PROVIDER_QUOTA_EXCEEDED },
        { error: { code: 'ThrottlingException' }, expectedCode: ErrorCode.RATE_LIMITED },
      ];

      for (const { error, expectedCode } of errorScenarios) {
        try {
          await withProviderErrorHandling(
            'TestProvider',
            async () => { throw error; },
            '/api/test'
          );
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appError = err as AppError;
          expect(appError.code).toBe(expectedCode);
        }
      }
    });
  });

  describe('Integration with Queue Providers', () => {
    it('should handle InMemoryQueueProvider rate limits correctly', async () => {
      const provider = new InMemoryQueueProvider();
      const idempotencyKey = 'test-rate-limit';

      // Enqueue with retry policy
      const job = await provider.enqueue({
        type: 'test',
        payload: { test: 'data' },
        idempotencyKey,
        retryPolicy: {
          maxAttempts: 2,
          backoffStrategy: 'fixed',
          initialDelayMs: 1000,
          maxDelayMs: 5000,
        },
      });

      // Fail the job
      const reserved = await provider.reserve('worker-1');
      await provider.fail(job.id, 'worker-1', {
        message: 'Test failure',
        code: 'TEST_ERROR',
      });

      // Try to enqueue again - should get rate limited
      try {
        await provider.enqueue({
          type: 'test',
          payload: { test: 'data' },
          idempotencyKey,
        });
        fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        const appError = error as AppError;
        expect(appError.code).toBe(ErrorCode.RATE_LIMITED);
        expect(appError.retryAfter).toBeDefined();
        expect(appError.retryAfter).toBeGreaterThan(0);
        
        // Convert to Problem response
        const response = adapter.fromAppError(appError, 'InMemory');
        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBeDefined();
        
        const body = await response.json();
        expect(body.type).toContain('rate-limited');
        expect(body.status).toBe(429);
        expect(body.retryAfter).toBe(appError.retryAfter);
      }
    });

    it('should handle FakeDurableQueueProvider failures correctly', async () => {
      const provider = new FakeDurableQueueProvider({
        simulatedLatencyMs: 0,
        simulateFailures: true,
        failureRate: 1.0, // Always fail for testing
      });

      try {
        await provider.enqueue({
          type: 'test',
          payload: { test: 'data' },
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        const appError = error as AppError;
        
        // Convert to Problem response
        const response = adapter.fromAppError(appError, 'FakeDurable');
        const body = await response.json();
        
        expect(body.type).toBeDefined();
        expect(body.title).toBeDefined();
        expect(body.status).toBeGreaterThanOrEqual(400);
        expect(body.code).toBeDefined();
        expect(body.detail).toContain('FakeDurable');
      }
    });
  });

  describe('Problem Details Fix Instructions', () => {
    it('should include actionable fix instructions', async () => {
      const errorTypes = [
        ProviderErrorType.RATE_LIMITED,
        ProviderErrorType.QUOTA_EXCEEDED,
        ProviderErrorType.VALIDATION_ERROR,
        ProviderErrorType.AUTHENTICATION_FAILED,
      ];

      for (const errorType of errorTypes) {
        const response = adapter.toResponse(
          errorType,
          { provider: 'Test' }
        );
        
        const body = await response.json();
        expect(body.fix).toBeDefined();
        expect(body.fix.length).toBeGreaterThan(0);
      }
    });
  });
});