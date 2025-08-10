/**
 * Comprehensive Tests for Evidence Redaction and Audit System
 * 
 * Tests the JSON Pointer-based redaction system and SHA256 audit logging
 * for Evidence Pack v2 implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

// Import functions to test
import { 
  redactEvidence, 
  loadRedactionRules, 
  JSONPointer, 
  type RedactRule 
} from '@/lib/evidence/redact';

import { 
  evidenceDigest, 
  auditRecord, 
  createExportHeaders, 
  validateETag, 
  createETag,
  shouldRetain,
  shouldArchive,
  type AuditEntry,
  type RetentionPolicy 
} from '@/lib/evidence/audit';

describe('Evidence Redaction System', () => {
  
  // Sample VDP_FULL data for testing
  const sampleVDPData = {
    content_id: 'C0008888',
    metadata: {
      platform: 'Instagram',
      video_origin: 'Real-Footage',
      view_count: 5234567,
      like_count: 234567,
      comment_count: 12345,
      hashtags: ['CarGadgets'],
      source_url: 'https://instagram.com/p/C000888',
    },
    overall_analysis: {
      confidence: { overall: 0.95 },
      audience_reaction: {
        overall_sentiment: 'Highly Positive',
        notable_comments: ['Amazing!', 'So cool!'],
      },
    },
    asr_transcript: 'This is the full transcript from video',
    ocr_text: 'Text detected in video frames',
    product_mentions: [
      { name: 'Tesla Model 3', confidence: 0.9 }
    ],
    scenes: [
      {
        narrative_unit: {
          shots: [
            { keyframes: ['frame1.jpg', 'frame2.jpg'] }
          ]
        },
        edit_grammar: { cut_speed: 'fast' }
      }
    ],
    internal: {
      processing_id: 'proc_12345',
      debug_info: 'Debug data here'
    },
    debug: {
      timing: { process_time: 1234 }
    }
  };

  describe('JSONPointer Implementation', () => {
    it('should parse JSON Pointer paths correctly', () => {
      expect(JSONPointer.parse('')).toEqual([]);
      expect(JSONPointer.parse('/foo')).toEqual(['foo']);
      expect(JSONPointer.parse('/foo/0')).toEqual(['foo', '0']);
      expect(JSONPointer.parse('/foo/bar')).toEqual(['foo', 'bar']);
    });

    it('should handle escaped characters in JSON Pointer', () => {
      expect(JSONPointer.parse('/foo~0bar')).toEqual(['foo~bar']);
      expect(JSONPointer.parse('/foo~1bar')).toEqual(['foo/bar']);
      expect(JSONPointer.parse('/foo~0~1bar')).toEqual(['foo~/bar']);
    });

    it('should throw error for invalid JSON Pointer', () => {
      expect(() => JSONPointer.parse('foo')).toThrow('Invalid JSON Pointer');
      expect(() => JSONPointer.parse('foo/bar')).toThrow('Invalid JSON Pointer');
    });

    it('should get values from objects using JSON Pointer', () => {
      const obj = { foo: { bar: 'value', arr: [1, 2, 3] } };
      
      expect(JSONPointer.get(obj, '/foo/bar')).toBe('value');
      expect(JSONPointer.get(obj, '/foo/arr/0')).toBe(1);
      expect(JSONPointer.get(obj, '/foo/arr/2')).toBe(3);
      expect(JSONPointer.get(obj, '/nonexistent')).toBeUndefined();
    });

    it('should set values in objects using JSON Pointer', () => {
      const obj = { foo: {} };
      const result = JSONPointer.set(obj, '/foo/bar', 'new value');
      
      expect(result.foo.bar).toBe('new value');
      expect(obj.foo.bar).toBeUndefined(); // Original should be unchanged (immutable)
    });

    it('should remove values from objects using JSON Pointer', () => {
      const obj = { foo: { bar: 'value', keep: 'this' } };
      const result = JSONPointer.remove(obj, '/foo/bar');
      
      expect(result.foo.bar).toBeUndefined();
      expect(result.foo.keep).toBe('this');
      expect(obj.foo.bar).toBe('value'); // Original should be unchanged
    });

    it('should match wildcard patterns correctly', () => {
      expect(JSONPointer.matchesPattern('/foo/bar', '/foo/*')).toBe(true);
      expect(JSONPointer.matchesPattern('/foo/bar/baz', '/foo/*/baz')).toBe(true);
      expect(JSONPointer.matchesPattern('/foo/bar', '/foo/bar')).toBe(true);
      expect(JSONPointer.matchesPattern('/foo/bar/baz/deep', '/foo/**')).toBe(true);
      expect(JSONPointer.matchesPattern('/other/path', '/foo/*')).toBe(false);
    });
  });

  describe('Redaction Rules Loading', () => {
    it('should load rules from string array', () => {
      const config = ['/path1', '/path2', '/path3'];
      const rules = loadRedactionRules(config);
      
      expect(rules).toHaveLength(3);
      expect(rules[0]).toEqual({
        path: '/path1',
        strategy: 'mask',
        description: 'Auto-generated rule 1',
      });
    });

    it('should load rules from object array', () => {
      const config = [
        {
          path: '/overall_analysis',
          strategy: 'remove' as const,
          description: 'Remove sensitive analysis'
        },
        {
          path: '/api_key',
          strategy: 'mask' as const,
          description: 'Mask API key'
        }
      ];
      const rules = loadRedactionRules(config);
      
      expect(rules).toHaveLength(2);
      expect(rules[0].strategy).toBe('remove');
      expect(rules[1].strategy).toBe('mask');
    });

    it('should validate rule objects', () => {
      const invalidConfig = [
        { strategy: 'mask' } // Missing path
      ];
      
      expect(() => loadRedactionRules(invalidConfig)).toThrow('missing required \'path\' property');
    });

    it('should load actual redaction config file', () => {
      const configPath = path.join(process.cwd(), 'config', 'evidence.redact.json');
      const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
      const rules = loadRedactionRules(configData);
      
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every(rule => rule.path && rule.strategy)).toBe(true);
    });
  });

  describe('Evidence Redaction', () => {
    let rules: RedactRule[];

    beforeEach(() => {
      rules = [
        { path: '/overall_analysis', strategy: 'remove', description: 'Remove analysis' },
        { path: '/metadata/view_count', strategy: 'mask', description: 'Mask view count' },
        { path: '/metadata/like_count', strategy: 'mask', description: 'Mask like count' },
        { path: '/asr_transcript', strategy: 'remove', description: 'Remove transcript' },
        { path: '/internal/*', strategy: 'remove', description: 'Remove internal data' },
        { path: '/debug/*', strategy: 'remove', description: 'Remove debug data' },
        { path: '/scenes/*/narrative_unit/shots', strategy: 'remove', description: 'Remove shots' },
        { path: '/product_mentions', strategy: 'remove', description: 'Remove product mentions' },
      ];
    });

    it('should redact data according to rules', () => {
      const result = redactEvidence(sampleVDPData, rules);
      
      expect(result.data.overall_analysis).toBeUndefined();
      expect(result.data.asr_transcript).toBeUndefined();
      expect(result.data.metadata.view_count).toBe(0);
      expect(result.data.metadata.like_count).toBe(0);
      expect(result.data.internal).toBeUndefined();
      expect(result.data.debug).toBeUndefined();
      expect(result.data.product_mentions).toBeUndefined();
      
      // Should preserve allowed data
      expect(result.data.content_id).toBe('C0008888');
      expect(result.data.metadata.platform).toBe('Instagram');
      expect(result.data.metadata.source_url).toBe('https://instagram.com/p/C000888');
    });

    it('should count redacted fields correctly', () => {
      const result = redactEvidence(sampleVDPData, rules);
      
      expect(result.redactedCount).toBeGreaterThan(0);
      expect(result.redactedPaths).toContain('/overall_analysis');
      expect(result.redactedPaths).toContain('/asr_transcript');
    });

    it('should handle pattern-based redaction', () => {
      const patternRules: RedactRule[] = [
        { 
          path: '/metadata/source_url', 
          strategy: 'pattern', 
          pattern: 'https://', 
          replacement: 'https://[REDACTED]',
          description: 'Redact domain in URL'
        }
      ];
      
      const result = redactEvidence(sampleVDPData, patternRules);
      expect(result.data.metadata.source_url).toBe('https://[REDACTED]instagram.com/p/C000888');
    });

    it('should calculate size differences', () => {
      const result = redactEvidence(sampleVDPData, rules);
      
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.redactedSize).toBeGreaterThan(0);
      expect(result.redactedSize).toBeLessThan(result.originalSize);
    });

    it('should handle empty or null input', () => {
      const result1 = redactEvidence(null, rules);
      const result2 = redactEvidence({}, rules);
      
      expect(result1.redactedCount).toBe(0);
      expect(result2.redactedCount).toBe(0);
    });

    it('should be immutable (not modify original data)', () => {
      const originalData = JSON.parse(JSON.stringify(sampleVDPData));
      redactEvidence(sampleVDPData, rules);
      
      expect(sampleVDPData).toEqual(originalData);
    });
  });
});

