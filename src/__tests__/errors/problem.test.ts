/**
 * Tests for RFC 9457 Problem Details implementation
 */

import { ErrorCode } from '@/lib/errors/codes';
import { buildProblemJSON, problemResponse, Problems, ProblemDetails } from '@/lib/errors/problem';
import { AppError } from '@/lib/errors/app-error';
import { ZodError, z } from 'zod';
import { zodErrorToViolations } from '@/lib/errors/zod-to-violations';

describe('Problem Details builder', () => {
  test('builds 422 with problem+json', async () => {
    const res = problemResponse(ErrorCode.INVALID_DURATION, { detail: 'Expected 8' });
    expect(res.status).toBe(422);
    expect(res.headers.get('Content-Type')).toMatch(/application\/problem\+json/);
    
    const body = await res.json();
    expect(body.code).toBe('INVALID_DURATION');
    expect(body.detail).toBe('Expected 8');
    expect(body.status).toBe(422);
    expect(body.type).toBe('https://api.snap3.com/problems/invalid-duration');
    expect(body.title).toBe('Preview duration must be 8 seconds');
    expect(body.fix).toBe('Set duration to exactly 8.0 seconds and re-validate.');
  });

  test('sets Retry-After for 429', async () => {
    const res = problemResponse(ErrorCode.RATE_LIMITED, { retryAfter: 30 });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
    
    const body = await res.json();
    expect(body.retryAfter).toBe(30);
    expect(body.code).toBe('RATE_LIMITED');
  });

  test('sets Retry-After for provider quota exceeded', async () => {
    const res = problemResponse(ErrorCode.PROVIDER_QUOTA_EXCEEDED, { retryAfter: 3600 });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('3600');
    
    const body = await res.json();
    expect(body.retryAfter).toBe(3600);
  });

  test('includes violations for validation errors', async () => {
    const violations = [
      { field: 'duration', message: 'Must be 8 seconds', code: 'INVALID_DURATION' },
      { field: 'aspect', message: 'Must be 16:9', code: 'INVALID_ASPECT' },
    ];
    
    const problem = ProblemDetails.validation(violations);
    expect(problem.status).toBe(400);
    expect(problem.code).toBe('VALIDATION_ERROR');
    expect(problem.violations).toHaveLength(2);
    expect(problem.violations![0]).toEqual(violations[0]);
    expect(problem.violations![1]).toEqual(violations[1]);
  });

  test('includes timestamp and traceId', async () => {
    const res = problemResponse(ErrorCode.INTERNAL_ERROR);
    const bodyText = await res.text();
    const body = JSON.parse(bodyText);
    
    expect(body.timestamp).toBeDefined();
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(body.traceId).toBeDefined();
    expect(body.traceId).toMatch(/^\d+-[a-z0-9]+$/);
  });
});

describe('Problem factory functions', () => {
  test('creates not found problem', () => {
    const problem = ProblemDetails.notFound('Resource \'video-123\' not found');
    expect(problem.status).toBe(404);
    expect(problem.code).toBe('RESOURCE_NOT_FOUND');
    expect(problem.detail).toBe("Resource 'video-123' not found");
  });

  test('creates rate limited problem', () => {
    const problem = ProblemDetails.tooManyRequests('Rate limit exceeded', 60);
    expect(problem.status).toBe(429);
    expect(problem.code).toBe('RATE_LIMITED');
    expect(problem.retryAfter).toBe(60);
  });

  test('creates invalid duration problem', () => {
    const problem = ProblemDetails.invalidDuration(10);
    expect(problem.status).toBe(422);
    expect(problem.code).toBe('INVALID_DURATION');
    expect(problem.detail).toBe('Duration must be exactly 8 seconds, got 10');
    expect(problem.violations).toHaveLength(1);
    expect(problem.violations![0].field).toBe('duration');
  });

  test('creates unsupported aspect ratio problem', () => {
    const problem = ProblemDetails.unsupportedAspectRatio('9:16');
    expect(problem.status).toBe(422);
    expect(problem.code).toBe('UNSUPPORTED_AR_FOR_PREVIEW');
    expect(problem.detail).toContain('9:16');
    expect(problem.detail).toContain('16:9');
  });

  test('creates QA violation problem', () => {
    const violations = [
      { field: 'hook', message: 'Hook must be ≤3 seconds', code: 'HOOK_TOO_LONG' },
      { field: 'fps', message: 'FPS must be ≥30', code: 'FPS_TOO_LOW' },
    ];
    
    const problem = ProblemDetails.qaViolation(violations);
    expect(problem.status).toBe(422);
    expect(problem.code).toBe('QA_RULE_VIOLATION');
    expect(problem.violations).toEqual(violations);
  });

  // Note: providerQuotaExceeded and embedDenied are not in the base Problems object
  // These are available in ApiProblems for API routes
});

describe('AppError', () => {
  test('creates AppError with error code', () => {
    const error = new AppError(ErrorCode.INVALID_DURATION, {
      detail: 'Duration was 10 seconds',
    });
    
    expect(error.code).toBe(ErrorCode.INVALID_DURATION);
    expect(error.status).toBe(422);
    expect(error.detail).toBe('Duration was 10 seconds');
    expect(error.fix).toBe('Set duration to exactly 8.0 seconds and re-validate.');
  });

  test('checks if error is retryable', () => {
    const retryableError = new AppError(ErrorCode.RATE_LIMITED);
    const nonRetryableError = new AppError(ErrorCode.VALIDATION_ERROR);
    
    expect(retryableError.isRetryable()).toBe(true);
    expect(nonRetryableError.isRetryable()).toBe(false);
  });

  test('converts to Problem Details format', () => {
    const error = new AppError(ErrorCode.QA_RULE_VIOLATION, {
      detail: 'Multiple violations',
      violations: [
        { field: 'hook', message: 'Too long', code: 'HOOK_TOO_LONG' },
      ],
    });
    
    const problem = error.toProblemDetails();
    
    expect(problem.type).toBe('https://api.snap3.com/problems/qa-violation');
    expect(problem.title).toBe('QA validation failed');
    expect(problem.status).toBe(422);
    expect(problem.detail).toBe('Multiple violations');
    expect(problem.violations).toHaveLength(1);
  });
});

describe('Zod Error Transformation', () => {
  test('transforms ZodError to violations', () => {
    const schema = z.object({
      duration: z.number().refine(val => val === 8, 'Must be 8 seconds'),
      aspect: z.enum(['16:9']),
    });
    
    try {
      schema.parse({ duration: 10, aspect: '9:16' });
    } catch (error) {
      if (error instanceof ZodError) {
        const violations = zodErrorToViolations(error);
        
        expect(violations).toHaveLength(2);
        expect(violations[0].field).toBe('duration');
        expect(violations[0].message).toBe('Must be 8 seconds');
        expect(violations[1].field).toBe('aspect');
      }
    }
  });

  test('handles nested paths', () => {
    const schema = z.object({
      video: z.object({
        settings: z.object({
          duration: z.number(),
        }),
      }),
    });
    
    try {
      schema.parse({ video: { settings: { duration: 'invalid' } } });
    } catch (error) {
      if (error instanceof ZodError) {
        const violations = zodErrorToViolations(error);
        
        expect(violations[0].field).toBe('video.settings.duration');
      }
    }
  });

  test('handles root level errors', () => {
    const schema = z.string();
    
    try {
      schema.parse(123);
    } catch (error) {
      if (error instanceof ZodError) {
        const violations = zodErrorToViolations(error);
        
        expect(violations[0].field).toBe('root');
      }
    }
  });
});