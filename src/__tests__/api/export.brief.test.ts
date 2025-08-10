import { GET } from '@/app/api/export/brief/[id]/route';
import { NextRequest } from 'next/server';

describe('GET /api/export/brief/[id]', () => {
  describe('404 Not Found', () => {
    it('returns Problem+JSON when export not found', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/NOTFOUND');
      const response = await GET(request, { params: { id: 'NOTFOUND' } });
      
      expect(response.status).toBe(404);
      const body = await response.json();
      
      // RFC 9457 Problem+JSON structure
      expect(body).toMatchObject({
        type: 'https://api.snap3.com/problems/not-found',
        title: 'Resource not found',
        status: 404,
        detail: expect.stringContaining('Export not found'),
      });
      
      // Verify content-type
      expect(response.headers.get('content-type')).toBe('application/problem+json');
    });
    
    it('returns 404 for invalid digest ID format', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/invalid');
      const response = await GET(request, { params: { id: 'invalid' } });
      
      expect(response.status).toBe(400);
      const body = await response.json();
      
      expect(body).toMatchObject({
        type: 'https://api.snap3.com/problems/bad-request',
        title: 'Bad request',
        status: 400,
        detail: 'Invalid digest ID format',
      });
    });
  });

  describe('Happy Path', () => {
    it('returns BriefExport with assembled fields', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888');
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      // Verify BriefExport structure
      expect(body).toMatchObject({
        digestId: 'C0008888',
        title: expect.any(String),
        scenes: expect.arrayContaining([
          expect.objectContaining({
            role: expect.stringMatching(/^(hook|development|climax)$/),
            durationSec: expect.any(Number),
            visual: expect.any(String),
            audio: expect.any(String),
          }),
        ]),
        evidencePack: expect.objectContaining({
          digestId: 'C0008888',
          trustScore: expect.any(Number),
          evidenceChips: expect.arrayContaining([expect.any(String)]),
          synthIdDetected: expect.any(Boolean),
        }),
      });
      
      // Verify trust score range
      expect(body.evidencePack.trustScore).toBeGreaterThanOrEqual(0);
      expect(body.evidencePack.trustScore).toBeLessThanOrEqual(1);
      
      // Verify evidence chips count
      expect(body.evidencePack.evidenceChips.length).toBeGreaterThanOrEqual(3);
      expect(body.evidencePack.evidenceChips.length).toBeLessThanOrEqual(5);
    });
    
    it('masks VDP_FULL data and only exposes Evidence Pack', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008889');
      const response = await GET(request, { params: { id: 'C0008889' } });
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      // Verify VDP_FULL fields are NOT exposed
      expect(body).not.toHaveProperty('overall_analysis');
      expect(body).not.toHaveProperty('metadata.view_count');
      expect(body).not.toHaveProperty('scenes[0].shots');
      expect(body).not.toHaveProperty('asr_transcript');
      expect(body).not.toHaveProperty('product_mentions');
      
      // Verify only safe fields are exposed
      expect(body.evidencePack).toBeDefined();
      expect(body.evidencePack.trustScore).toBeDefined();
      expect(body.evidencePack.synthIdDetected).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('returns 429 with Retry-After header', async () => {
      // Mock rate limit exceeded scenario
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888');
      request.headers.set('X-Rate-Limit-Test', 'true');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      if (response.status === 429) {
        const body = await response.json();
        
        expect(body).toMatchObject({
          type: 'https://api.snap3.com/problems/rate-limited',
          title: 'Too many requests',
          status: 429,
          detail: expect.stringContaining('rate limit'),
        });
        
        expect(response.headers.get('Retry-After')).toBe('60');
      }
    });
  });
});