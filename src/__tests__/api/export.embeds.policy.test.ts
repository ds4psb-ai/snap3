import { GET } from '@/app/api/export/json/[id]/route';
import { NextRequest } from 'next/server';

describe('Embed Policy Enforcement', () => {
  describe('Official Embeds Whitelist', () => {
    it('allows YouTube embeds with standard URL', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('digestId');
      expect(data).not.toHaveProperty('error');
    });
    
    it('allows YouTube embeds without www', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://youtube.com/embed/abc123');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
    });
    
    it('allows Vimeo player embeds', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://player.vimeo.com/video/123456789');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('digestId');
    });
    
    it('allows requests without embed URL header', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      // No X-Embed-URL header
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('Unofficial Embeds Blocking', () => {
    it('blocks unofficial video platform embeds', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://dailymotion.com/embed/video/x123');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(403);
      const problem = await response.json();
      
      expect(problem).toMatchObject({
        type: 'https://api.snap3.com/problems/embed-denied',
        title: 'Embed denied',
        status: 403,
        detail: 'Only YouTube and Vimeo embeds are allowed',
        code: 'EMBED_DENIED',
      });
    });
    
    it('blocks generic iframe sources', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://example.com/video/embed');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(403);
      const problem = await response.json();
      expect(problem.code).toBe('EMBED_DENIED');
    });
    
    it('blocks direct video file URLs', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://cdn.example.com/video.mp4');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(403);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
    });
    
    it('blocks malformed YouTube URLs', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://youtube.com/watch?v=123'); // Not /embed/
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(403);
      const problem = await response.json();
      expect(problem.code).toBe('EMBED_DENIED');
    });
    
    it('blocks HTTP (non-HTTPS) embeds', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'http://youtube.com/embed/123'); // HTTP not HTTPS
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(403);
      const problem = await response.json();
      expect(problem.code).toBe('EMBED_DENIED');
    });
  });
  
  describe('Problem+JSON Error Format', () => {
    it('returns RFC 9457 compliant error for embed violations', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/json/C0008888');
      request.headers.set('X-Embed-URL', 'https://unauthorized.com/embed');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(403);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      
      const problem = await response.json();
      
      // RFC 9457 required fields
      expect(problem).toHaveProperty('type');
      expect(problem).toHaveProperty('title');
      expect(problem).toHaveProperty('status');
      
      // Additional fields
      expect(problem).toHaveProperty('detail');
      expect(problem).toHaveProperty('code');
      
      // Specific values
      expect(problem.type).toBe('https://api.snap3.com/problems/embed-denied');
      expect(problem.status).toBe(403);
      expect(problem.code).toBe('EMBED_DENIED');
    });
  });
});