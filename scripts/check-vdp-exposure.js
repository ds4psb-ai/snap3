#!/usr/bin/env node

/**
 * VDP Exposure Scanner
 * Prevents accidental exposure of VDP_FULL or other sensitive patterns
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Forbidden patterns that should never be exposed
const FORBIDDEN_PATTERNS = [
  /VDP_FULL/gi,
  /vdp\.full/gi,
  /fullVdp/gi,
  /full_vdp/gi,
  /process\.env\.VDP_FULL/gi,
  /GOOGLE_AI_STUDIO_KEY/gi,
  /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
  /AIza[0-9A-Za-z-_]{35}/g, // Google API keys
  /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.json', '.env', '.yml', '.yaml'];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.git', 'coverage', 'dist', 'build', '.next'];

let violationsFound = false;
const violations = [];

function scanFile(filePath) {
  const ext = path.extname(filePath);
  if (!SCAN_EXTENSIONS.includes(ext)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, lineNum) => {
    FORBIDDEN_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: lineNum + 1,
          pattern: pattern.toString(),
          content: line.trim().substring(0, 100)
        });
        violationsFound = true;
      }
    });
  });
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
      scanFile(itemPath);
    }
  }
}

// Get list of staged files from git
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return output.split('\n').filter(f => f.length > 0);
  } catch {
    // If not in git context, scan all files
    return null;
  }
}

console.log('🔍 Scanning for VDP exposure patterns...\n');

const stagedFiles = getStagedFiles();

if (stagedFiles) {
  // CI mode: scan only staged files
  console.log(`Scanning ${stagedFiles.length} staged files...`);
  stagedFiles.forEach(file => {
    if (fs.existsSync(file)) {
      scanFile(file);
    }
  });
} else {
  // Full scan mode
  console.log('Performing full repository scan...');
  scanDirectory(process.cwd());
}

if (violationsFound) {
  console.error('\n❌ VDP EXPOSURE DETECTED!\n');
  console.error('The following forbidden patterns were found:\n');
  
  violations.forEach(v => {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    Pattern: ${v.pattern}`);
    console.error(`    Content: ${v.content}`);
    console.error('');
  });
  
  console.error('⚠️  These patterns must not be exposed in the codebase.');
  console.error('   Please remove or properly secure these values.\n');
  
  process.exit(1);
} else {
  console.log('✅ No VDP exposure patterns detected\n');
  process.exit(0);
}