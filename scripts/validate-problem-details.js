#!/usr/bin/env node

/**
 * Problem+JSON Validator (RFC 9457)
 * Ensures all error responses comply with Problem Details specification
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Required fields for Problem+JSON
const REQUIRED_FIELDS = ['type', 'title', 'status'];

// Our extended fields
const EXTENDED_FIELDS = ['code', 'detail', 'fix', 'instance', 'timestamp'];

// Valid error codes from our taxonomy
const VALID_ERROR_CODES = [
  'UNSUPPORTED_AR_FOR_PREVIEW',
  'INVALID_DURATION',
  'MISSING_FIRST_FRAME',
  'PROVIDER_QUOTA_EXCEEDED',
  'PROVIDER_POLICY_BLOCKED',
  'EMBED_DENIED',
  'RATE_LIMITED',
  'QA_RULE_VIOLATION',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR'
];

// Files to scan for Problem+JSON patterns
const SCAN_PATTERNS = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx'
];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.git', 'coverage', 'dist', 'build', '.next'];

let issues = [];

function findProblemResponses(content, filePath) {
  // Pattern 1: NextResponse.json with status >= 400
  const responsePattern = /NextResponse\.json\s*\(\s*\{([^}]+)\}\s*,\s*\{\s*status:\s*(\d+)/g;
  
  // Pattern 2: Direct problem object creation
  const problemPattern = /(?:const|let|var)\s+problem\s*=\s*\{([^}]+)\}/g;
  
  // Pattern 3: Return statements with problem-like objects
  const returnPattern = /return\s+(?:NextResponse\.json\s*\()?\{[\s\S]*?type:\s*['"`]([^'"`]+)['"`][\s\S]*?\}/g;
  
  const lines = content.split('\n');
  
  // Check NextResponse.json patterns
  let match;
  while ((match = responsePattern.exec(content)) !== null) {
    const status = parseInt(match[2]);
    if (status >= 400) {
      const body = match[1];
      validateProblemStructure(body, filePath, getLineNumber(content, match.index));
    }
  }
  
  // Check problem object patterns
  responsePattern.lastIndex = 0;
  while ((match = problemPattern.exec(content)) !== null) {
    validateProblemStructure(match[1], filePath, getLineNumber(content, match.index));
  }
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

function validateProblemStructure(bodyStr, filePath, lineNum) {
  // Check for required fields
  const hasType = /type:\s*['"`]/.test(bodyStr);
  const hasTitle = /title:\s*['"`]/.test(bodyStr);
  const hasStatus = /status:\s*\d+/.test(bodyStr);
  const hasCode = /code:\s*['"`]([^'"`]+)['"`]/.test(bodyStr);
  
  if (!hasType) {
    issues.push({
      file: filePath,
      line: lineNum,
      issue: 'Missing required field: type (RFC 9457)'
    });
  }
  
  if (!hasTitle) {
    issues.push({
      file: filePath,
      line: lineNum,
      issue: 'Missing required field: title (RFC 9457)'
    });
  }
  
  if (!hasStatus) {
    issues.push({
      file: filePath,
      line: lineNum,
      issue: 'Missing required field: status (RFC 9457)'
    });
  }
  
  // Check for valid error code
  if (hasCode) {
    const codeMatch = bodyStr.match(/code:\s*['"`]([^'"`]+)['"`]/);
    if (codeMatch) {
      const code = codeMatch[1];
      if (!VALID_ERROR_CODES.includes(code)) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: `Invalid error code: ${code}. Must be one of: ${VALID_ERROR_CODES.join(', ')}`
        });
      }
    }
  }
  
  // Check type format (should be a URI)
  const typeMatch = bodyStr.match(/type:\s*['"`]([^'"`]+)['"`]/);
  if (typeMatch) {
    const type = typeMatch[1];
    if (!type.startsWith('http://') && !type.startsWith('https://') && !type.startsWith('/')) {
      issues.push({
        file: filePath,
        line: lineNum,
        issue: `Invalid type format: ${type}. Should be a URI (RFC 9457)`
      });
    }
  }
}

function scanFile(filePath) {
  // Skip test files
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Look for API route handlers
  if (filePath.includes('/api/') || content.includes('NextResponse')) {
    findProblemResponses(content, filePath);
  }
  
  // Check for error handling utilities
  if (content.includes('Problem') || content.includes('error') || content.includes('Error')) {
    findProblemResponses(content, filePath);
  }
}

function scanDirectory(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (!SKIP_DIRS.includes(item.name)) {
        scanDirectory(itemPath);
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        scanFile(itemPath);
      }
    }
  }
}

// Check for proper Problem+JSON content type
function checkContentType() {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  if (!fs.existsSync(apiDir)) return;
  
  const apiFiles = [];
  
  function collectApiFiles(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      if (item.isDirectory() && !SKIP_DIRS.includes(item.name)) {
        collectApiFiles(itemPath);
      } else if (item.isFile() && item.name === 'route.ts') {
        apiFiles.push(itemPath);
      }
    }
  }
  
  collectApiFiles(apiDir);
  
  apiFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check if error responses include proper content-type
    if (content.includes('NextResponse.json') && content.includes('status:')) {
      const hasContentType = content.includes('application/problem+json');
      if (!hasContentType && content.match(/status:\s*[4-5]\d\d/)) {
        issues.push({
          file: file,
          line: 0,
          issue: 'Error responses should include Content-Type: application/problem+json'
        });
      }
    }
  });
}

console.log('🔍 Validating Problem+JSON compliance (RFC 9457)...\n');

// Scan source directory
const srcDir = path.join(process.cwd(), 'src');
if (fs.existsSync(srcDir)) {
  scanDirectory(srcDir);
  checkContentType();
}

// Report results
if (issues.length > 0) {
  console.error('❌ Problem+JSON validation failed!\n');
  console.error('The following issues were found:\n');
  
  issues.forEach(issue => {
    console.error(`  ${issue.file}:${issue.line}`);
    console.error(`    ${issue.issue}\n`);
  });
  
  console.error('📚 RFC 9457 Requirements:');
  console.error('   - type: URI identifying the problem type');
  console.error('   - title: Human-readable summary');
  console.error('   - status: HTTP status code');
  console.error('   - detail: Specific error details (optional)');
  console.error('   - instance: URI reference for this occurrence (optional)\n');
  
  console.error('🔧 Our Extensions:');
  console.error('   - code: Error code from taxonomy');
  console.error('   - fix: Suggested resolution\n');
  
  process.exit(1);
} else {
  console.log('✅ All error responses comply with Problem+JSON (RFC 9457)\n');
  process.exit(0);
}