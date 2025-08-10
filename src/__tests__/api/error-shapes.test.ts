import { problemResponse, Problems } from '@/lib/errors/problem';
import { ErrorCode } from '@/lib/errors/codes';

describe('Error Shapes Tests', () => {
  describe('Common error response shapes', () => {
    it('403 Forbidden includes all required Problem+JSON fields', async () => {
      const response = problemResponse(ErrorCode.FORBIDDEN, {
        detail: 'Access denied to resource',
        instance: '/api/test/123',
      });

      expect(response.status).toBe(403);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');

      const bodyText = await response.text();
      const body = JSON.parse(bodyText);
      
      // RFC 9457 required fields
      expect(body.type).toBe('https://api.snap3.com/problems/forbidden');
      expect(body.title).toBe('Access forbidden');
      expect(body.status).toBe(403);
      expect(body.code).toBe('FORBIDDEN');
      
      // Extended fields
      expect(body.detail).toBe('Access denied to resource');
      expect(body.instance).toBe('/api/test/123');
      expect(body.timestamp).toBeDefined();
      expect(body.traceId).toBeDefined();
      expect(body.fix).toBe('Check permissions for this resource.');
      
      // Timestamp should be ISO 8601
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
      
      // TraceId should have expected format
      expect(body.traceId).toMatch(/^\d+-[a-z0-9]{7}$/);
    });

    it('404 Not Found includes all required Problem+JSON fields', async () => {
      const response = problemResponse(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: 'Brief with ID xyz not found',
        instance: '/api/export/brief/xyz',
      });

      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');

      const bodyText = await response.text();
      const body = JSON.parse(bodyText);
      
      expect(body.type).toBe('https://api.snap3.com/problems/not-found');
      expect(body.title).toBe('Resource not found');
      expect(body.status).toBe(404);
      expect(body.code).toBe('RESOURCE_NOT_FOUND');
      expect(body.detail).toBe('Brief with ID xyz not found');
      expect(body.instance).toBe('/api/export/brief/xyz');
      expect(body.timestamp).toBeDefined();
      expect(body.traceId).toBeDefined();
      expect(body.fix).toBe('Check resource ID and try again.');
    });

    it('429 Rate Limited includes Retry-After header and field', async () => {
      const retryAfter = 120;
      const response = problemResponse(ErrorCode.RATE_LIMITED, {
        retryAfter,
        instance: '/api/snap3/turbo',
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');
      expect(response.headers.get('Retry-After')).toBe('120');

      const bodyText = await response.text();
      const body = JSON.parse(bodyText);
      
      expect(body.type).toBe('https://api.snap3.com/problems/rate-limited');
      expect(body.title).toBe('Too many requests');
      expect(body.status).toBe(429);
      expect(body.code).toBe('RATE_LIMITED');
      expect(body.retryAfter).toBe(120);
      expect(body.instance).toBe('/api/snap3/turbo');
      expect(body.timestamp).toBeDefined();
      expect(body.traceId).toBeDefined();
      expect(body.fix).toBe('Backoff per headers.');
    });

    it('429 Provider Quota includes default Retry-After when not specified', async () => {
      const response = problemResponse(ErrorCode.PROVIDER_QUOTA_EXCEEDED, {
        detail: 'Veo3 API quota exceeded',
        instance: '/api/preview/veo',
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');
      expect(response.headers.get('Retry-After')).toBe('3600'); // Default from ERROR_META

      const bodyText = await response.text();
      const body = JSON.parse(bodyText);
      
      expect(body.type).toBe('https://api.snap3.com/problems/provider-quota');
      expect(body.title).toBe('Provider quota exceeded');
      expect(body.status).toBe(429);
      expect(body.code).toBe('PROVIDER_QUOTA_EXCEEDED');
      expect(body.retryAfter).toBe(3600);
      expect(body.detail).toBe('Veo3 API quota exceeded');
      expect(body.timestamp).toBeDefined();
      expect(body.traceId).toBeDefined();
    });

    it('400 Validation Error includes violations array', () => {
      const violations = [
        { field: 'duration', message: 'Must be 8 seconds', code: 'INVALID_DURATION' },
        { field: 'fps', message: 'Must be at least 30', code: 'LOW_FPS' },
      ];

      const problem = Problems.validation(violations);

      expect(problem.status).toBe(400);
      expect(problem.code).toBe('VALIDATION_ERROR');
      
      expect(problem.type).toBe('https://api.snap3.com/problems/validation-error');
      expect(problem.title).toBe('Validation error');
      expect(problem.status).toBe(400);
      expect(problem.code).toBe('VALIDATION_ERROR');
      expect(problem.violations).toEqual(violations);
      expect(problem.detail).toBe('Validation failed for 2 field(s)');
      expect(problem.timestamp).toBeDefined();
      expect(problem.traceId).toBeDefined();
    });

    it('422 QA Violation includes violations and custom detail', async () => {
      const violations = [
        { field: 'hook', message: 'Hook must be ≤3s', code: 'HOOK_TOO_LONG' },
        { field: 'safezones', message: 'Content outside safe zones', code: 'SAFEZONE_VIOLATION' },
      ];

      const response = problemResponse(ErrorCode.QA_RULE_VIOLATION, {
        detail: 'Video failed quality checks',
        violations,
        instance: '/api/qa/validate',
      });

      expect(response.status).toBe(422);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');

      const bodyText = await response.text();
      const body = JSON.parse(bodyText);
      
      expect(body.type).toBe('https://api.snap3.com/problems/qa-violation');
      expect(body.title).toBe('QA validation failed');
      expect(body.status).toBe(422);
      expect(body.code).toBe('QA_RULE_VIOLATION');
      expect(body.violations).toEqual(violations);
      expect(body.detail).toBe('Video failed quality checks');
      expect(body.fix).toBe('Fix Hook≤3s, safezones, fps/bitrate; re-run QA.');
      expect(body.timestamp).toBeDefined();
      expect(body.traceId).toBeDefined();
    });
  });

  describe('Problem response consistency', () => {
    it('all Problem responses have timestamp in ISO 8601 format', async () => {
      const errorCodes = [
        ErrorCode.VALIDATION_ERROR,
        ErrorCode.UNAUTHORIZED,
        ErrorCode.FORBIDDEN,
        ErrorCode.RESOURCE_NOT_FOUND,
        ErrorCode.RATE_LIMITED,
      ];

      for (const code of errorCodes) {
        const response = problemResponse(code);
        const bodyText = await response.text();
        const body = JSON.parse(bodyText);
        
        expect(body.timestamp).toBeDefined();
        expect(() => new Date(body.timestamp)).not.toThrow();
        expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
      }
    });

    it('all Problem responses have unique traceId', async () => {
      const traceIds = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        const response = problemResponse(ErrorCode.VALIDATION_ERROR);
        const bodyText = await response.text();
        const body = JSON.parse(bodyText);
        
        expect(body.traceId).toBeDefined();
        expect(traceIds.has(body.traceId)).toBe(false);
        traceIds.add(body.traceId);
      }
    });

    it('all Problem responses have correct Content-Type header', () => {
      const errorCodes = Object.values(ErrorCode) as ErrorCode[];

      errorCodes.forEach(code => {
        const response = problemResponse(code);
        expect(response.headers.get('Content-Type')).toBe('application/problem+json');
      });
    });
  });
});