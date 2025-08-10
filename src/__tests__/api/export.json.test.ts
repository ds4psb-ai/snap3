import { GET } from '@/app/api/export/json/[id]/route';
import { NextRequest } from 'next/server';

describe('GET /api/export/json/[id]', () => {
  describe('404 Not Found', () => {
    it('returns Problem+JSON when export not found', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/NOTFOUND');
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
      
      expect(response.headers.get('content-type')).toBe('application/problem+json');
    });
  });

  describe('Happy Path', () => {
    it('returns JSONExport with VideoGenIR and Veo3Prompt', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      // Verify JSONExport structure
      expect(body).toMatchObject({
        digestId: 'C0008888',
        videoGenIR: {
          durationSec: 8,
          aspect: '16:9',
          resolution: expect.stringMatching(/^(720p|1080p)$/),
          cuts: expect.any(Array),
        },
        veo3Prompt: {
          durationSec: 8,
          aspect: '16:9',
          resolution: expect.stringMatching(/^(720p|1080p)$/),
          shots: expect.any(Array),
        },
        evidencePack: expect.objectContaining({
          digestId: 'C0008888',
          trustScore: expect.any(Number),
          evidenceChips: expect.any(Array),
          synthIdDetected: expect.any(Boolean),
        }),
      });
      
      // Verify Veo3 constraints
      expect(body.videoGenIR.durationSec).toBe(8);
      expect(body.veo3Prompt.durationSec).toBe(8);
      expect(body.videoGenIR.aspect).toBe('16:9');
      expect(body.veo3Prompt.aspect).toBe('16:9');
    });
  });

  describe('Embed Policy Guard', () => {
    it('allows YouTube embeds', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.embedPolicy).toBeUndefined(); // No error
    });
    
    it('allows Vimeo embeds', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://player.vimeo.com/video/123456789');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
    });
    
    it('rejects unofficial embeds with EMBED_DENIED', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://unofficial-site.com/embed/video');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(403);
      const body = await response.json();
      
      expect(body).toMatchObject({
        type: 'https://api.snap3.com/problems/embed-denied',
        title: 'Embed denied',
        status: 403,
        detail: 'Only YouTube and Vimeo embeds are allowed',
        code: 'EMBED_DENIED',
      });
    });
  });

  describe('Vertical Format Handling', () => {
    it('returns crop-proxy metadata for 9:16 requests', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Aspect-Ratio', '9:16');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(422);
      const body = await response.json();
      
      expect(body).toMatchObject({
        type: 'https://api.snap3.com/problems/unsupported-ar',
        title: 'Preview aspect ratio not supported',
        status: 422,
        code: 'UNSUPPORTED_AR_FOR_PREVIEW',
        detail: expect.stringContaining('16:9'),
        cropProxy: {
          sourceAspect: '16:9',
          targetAspect: '9:16',
          cropRegion: {
            x: expect.any(Number),
            y: expect.any(Number),
            width: expect.any(Number),
            height: expect.any(Number),
          },
        },
      });
    });
  });
});