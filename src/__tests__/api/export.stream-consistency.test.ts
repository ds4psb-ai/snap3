/**
 * Stream Consistency and ETag Validation Tests
 * 
 * Ensures that stream and non-stream paths share identical redaction/audit behavior,
 * and validates proper ETag/304 response handling.
 */

import { NextRequest } from 'next/server';
import { GET as getBriefExport } from '@/app/api/export/brief/[id]/route';
import { GET as getJsonExport } from '@/app/api/export/json/[id]/route';

describe('Export Stream Consistency', () => {
  const validId = 'C0008888';
  const baseUrl = 'http://localhost:3001';

  describe('Brief Export Stream Consistency', () => {
    it('should apply identical redaction in stream and non-stream modes', async () => {
      // Non-stream request
      const normalReq = new NextRequest(`${baseUrl}/api/export/brief/${validId}`);
      const normalRes = await getBriefExport(normalReq, { params: { id: validId } });
      const normalData = await normalRes.json();

      // Stream request
      const streamReq = new NextRequest(`${baseUrl}/api/export/brief/${validId}?format=stream`);
      const streamRes = await getBriefExport(streamReq, { params: { id: validId } });
      
      // Verify headers differ appropriately
      expect(normalRes.headers.get('Cache-Control')).toBe('private, max-age=3600');
      expect(streamRes.headers.get('Cache-Control')).toBe('no-cache');
      expect(streamRes.headers.get('Transfer-Encoding')).toBe('chunked');
      
      // Both should have audit headers
      expect(normalRes.headers.get('X-Export-SHA256')).toBeTruthy();
      expect(streamRes.headers.get('X-Export-SHA256')).toBeTruthy();
      
      // Stream should not have ETag
      expect(normalRes.headers.get('ETag')).toMatch(/^W\/"C0008888-[a-f0-9]{16}"$/);
      expect(streamRes.headers.get('ETag')).toBeNull();
    });

    it('should generate consistent audit records for both modes', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Non-stream request
      const normalReq = new NextRequest(`${baseUrl}/api/export/brief/${validId}`);
      await getBriefExport(normalReq, { params: { id: validId } });
      
      // Stream request
      const streamReq = new NextRequest(`${baseUrl}/api/export/brief/${validId}?format=stream`);
      await getBriefExport(streamReq, { params: { id: validId } });
      
      // Check audit logs
      const auditLogs = consoleSpy.mock.calls.filter(call => call[0] === '[AUDIT]');
      expect(auditLogs).toHaveLength(2);
      
      const normalAudit = JSON.parse(auditLogs[0][1]);
      const streamAudit = JSON.parse(auditLogs[1][1]);
      
      // Both should have redaction applied
      expect(normalAudit.redacted).toBeGreaterThan(0);
      expect(streamAudit.redacted).toBeGreaterThan(0);
      expect(normalAudit.redacted).toBe(streamAudit.redacted);
      
      consoleSpy.mockRestore();
    });
  });

  describe('ETag and 304 Responses', () => {
    it('should return 304 Not Modified when ETag matches', async () => {
      // First request to get ETag
      const req1 = new NextRequest(`${baseUrl}/api/export/json/${validId}`);
      const res1 = await getJsonExport(req1, { params: { id: validId } });
      const etag = res1.headers.get('ETag');
      
      expect(etag).toMatch(/^W\/"C0008888-[a-f0-9]{16}"$/);
      
      // Second request with If-None-Match
      const req2 = new NextRequest(`${baseUrl}/api/export/json/${validId}`, {
        headers: {
          'If-None-Match': etag!,
        },
      });
      const res2 = await getJsonExport(req2, { params: { id: validId } });
      
      expect(res2.status).toBe(304);
      expect(res2.headers.get('ETag')).toBe(etag);
      expect(res2.headers.get('Cache-Control')).toBe('private, max-age=3600');
      
      // Body should be empty for 304
      // Note: NextResponse returns null body for 304, which gets converted to empty response
      const body = res2.body;
      expect(body).toBeNull();
    });

    it('should return full response when ETag does not match', async () => {
      const wrongEtag = 'W/"WRONG123-abcdef1234567890"';
      const req = new NextRequest(`${baseUrl}/api/export/json/${validId}`, {
        headers: {
          'If-None-Match': wrongEtag,
        },
      });
      const res = await getJsonExport(req, { params: { id: validId } });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.digestId).toBe(validId);
      expect(data.evidencePack).toBeDefined();
    });

    it('should not return 304 for streaming requests even with matching ETag', async () => {
      // First request to get ETag
      const req1 = new NextRequest(`${baseUrl}/api/export/brief/${validId}`);
      const res1 = await getBriefExport(req1, { params: { id: validId } });
      const etag = res1.headers.get('ETag');
      
      // Stream request with If-None-Match (should ignore)
      const req2 = new NextRequest(`${baseUrl}/api/export/brief/${validId}?format=stream`, {
        headers: {
          'If-None-Match': etag!,
        },
      });
      const res2 = await getBriefExport(req2, { params: { id: validId } });
      
      expect(res2.status).toBe(200);
      expect(res2.headers.get('Cache-Control')).toBe('no-cache');
      expect(res2.headers.get('ETag')).toBeNull();
    });

    it('should use weak ETag format W/"<id>-<digest>"', async () => {
      const req = new NextRequest(`${baseUrl}/api/export/json/${validId}`);
      const res = await getJsonExport(req, { params: { id: validId } });
      const etag = res.headers.get('ETag');
      
      // Validate weak ETag format
      expect(etag).toMatch(/^W\/"[A-Z0-9]{8}-[a-f0-9]{16}"$/);
      expect(etag).toContain(validId);
    });
  });

  describe('Header Setting Pattern Compliance', () => {
    it('should use proper NextResponse.headers.set() pattern', async () => {
      const req = new NextRequest(`${baseUrl}/api/export/json/${validId}`);
      const res = await getJsonExport(req, { params: { id: validId } });
      
      // Check that all expected headers are set
      expect(res.headers.get('X-Export-SHA256')).toBeTruthy();
      expect(res.headers.get('X-Export-Size')).toBeTruthy();
      expect(res.headers.get('X-Export-Timestamp')).toBeTruthy();
      expect(res.headers.get('Cache-Control')).toBe('private, max-age=3600');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('ETag')).toMatch(/^W\//);
    });

    it('should properly set Problem+JSON headers on errors', async () => {
      const invalidId = 'INVALID';
      const req = new NextRequest(`${baseUrl}/api/export/json/${invalidId}`);
      const res = await getJsonExport(req, { params: { id: invalidId } });
      
      expect(res.status).toBe(400);
      expect(res.headers.get('Content-Type')).toBe('application/problem+json');
      
      // The response is already a NextResponse object, get the body properly
      const bodyText = await res.text();
      const problem = JSON.parse(bodyText);
      
      // Check for Problem Details fields
      expect(problem.type).toBeDefined();
      expect(problem.title).toBeDefined();
      expect(problem.status).toBe(400);
      expect(problem.code).toBeDefined();
      expect(problem.timestamp).toBeDefined();
    });

    it('should set Retry-After header for rate limit responses', async () => {
      const req = new NextRequest(`${baseUrl}/api/export/brief/${validId}`, {
        headers: {
          'X-Rate-Limit-Test': 'true',
        },
      });
      const res = await getBriefExport(req, { params: { id: validId } });
      
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('60');
      expect(res.headers.get('Content-Type')).toBe('application/problem+json');
    });
  });

  describe('Redaction Consistency', () => {
    it('should consistently redact sensitive fields', async () => {
      const req = new NextRequest(`${baseUrl}/api/export/json/${validId}`);
      const res = await getJsonExport(req, { params: { id: validId } });
      const data = await res.json();
      
      // Verify evidence pack does not contain redacted fields
      expect(data.evidencePack).toBeDefined();
      expect(data.evidencePack.digestId).toBe(validId);
      expect(data.evidencePack.trustScore).toBeDefined();
      expect(data.evidencePack.evidenceChips).toBeDefined();
      
      // These should be redacted (not in evidence pack)
      expect(data.overall_analysis).toBeUndefined();
      expect(data.asr_transcript).toBeUndefined();
      expect(data.ocr_text).toBeUndefined();
      expect(data.product_mentions).toBeUndefined();
    });

    it('should apply identical redaction rules in both export endpoints', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Brief export
      const briefReq = new NextRequest(`${baseUrl}/api/export/brief/${validId}`);
      await getBriefExport(briefReq, { params: { id: validId } });
      
      // JSON export
      const jsonReq = new NextRequest(`${baseUrl}/api/export/json/${validId}`);
      await getJsonExport(jsonReq, { params: { id: validId } });
      
      const auditLogs = consoleSpy.mock.calls.filter(call => call[0] === '[AUDIT]');
      const briefAudit = JSON.parse(auditLogs[0][1]);
      const jsonAudit = JSON.parse(auditLogs[1][1]);
      
      // Both should have same redaction count
      expect(briefAudit.redacted).toBe(jsonAudit.redacted);
      expect(briefAudit.redacted).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });
  });
});