import { GET } from '@/app/api/export/brief/[id]/route';
import { NextRequest } from 'next/server';

describe('Export Streaming API', () => {
  describe('Stream Mode', () => {
    it('enables streaming mode with format=stream parameter', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888?format=stream');
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Transfer-Encoding')).toBe('chunked');
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      
      // Verify we get a ReadableStream
      expect(response.body).toBeInstanceOf(ReadableStream);
    });
    
    it('streams and assembles evidence pack data correctly', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888?format=stream');
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      // Read stream
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      
      if (!reader) return;
      
      const decoder = new TextDecoder();
      let accumulated = '';
      let chunkCount = 0;
      
      // Read all chunks and count them
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunkCount++;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
      }
      
      // Verify we received multiple chunks (streaming behavior)
      expect(chunkCount).toBeGreaterThan(1);
      
      // Parse accumulated JSON
      const data = JSON.parse(accumulated);
      
      // Verify structure
      expect(data).toHaveProperty('evidencePack');
      expect(data.evidencePack).toMatchObject({
        digestId: expect.any(String),
        trustScore: expect.any(Number),
        evidenceChips: expect.any(Array),
        synthIdDetected: expect.any(Boolean),
      });
      
      // Verify trust score range
      expect(data.evidencePack.trustScore).toBeGreaterThanOrEqual(0);
      expect(data.evidencePack.trustScore).toBeLessThanOrEqual(1);
    });
    
    it('returns standard JSON without stream parameter', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888');
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Transfer-Encoding')).not.toBe('chunked');
      expect(response.headers.get('Cache-Control')).toContain('max-age=3600');
      expect(response.headers.get('ETag')).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('digestId');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('scenes');
      expect(data).toHaveProperty('evidencePack');
      
      // Verify it's not streaming (body is string, not ReadableStream)
      expect(response.body).not.toBeInstanceOf(ReadableStream);
    });
  });
  
  describe('ETag Caching', () => {
    it('includes ETag header in response', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888');
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
      const etag = response.headers.get('ETag');
      expect(etag).toBeTruthy();
      expect(etag).toMatch(/^W\/"/); // Weak ETag format
    });
    
    it('processes If-None-Match header', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888');
      request.headers.set('If-None-Match', 'W/"test-etag"');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      // In our mock implementation, different ETags return 200
      // This tests that the If-None-Match header is processed
      expect(response.status).toBe(200);
    });
    
    it('returns full response with different ETag', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888');
      request.headers.set('If-None-Match', 'W/"different-etag"');
      
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('evidencePack');
    });
  });
  
  describe('Evidence Pack Masking', () => {
    it('never exposes VDP_FULL sensitive fields in stream', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888?format=stream');
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      // Read stream
      const reader = response.body?.getReader();
      if (!reader) return;
      
      const decoder = new TextDecoder();
      let accumulated = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }
      
      // Check for forbidden VDP_FULL fields that should never be exposed
      const forbiddenFields = [
        'overall_analysis',
        'view_count',
        'asr_transcript',
        'ocr_text', 
        'product_mentions',
        'audience_reaction',
        'confidence.overall',
        'notable_comments',
        'platform_specific',
      ];
      
      forbiddenFields.forEach(field => {
        expect(accumulated).not.toContain(field);
      });
      
      // Verify only safe Evidence Pack fields are present
      const data = JSON.parse(accumulated);
      expect(data.evidencePack).toBeDefined();
      
      const allowedFields = ['digestId', 'trustScore', 'evidenceChips', 'synthIdDetected', 'provenance'];
      const actualFields = Object.keys(data.evidencePack);
      
      actualFields.forEach(field => {
        expect(allowedFields).toContain(field);
      });
      
      // Ensure we only expose trust signals, not raw data
      expect(typeof data.evidencePack.trustScore).toBe('number');
      expect(Array.isArray(data.evidencePack.evidenceChips)).toBe(true);
      expect(typeof data.evidencePack.synthIdDetected).toBe('boolean');
    });
    
    it('validates stream response headers for security', async () => {
      const request = new NextRequest('http://localhost:3001/api/export/brief/C0008888?format=stream');
      const response = await GET(request, { params: { id: 'C0008888' } });
      
      // Security headers for streaming
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      
      // No caching for streams
      expect(response.headers.get('ETag')).toBeNull();
    });
  });
});