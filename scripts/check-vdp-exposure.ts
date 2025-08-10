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
];

// Allowed contexts (where these patterns are OK)
const ALLOWED_CONTEXTS = [
  /\/\*.*\*\//,  // Comments
  /\/\/.*/,       // Single-line comments
  /test\./,       // Test files
  /mock/i,        // Mock data
  /example/i,     // Examples
];

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

checkVDPExposure().catch(error => {
  console.error('Error during VDP exposure check:', error);
  exit(1);
});