/**
 * Evidence Audit System
 * 
 * Provides SHA256 hashing, audit logging, and retention metadata for evidence exports.
 * Uses Node.js built-in crypto for server-side operations.
 */

import crypto from 'crypto';

export interface EvidenceDigest {
  /** SHA256 hash of the payload */
  sha256: string;
  /** Size in bytes */
  size: number;
  /** Export timestamp */
  exportedAt: string;
  /** Content type for response headers */
  contentType?: string;
}

export interface AuditEntry {
  /** Unique audit record ID */
  id: string;
  /** SHA256 hash of exported data */
  sha256: string;
  /** User or system performing export */
  exporter: string;
  /** API route used for export */
  route: string;
  /** Export timestamp */
  exportedAt: string;
  /** Payload size in bytes */
  size: number;
  /** Request context */
  context?: AuditContext;
  /** Redaction metadata */
  redaction?: {
    rulesApplied: number;
    fieldsRedacted: number;
    originalSize: number;
  };
}

export interface AuditContext {
  /** Request ID for tracing */
  requestId?: string;
  /** Client IP address (masked for privacy) */
  clientIp?: string;
  /** User agent (sanitized) */
  userAgent?: string;
  /** Export format requested */
  format?: string;
  /** Streaming mode enabled */
  streaming?: boolean;
  /** Cache hit/miss */
  cacheStatus?: 'hit' | 'miss' | 'bypass';
}

/**
 * Generate evidence digest with SHA256 hash and metadata
 */
export function evidenceDigest(payload: any, contentType = 'application/json'): EvidenceDigest {
  if (payload === null || payload === undefined) {
    throw new Error('Cannot generate digest for null or undefined payload');
  }

  // Serialize payload consistently
  const serialized = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload, null, 0); // No whitespace for consistent hashing

  // Generate SHA256 hash
  const hash = crypto.createHash('sha256');
  hash.update(serialized, 'utf8');
  const sha256 = hash.digest('hex');

  // Calculate size in bytes (UTF-8)
  const size = Buffer.byteLength(serialized, 'utf8');
  
  // Generate ISO timestamp
  const exportedAt = new Date().toISOString();

  return {
    sha256,
    size,
    exportedAt,
    contentType,
  };
}

/**
 * Create audit record for evidence export
 */
export function auditRecord(
  payload: any, 
  context: {
    exporter?: string;
    route: string;
    requestId?: string;
    clientIp?: string;
    userAgent?: string;
    format?: string;
    streaming?: boolean;
    cacheStatus?: 'hit' | 'miss' | 'bypass';
    redaction?: {
      rulesApplied: number;
      fieldsRedacted: number;
      originalSize: number;
    };
  }
): AuditEntry {
  const digest = evidenceDigest(payload);
  
  // Generate unique audit ID
  const auditId = generateAuditId();
  
  return {
    id: auditId,
    sha256: digest.sha256,
    exporter: context.exporter || 'system',
    route: context.route,
    exportedAt: digest.exportedAt,
    size: digest.size,
    context: {
      requestId: context.requestId,
      clientIp: context.clientIp ? maskIpAddress(context.clientIp) : undefined,
      userAgent: context.userAgent ? sanitizeUserAgent(context.userAgent) : undefined,
      format: context.format,
      streaming: context.streaming,
      cacheStatus: context.cacheStatus,
    },
    redaction: context.redaction,
  };
}

/**
 * Generate unique audit ID
 * Format: timestamp-random (e.g., 20250110-a1b2c3d4)
 */
function generateAuditId(): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Mask IP address for privacy compliance
 * IPv4: 192.168.1.xxx -> 192.168.1.***
 * IPv6: 2001:db8::1 -> 2001:db8::***
 */