describe('Evidence Audit System', () => {
  
  const samplePayload = {
    digestId: 'C0008888',
    title: 'Test Export',
    evidencePack: {
      trustScore: 0.85,
      evidenceChips: ['1M views', 'Verified', 'Positive']
    }
  };

  describe('Evidence Digest', () => {
    it('should generate consistent SHA256 hash', () => {
      const digest1 = evidenceDigest(samplePayload);
      const digest2 = evidenceDigest(samplePayload);
      
      expect(digest1.sha256).toBe(digest2.sha256);
      expect(digest1.sha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should calculate payload size correctly', () => {
      const digest = evidenceDigest(samplePayload);
      const expectedSize = Buffer.byteLength(JSON.stringify(samplePayload), 'utf8');
      
      expect(digest.size).toBe(expectedSize);
    });

    it('should include timestamp', () => {
      const digest = evidenceDigest(samplePayload);
      
      expect(digest.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(new Date(digest.exportedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle string payload', () => {
      const stringPayload = JSON.stringify(samplePayload);
      const digest = evidenceDigest(stringPayload);
      
      expect(digest.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(digest.size).toBe(Buffer.byteLength(stringPayload, 'utf8'));
    });

    it('should throw error for null/undefined payload', () => {
      expect(() => evidenceDigest(null)).toThrow('Cannot generate digest for null or undefined payload');
      expect(() => evidenceDigest(undefined)).toThrow('Cannot generate digest for null or undefined payload');
    });
  });

  describe('ETag Generation and Validation', () => {
    it('should create weak ETag by default', () => {
      const digest = evidenceDigest(samplePayload);
      const etag = createETag(digest);
      
      expect(etag).toMatch(/^W\/"[a-f0-9]{16}"$/);
    });

    it('should create strong ETag when requested', () => {
      const digest = evidenceDigest(samplePayload);
      const etag = createETag(digest, false);
      
      expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
      expect(etag).not.toStartWith('W/');
    });

    it('should validate ETags correctly', () => {
      const digest = evidenceDigest(samplePayload);
      const etag = createETag(digest);
      
      expect(validateETag(etag, digest)).toBe(true);
      expect(validateETag('W/"invalid"', digest)).toBe(false);
      expect(validateETag('', digest)).toBe(false);
    });
  });

  describe('Audit Record Creation', () => {
    const mockContext = {
      route: '/api/export/test',
      exporter: 'test-user',
      requestId: 'req-12345',
      clientIp: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      format: 'json',
      streaming: false,
      cacheStatus: 'miss' as const,
      redaction: {
        rulesApplied: 5,
        fieldsRedacted: 3,
        originalSize: 1024,
      }
    };

    it('should create complete audit record', () => {
      const audit = auditRecord(samplePayload, mockContext);
      
      expect(audit.id).toMatch(/^\d{8}-[a-f0-9]{8}$/);
      expect(audit.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(audit.route).toBe('/api/export/test');
      expect(audit.exporter).toBe('test-user');
      expect(audit.size).toBeGreaterThan(0);
      expect(audit.context).toBeDefined();
      expect(audit.redaction).toBeDefined();
    });

    it('should mask IP address for privacy', () => {
      const audit = auditRecord(samplePayload, mockContext);
      
      expect(audit.context?.clientIp).toBe('192.168.1.***');
      expect(audit.context?.clientIp).not.toBe('192.168.1.100');
    });

    it('should sanitize user agent', () => {
      const audit = auditRecord(samplePayload, mockContext);
      
      expect(audit.context?.userAgent).toBe('Mozilla/5.0 (...)');
      expect(audit.context?.userAgent).not.toContain('Test Browser');
    });

    it('should handle IPv6 addresses', () => {
      const ipv6Context = { ...mockContext, clientIp: '2001:db8::1' };
      const audit = auditRecord(samplePayload, ipv6Context);
      
      expect(audit.context?.clientIp).toBe('2001:db8::***');
    });

    it('should default exporter to system', () => {
      const { exporter, ...contextWithoutExporter } = mockContext;
      const audit = auditRecord(samplePayload, contextWithoutExporter);
      
      expect(audit.exporter).toBe('system');
    });
  });

  describe('Export Headers', () => {
    it('should create headers with audit information', () => {
      const digest = evidenceDigest(samplePayload);
      const headers = createExportHeaders(digest);
      
      expect(headers['X-Export-SHA256']).toBe(digest.sha256);
      expect(headers['X-Export-Size']).toBe(digest.size.toString());
      expect(headers['X-Export-Timestamp']).toBe(digest.exportedAt);
      expect(headers['ETag']).toBeDefined();
      expect(headers['Cache-Control']).toBe('private, max-age=3600');
    });

    it('should handle streaming mode', () => {
      const digest = evidenceDigest(samplePayload);
      const headers = createExportHeaders(digest, { streaming: true });
      
      expect(headers['ETag']).toBeUndefined();
      expect(headers['Cache-Control']).toBe('no-cache');
      expect(headers['Transfer-Encoding']).toBe('chunked');
    });

    it('should respect custom cache control', () => {
      const digest = evidenceDigest(samplePayload);
      const headers = createExportHeaders(digest, { 
        cacheControl: 'public, max-age=7200' 
      });
      
      expect(headers['Cache-Control']).toBe('public, max-age=7200');
    });

    it('should include security headers', () => {
      const digest = evidenceDigest(samplePayload);
      const headers = createExportHeaders(digest);
      
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });
  });

  describe('Retention Policy', () => {
    const mockAuditEntry: AuditEntry = {
      id: '20250110-abcd1234',
      sha256: 'a'.repeat(64),
      exporter: 'system',
      route: '/api/export/test',
      exportedAt: new Date().toISOString(),
      size: 1024,
    };

    const retentionPolicy: RetentionPolicy = {
      retentionDays: 365,
      archiveAfterDays: 90,
    };

    it('should determine retention correctly', () => {
      const recentEntry = { 
        ...mockAuditEntry, 
        exportedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      };
      const oldEntry = { 
        ...mockAuditEntry, 
        exportedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString() // 400 days ago
      };

      expect(shouldRetain(recentEntry, retentionPolicy)).toBe(true);
      expect(shouldRetain(oldEntry, retentionPolicy)).toBe(false);
    });

    it('should determine archiving correctly', () => {
      const shouldArchiveEntry = { 
        ...mockAuditEntry, 
        exportedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago
      };
      const tooRecentEntry = { 
        ...mockAuditEntry, 
        exportedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      };

      expect(shouldArchive(shouldArchiveEntry, retentionPolicy)).toBe(true);
      expect(shouldArchive(tooRecentEntry, retentionPolicy)).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  it('should integrate redaction and audit pipeline', () => {
    // Load actual redaction config
    const configPath = path.join(process.cwd(), 'config', 'evidence.redact.json');
    const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
    const rules = loadRedactionRules(configData);

    // Sample VDP data with forbidden fields
    const vdpData = {
      content_id: 'C0008888',
      overall_analysis: { confidence: 0.95 },
      metadata: { platform: 'Instagram', view_count: 1000000 },
      internal: { debug: 'sensitive data' }
    };

    // Apply redaction
    const redactionResult = redactEvidence(vdpData, rules);
    
    // Verify sensitive data is removed
    expect(redactionResult.data.overall_analysis).toBeUndefined();
    expect(redactionResult.data.internal).toBeUndefined();
    expect(redactionResult.data.metadata.view_count).toBe(0); // masked

    // Create audit record
    const auditContext = {
      route: '/api/export/brief',
      redaction: {
        rulesApplied: rules.length,
        fieldsRedacted: redactionResult.redactedCount,
        originalSize: redactionResult.originalSize,
      }
    };

    const audit = auditRecord(redactionResult.data, auditContext);
    
    expect(audit.redaction?.fieldsRedacted).toBeGreaterThan(0);
    expect(audit.redaction?.rulesApplied).toBe(rules.length);
    expect(audit.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle edge cases gracefully', () => {
    const emptyRules: RedactRule[] = [];
    const result = redactEvidence({}, emptyRules);
    
    expect(result.redactedCount).toBe(0);
    expect(result.data).toEqual({});

    const digest = evidenceDigest({});
    expect(digest.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(digest.size).toBeGreaterThan(0);
  });

  it('should preserve data types after redaction', () => {
    const data = {
      string: 'value',
      number: 42,
      boolean: true,
      array: [1, 2, 3],
      object: { nested: 'value' }
    };

    const rules: RedactRule[] = [
      { path: '/string', strategy: 'mask', description: 'test' },
      { path: '/number', strategy: 'mask', description: 'test' },
      { path: '/boolean', strategy: 'mask', description: 'test' },
      { path: '/array', strategy: 'mask', description: 'test' },
      { path: '/object', strategy: 'mask', description: 'test' },
    ];

    const result = redactEvidence(data, rules);
    
    expect(typeof result.data.string).toBe('string');
    expect(typeof result.data.number).toBe('number');
    expect(typeof result.data.boolean).toBe('boolean');
    expect(Array.isArray(result.data.array)).toBe(true);
    expect(typeof result.data.object).toBe('object');
  });
});