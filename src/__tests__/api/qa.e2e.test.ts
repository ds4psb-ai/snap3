import { POST } from '@/app/api/qa/validate/route';

describe('QA Validation E2E Tests', () => {
  describe('POST /api/qa/validate', () => {
    it('returns 200 with score 100 for perfect input', async () => {
      const perfectInput = {
        duration: 8,
        fps: 30,
        bitrate: 2000000,
        resolution: '1080p',
        aspectRatio: '16:9',
        target: 'reels',
        hookSec: 2.5,
      };

      const request = new Request('http://localhost:3000/api/qa/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(perfectInput),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.pass).toBe(true);
      expect(data.score).toBe(100);
      expect(data.issues).toHaveLength(0);
    });

    it('returns 422 Problem+JSON for invalid input with violations', async () => {
      const invalidInput = {
        duration: 10, // Wrong duration - must be 8
        fps: 20, // Too low for Reels
        bitrate: 400000, // Low bitrate
        resolution: '1080p',
        aspectRatio: '16:9',
        target: 'reels',
        hookSec: 5.0, // Too long
      };

      const request = new Request('http://localhost:3000/api/qa/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidInput),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(422);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');

      const problem = await response.json();
      
      // RFC 9457 required fields
      expect(problem.type).toBe('https://api.snap3.com/problems/qa-violation');
      expect(problem.title).toBe('QA validation failed');
      expect(problem.status).toBe(422);
      expect(problem.code).toBe('QA_RULE_VIOLATION');
      
      // Extended fields
      expect(problem.violations).toBeDefined();
      expect(Array.isArray(problem.violations)).toBe(true);
      expect(problem.violations.length).toBeGreaterThan(0);
      expect(problem.timestamp).toBeDefined();
      expect(problem.traceId).toBeDefined();
      expect(problem.fix).toBe('Fix Hook≤3s, safezones, fps/bitrate; re-run QA.');
      
      // Check violation structure
      problem.violations.forEach((violation: any) => {
        expect(violation).toHaveProperty('field');
        expect(violation).toHaveProperty('message');
        expect(violation).toHaveProperty('code');
      });
    });

    it('returns 400 Problem+JSON for malformed request', async () => {
      const malformedInput = {
        invalidField: 'test',
        // Missing all required fields
      };

      const request = new Request('http://localhost:3000/api/qa/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(malformedInput),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(422);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');

      const problem = await response.json();
      expect(problem.type).toBeDefined();
      expect(problem.title).toBeDefined();
      expect(problem.status).toBe(422);
      expect(problem.code).toBe('QA_RULE_VIOLATION');
      expect(problem.violations).toBeDefined();
      expect(Array.isArray(problem.violations)).toBe(true);
    });

    it('returns 200 with reduced score for minor violations', async () => {
      const inputWithMinorIssues = {
        duration: 8,
        fps: 25, // Slightly below Reels recommendation (30)
        bitrate: 1500000,
        resolution: '720p',
        aspectRatio: '16:9',
        target: 'reels',
        hookSec: 3.0, // Exactly at limit
      };

      const request = new Request('http://localhost:3000/api/qa/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputWithMinorIssues),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.pass).toBe(true);
      expect(data.score).toBeGreaterThan(70);
      expect(data.score).toBeLessThan(100);
      expect(data.issues.length).toBeGreaterThan(0);
      
      // Check issues have correct structure
      data.issues.forEach((issue: any) => {
        expect(issue).toHaveProperty('id');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('message');
        expect(['INFO', 'WARN', 'ERROR']).toContain(issue.severity);
      });
    });
  });

  describe('GET /api/qa/validate', () => {
    it('returns 405 Problem+JSON for GET request', async () => {
      const { GET } = await import('@/app/api/qa/validate/route');
      
      const request = new Request('http://localhost:3000/api/qa/validate', {
        method: 'GET',
      });

      const response = await GET(request as any);
      expect(response.status).toBe(405);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');

      const problem = await response.json();
      expect(problem.type).toBeDefined();
      expect(problem.title).toBeDefined();
      expect(problem.status).toBe(405);
      expect(problem.code).toBe('METHOD_NOT_ALLOWED');
      expect(problem.timestamp).toBeDefined();
      expect(problem.traceId).toBeDefined();
    });
  });
});