function maskIpAddress(ip: string): string {
  if (!ip) return '***';
  
  // IPv4
  if (ip.includes('.') && !ip.includes(':')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }
  
  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}::***`;
    }
  }
  
  return '***';
}

/**
 * Sanitize user agent string (remove version numbers and specific details)
 */
function sanitizeUserAgent(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  
  // Extract basic browser/client info without versions
  const patterns = [
    { pattern: /Chrome\/[\d.]+/g, replacement: 'Chrome' },
    { pattern: /Firefox\/[\d.]+/g, replacement: 'Firefox' },
    { pattern: /Safari\/[\d.]+/g, replacement: 'Safari' },
    { pattern: /Edge\/[\d.]+/g, replacement: 'Edge' },
    { pattern: /Opera\/[\d.]+/g, replacement: 'Opera' },
    { pattern: /Version\/[\d.]+/g, replacement: '' },
    { pattern: /\(([^)]+)\)/g, replacement: '(...)' }, // Remove detailed system info
  ];
  
  let sanitized = userAgent;
  patterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });
  
  // Truncate if too long
  return sanitized.length > 100 ? sanitized.slice(0, 100) + '...' : sanitized;
}

/**
 * Create ETag from evidence digest
 * Format: W/"<id>-<digest>" for weak ETags
 */
export function createETag(digest: EvidenceDigest, weak = true, id?: string): string {
  const prefix = weak ? 'W/' : '';
  const hashPart = digest.sha256.slice(0, 16); // Use first 16 chars of SHA256
  const etagValue = id ? `${id}-${hashPart}` : hashPart;
  return `${prefix}"${etagValue}"`;
}

/**
 * Validate ETag against current digest
 * Supports both W/"<id>-<digest>" and W/"<digest>" formats
 */
export function validateETag(etag: string, digest: EvidenceDigest, id?: string): boolean {
  if (!etag || !digest) return false;
  
  // Extract hash from ETag (handle both weak and strong)
  const cleanEtag = etag.replace(/^W\//, '').replace(/"/g, '');
  const hashPart = digest.sha256.slice(0, 16);
  
  // Support both formats: "<id>-<digest>" and "<digest>"
  if (id && cleanEtag.includes('-')) {
    const expectedEtag = `${id}-${hashPart}`;
    return cleanEtag === expectedEtag;
  }
  
  // For backward compatibility or when no ID
  const etagHash = cleanEtag.split('-').pop() || cleanEtag;
  return etagHash === hashPart;
}

/**
 * Create response headers for evidence export
 */
export function createExportHeaders(
  digest: EvidenceDigest,
  options: {
    cacheControl?: string;
    maxAge?: number;
    streaming?: boolean;
    id?: string; // Add ID for ETag generation
  } = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Export-SHA256': digest.sha256,
    'X-Export-Size': digest.size.toString(),
    'X-Export-Timestamp': digest.exportedAt,
  };
  
  // Content type
  if (digest.contentType) {
    headers['Content-Type'] = digest.contentType;
  }
  
  // ETag for caching (not for streaming responses)
  if (!options.streaming) {
    headers['ETag'] = createETag(digest, true, options.id);
    
    // Cache control
    if (options.cacheControl) {
      headers['Cache-Control'] = options.cacheControl;
    } else if (options.maxAge !== undefined) {
      headers['Cache-Control'] = `private, max-age=${options.maxAge}`;
    } else {
      headers['Cache-Control'] = 'private, max-age=3600';
    }
  } else {
    // Streaming responses should not be cached
    headers['Cache-Control'] = 'no-cache';
    headers['Transfer-Encoding'] = 'chunked';
  }
  
  // Security headers
  headers['X-Content-Type-Options'] = 'nosniff';
  
  return headers;
}

/**
 * Log audit entry (in production, this would write to audit log storage)
 */
export function logAuditEntry(entry: AuditEntry): void {
  // In development/testing, log to console
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AUDIT]', JSON.stringify({
      id: entry.id,
      sha256: entry.sha256.slice(0, 16) + '...',
      exporter: entry.exporter,
      route: entry.route,
      size: entry.size,
      exportedAt: entry.exportedAt,
      redacted: entry.redaction?.fieldsRedacted || 0,
    }, null, 2));
  }
  
  // TODO: In production, write to secure audit log storage
  // This could be a database, secure log file, or external audit service
  // Example implementations:
  // - Write to encrypted log file with rotation
  // - Send to secure audit database with retention policies
  // - Forward to SIEM or compliance monitoring system
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  /** Retention period in days */
  retentionDays: number;
  /** Archive after days (move to cold storage) */
  archiveAfterDays?: number;
  /** Compliance requirements */
  compliance?: {
    gdpr?: boolean;
    ccpa?: boolean;
    sox?: boolean;
  };
}

/**
 * Check if audit entry should be retained based on policy
 */
export function shouldRetain(entry: AuditEntry, policy: RetentionPolicy): boolean {
  const exportDate = new Date(entry.exportedAt);
  const now = new Date();
  const daysSinceExport = Math.floor((now.getTime() - exportDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceExport < policy.retentionDays;
}

/**
 * Check if audit entry should be archived
 */
export function shouldArchive(entry: AuditEntry, policy: RetentionPolicy): boolean {
  if (!policy.archiveAfterDays) return false;
  
  const exportDate = new Date(entry.exportedAt);
  const now = new Date();
  const daysSinceExport = Math.floor((now.getTime() - exportDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceExport >= policy.archiveAfterDays && daysSinceExport < policy.retentionDays;
}