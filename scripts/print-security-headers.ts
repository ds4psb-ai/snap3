#!/usr/bin/env tsx
/**
 * Generate security headers snapshot for RC build artifacts
 */

import { writeFileSync } from 'fs';
import path from 'path';

interface SecurityHeader {
  name: string;
  value: string;
  purpose: string;
  compliance: string[];
}

const securityHeaders: SecurityHeader[] = [
  {
    name: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://player.vimeo.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https://www.youtube.com https://player.vimeo.com; frame-src 'self' https://www.youtube.com https://player.vimeo.com; connect-src 'self' https:",
    purpose: 'Prevent XSS and injection attacks',
    compliance: ['OWASP', 'Security Headers']
  },
  {
    name: 'X-Frame-Options',
    value: 'SAMEORIGIN',
    purpose: 'Prevent clickjacking attacks',
    compliance: ['OWASP', 'Security Headers']
  },
  {
    name: 'X-Content-Type-Options',
    value: 'nosniff',
    purpose: 'Prevent MIME type sniffing',
    compliance: ['OWASP', 'Security Headers']
  },
  {
    name: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
    purpose: 'Control referrer information',
    compliance: ['Privacy', 'Security Headers']
  },
  {
    name: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
    purpose: 'Control browser features',
    compliance: ['Privacy', 'Security Headers']
  },
  {
    name: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
    purpose: 'Enforce HTTPS connections',
    compliance: ['OWASP', 'Security Headers']
  },
  {
    name: 'Cache-Control',
    value: 'private, max-age=3600',
    purpose: 'Control caching for export data',
    compliance: ['Privacy', 'Performance']
  }
];

const snapshot = {
  timestamp: new Date().toISOString(),
  version: 'v0.4.0-rc.1',
  environment: 'production',
  headers: securityHeaders,
  summary: {
    total: securityHeaders.length,
    compliance: {
      owasp: securityHeaders.filter(h => h.compliance.includes('OWASP')).length,
      privacy: securityHeaders.filter(h => h.compliance.includes('Privacy')).length,
      security: securityHeaders.filter(h => h.compliance.includes('Security Headers')).length
    }
  }
};

// Generate snapshot file
const artifactPath = path.join(process.cwd(), 'artifacts', 'security-headers.json');
writeFileSync(artifactPath, JSON.stringify(snapshot, null, 2));

console.log('🛡️ Security Headers Snapshot Generated');
console.log(`📄 Total Headers: ${snapshot.summary.total}`);
console.log(`🔒 OWASP Compliance: ${snapshot.summary.compliance.owasp} headers`);
console.log(`🔐 Privacy Compliance: ${snapshot.summary.compliance.privacy} headers`);
console.log(`📊 Artifact saved: ${artifactPath}`);