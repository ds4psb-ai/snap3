import { describe, it, expect, jest } from '@jest/globals';

// Mock the route handlers
const mockGET = jest.fn();

jest.unstable_mockModule('@/app/api/export/brief/[id]/route', () => ({
  GET: mockGET,
}));

jest.unstable_mockModule('@/app/api/export/json/[id]/route', () => ({
  GET: mockGET,
}));

describe('Export API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/export/brief/[id]', () => {
    it('returns 200 with brief export for valid ID', async () => {
      const { GET } = await import('@/app/api/export/brief/[id]/route');
      
      const request = new Request('http://localhost:3000/api/export/brief/C0008888', {
        method: 'GET',
      });
      
      const response = await GET(request as any, { params: { id: 'C0008888' } });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('digestId', 'C0008888');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('scenes');
      expect(data).toHaveProperty('evidencePack');
      expect(data).toHaveProperty('exportedAt');
      
      // Verify Evidence Pack structure
      expect(data.evidencePack).toHaveProperty('trustScore');
      expect(data.evidencePack).toHaveProperty('evidenceChips');
      expect(data.evidencePack).toHaveProperty('synthIdDetected');
      expect(data.evidencePack.evidenceChips).toBeInstanceOf(Array);
      expect(data.evidencePack.evidenceChips.length).toBeGreaterThanOrEqual(3);
      expect(data.evidencePack.evidenceChips.length).toBeLessThanOrEqual(5);
    });

    it('returns 404 Problem+JSON for non-existent ID', async () => {
      const { GET } = await import('@/app/api/export/brief/[id]/route');
      
      const request = new Request('http://localhost:3000/api/export/brief/NOTFOUND', {
        method: 'GET',
      });
      
      const response = await GET(request as any, { params: { id: 'NOTFOUND' } });
      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');
      
      const problem = await response.json();
      expect(problem.type).toBeDefined();
      expect(problem.title).toBeDefined();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('returns 400 Problem+JSON for invalid ID format', async () => {
      const { GET } = await import('@/app/api/export/brief/[id]/route');
      
      const request = new Request('http://localhost:3000/api/export/brief/invalid-id', {
        method: 'GET',
      });
      
      const response = await GET(request as any, { params: { id: 'invalid-id' } });
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');
      
      const problem = await response.json();
      expect(problem.type).toBeDefined();
      expect(problem.title).toBeDefined();
      expect(problem.status).toBe(400);
      expect(problem.code).toBe('BAD_REQUEST');
    });

    it('masks VDP_FULL data in evidence pack', async () => {
      const { GET } = await import('@/app/api/export/brief/[id]/route');
      
      const request = new Request('http://localhost:3000/api/export/brief/C0008888', {
        method: 'GET',
      });
      
      const response = await GET(request as any, { params: { id: 'C0008888' } });
      const data = await response.json();
      
      // Should NOT contain VDP_FULL fields
      const jsonStr = JSON.stringify(data);
      expect(jsonStr).not.toContain('overall_analysis');
      expect(jsonStr).not.toContain('audience_reaction');
      expect(jsonStr).not.toContain('notable_comments');
      expect(jsonStr).not.toContain('asr_transcript');
      expect(jsonStr).not.toContain('narrative_unit');
      
      // Should contain only Evidence Pack data
      expect(data.evidencePack).toBeDefined();
      expect(data.evidencePack.trustScore).toBeDefined();
      expect(data.evidencePack.evidenceChips).toBeDefined();
    });
  });

  describe('GET /api/export/json/[id]', () => {
    it('returns 200 with JSON export for valid ID', async () => {
      const { GET } = await import('@/app/api/export/json/[id]/route');
      
      const request = new Request('http://localhost:3000/api/export/json/C0008888', {
        method: 'GET',
      });
      
      const response = await GET(request as any, { params: { id: 'C0008888' } });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('digestId', 'C0008888');
      expect(data).toHaveProperty('videoGenIR');
      expect(data).toHaveProperty('veo3Prompt');
      expect(data).toHaveProperty('evidencePack');
      expect(data).toHaveProperty('exportedAt');
      
      // Verify VideoGenIR constraints
      expect(data.videoGenIR.durationSec).toBe(8);
      expect(data.videoGenIR.aspect).toBe('16:9');
      expect(['720p', '1080p']).toContain(data.videoGenIR.resolution);
      
      // Verify Veo3Prompt constraints
      expect(data.veo3Prompt.duration).toBe(8);
      expect(data.veo3Prompt.aspect).toBe('16:9');
      expect(['720p', '1080p']).toContain(data.veo3Prompt.resolution);
    });

    it('enforces 8s duration constraint', async () => {
      const { GET } = await import('@/app/api/export/json/[id]/route');
      
      const request = new Request('http://localhost:3000/api/export/json/C0008888', {
        method: 'GET',
      });
      
      const response = await GET(request as any, { params: { id: 'C0008888' } });
      const data = await response.json();
      
      // Both IR and Prompt must be exactly 8 seconds
      expect(data.videoGenIR.durationSec).toBe(8);
      expect(data.veo3Prompt.duration).toBe(8);
      
      // Total shot durations should sum to 8
      if (data.veo3Prompt.shots) {
        const totalDuration = data.veo3Prompt.shots.reduce(
          (sum: number, shot: any) => sum + shot.duration, 
          0
        );
        expect(totalDuration).toBe(8);
      }
    });

    it('returns 404 Problem+JSON for non-existent ID', async () => {
      const { GET } = await import('@/app/api/export/json/[id]/route');
      
      const request = new Request('http://localhost:3000/api/export/json/NOTFOUND', {
        method: 'GET',
      });
      
      const response = await GET(request as any, { params: { id: 'NOTFOUND' } });
      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');
      
      const problem = await response.json();
      expect(problem.type).toBeDefined();
      expect(problem.title).toBeDefined();
      expect(problem.status).toBe(404);
      expect(problem.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('includes cache headers in response', async () => {
      const { GET } = await import('@/app/api/export/json/[id]/route');
      
      const request = new Request('http://localhost:3000/api/export/json/C0008888', {
        method: 'GET',
      });
      
      const response = await GET(request as any, { params: { id: 'C0008888' } });
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600');
    });
  });
});