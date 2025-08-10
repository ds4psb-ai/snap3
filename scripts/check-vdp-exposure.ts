#!/usr/bin/env tsx
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { exit } from 'process';

interface ExposureViolation {
  file: string;
  line: number;
  pattern: string;
  context: string;
}

const violations: ExposureViolation[] = [];

// Forbidden patterns that indicate VDP_FULL exposure
const FORBIDDEN_PATTERNS = [
  // Core VDP_FULL patterns
  /\/internal\/vdp_full/gi,
  /overall_analysis/gi,
  /audience_reaction/gi,
  /notable_comments/gi,
  /asr_transcript/gi,
  /ocr_text/gi,
  /product_mentions/gi,
  /narrative_unit/gi,
  /shots\[.*\]\.keyframes/gi,
  /confidence\.\w+/gi,
  
  // Additional sensitive patterns from redaction config
  /platform_specific/gi,
  /internal\/.*}/gi,
  /debug\/.*}/gi,
  /temp\/.*}/gi,
  /raw\/.*}/gi,
  /metrics\/raw/gi,
  /analysis\/internal_notes/gi,
  /api_key/gi,
  /token/gi,
  /secret/gi,
  /password/gi,
  /processing_metadata/gi,
  /system_info/gi,
  
  // Scene detail patterns
  /scenes\/.*\/shots/gi,
  /narrative_unit\/shots/gi,
  /edit_grammar\/cut_speed/gi,
];

// Allowed contexts (where these patterns are OK)
const ALLOWED_CONTEXTS = [
  /\/\*.*\*\//,  // Comments
  /\/\/.*/,       // Single-line comments
  /test\./,       // Test files
  /mock/i,        // Mock data
  /example/i,     // Examples
];

async function checkRedactionPipelineUsage() {
  console.log('🛡️  Checking for proper redaction pipeline usage...\n');
  
  const routeFiles = await glob('src/app/api/export/**/route.{ts,js}');
  const pipelineViolations: ExposureViolation[] = [];
  
  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    // Check if file imports redaction/audit systems
    const hasRedactionImport = content.includes('redactEvidence') || content.includes('@/lib/evidence/redact');
    const hasAuditImport = content.includes('evidenceDigest') || content.includes('@/lib/evidence/audit');
    const hasVDPUsage = content.includes('vdpData') || content.includes('fetchVDPData');
    
    if (hasVDPUsage && !hasRedactionImport) {
      pipelineViolations.push({
        file,
        line: 1,
        pattern: 'Missing redaction import',
        context: 'Export route uses VDP data but missing redaction pipeline import',
      });
    }
    
    if (hasVDPUsage && !hasAuditImport) {
      pipelineViolations.push({
        file,
        line: 1,
        pattern: 'Missing audit import',
        context: 'Export route uses VDP data but missing audit pipeline import',
      });
    }
    
    // Check for evidence pack generation from redacted data
    // Look for actual function calls, not just imports
    const redactEvidenceCallIndex = content.search(/redactEvidence\s*\(/);
    const generateEvidenceCallIndex = content.search(/generateEvidencePack\s*\(/);
    const hasEvidenceGeneration = generateEvidenceCallIndex !== -1;
    const hasRedactionCall = redactEvidenceCallIndex !== -1;
    
    if (hasEvidenceGeneration && hasVDPUsage && hasRedactionCall && redactEvidenceCallIndex > generateEvidenceCallIndex) {
      pipelineViolations.push({
        file,
        line: content.split('\n').findIndex(line => line.includes('generateEvidencePack(')) + 1,
        pattern: 'Evidence pack from unredacted data',
        context: 'generateEvidencePack called before redactEvidence',
      });
    }
    
    // Check for audit logging
    const hasAuditLogging = content.includes('logAuditEntry');
    if (hasVDPUsage && !hasAuditLogging) {
      pipelineViolations.push({
        file,
        line: 1,
        pattern: 'Missing audit logging',
        context: 'Export route processes VDP but missing audit logging',
      });
    }
  }
  
  if (pipelineViolations.length > 0) {
    console.error('❌ Redaction/Audit pipeline violations found:\n');
    pipelineViolations.forEach(v => {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    Issue: ${v.pattern}`);
      console.error(`    Context: ${v.context}\n`);
    });
    return false;
  }
  
  console.log('✅ Redaction pipeline usage check passed!');
  return true;
}

async function checkVDPExposure() {
  console.log('🔒 Checking for VDP_FULL exposure...\n');
  
  // Check API routes and components
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/mock*',
      '**/example*',
      'src/lib/exports/**', // Export functions are allowed to process VDP
      'src/lib/evidence/**', // Evidence processing functions are allowed
    ],
  });
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Skip if in allowed context
      if (ALLOWED_CONTEXTS.some(pattern => pattern.test(line))) {
        return;
      }
      
      // Check for forbidden patterns
      FORBIDDEN_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          // Additional check: if it's in an API response, it's a violation
          const isApiResponse = 
            (line.includes('res.json') || 
             line.includes('NextResponse.json') ||
             (line.includes('return') && (line.includes('.json(') || line.includes('Response.json('))));
          
          // Check if it's in a mock function (fetchVDPData is OK)
          const isInMockFunction = /function\s+fetchVDPData|async\s+function\s+fetchVDPData/.test(content.substring(Math.max(0, index - 5) * 100, (index + 5) * 100));
          
          if (isApiResponse && !isInMockFunction) {
            violations.push({
              file,
              line: index + 1,
              pattern: pattern.source,
              context: line.trim(),
            });
          }
        }
      });
      
      // Check for direct VDP data access in responses only
      if (line.includes('vdp.') && !line.includes('vdpMin')) {
        const isApiResponse = 
          (line.includes('res.json') || 
           line.includes('NextResponse.json') ||
           (line.includes('return') && (line.includes('.json(') || line.includes('Response.json('))));
        
        const isProcessing = file.includes('/lib/') || file.includes('/utils/');
        
        // Only flag if it's being returned in an API response
        if (isApiResponse && !isProcessing) {
          violations.push({
            file,
            line: index + 1,
            pattern: 'Direct VDP access in response',
            context: line.trim(),
          });
        }
      }
    });
  }
  
  // Check for /internal paths
  const routeFiles = await glob('src/app/**/route.{ts,js}');
  routeFiles.forEach(file => {
    if (file.includes('/internal/')) {
      console.warn(`⚠️  Found internal route: ${file}`);
      console.warn('   Ensure proper access control is implemented');
    }
  });
  
  // Report results
  if (violations.length > 0) {
    console.error('❌ VDP exposure violations found:\n');
    violations.forEach(v => {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    Pattern: ${v.pattern}`);
      console.error(`    Context: ${v.context}\n`);
    });
    console.error(`Total violations: ${violations.length}`);
    console.error('\n⚠️  VDP_FULL data must never be exposed in API responses!');
    console.error('   Use VDP_MIN + Evidence Pack pattern instead.');
    exit(1);
  }
  
  console.log('✅ VDP exposure check passed!');
}

async function runAllChecks() {
  const pipelineCheckPassed = await checkRedactionPipelineUsage();
  await checkVDPExposure();
  
  if (!pipelineCheckPassed) {
    console.error('\n⚠️  Fix redaction/audit pipeline violations before proceeding!');
    exit(1);
  }
}

runAllChecks().catch(error => {
  console.error('Error during VDP security checks:', error);
  exit(1);
});