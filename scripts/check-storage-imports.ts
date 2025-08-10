#!/usr/bin/env node
/**
 * Storage Import Guard Scanner
 * Checks for vendor SDK imports outside of approved directories
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// Vendor packages to check
const VENDOR_PACKAGES = [
  '@supabase',
  'aws-sdk',
  '@aws-sdk',
  '@google-cloud',
  '@azure',
  'firebase',
  '@firebase',
];

// Allowed directories for vendor imports
const ALLOWED_DIRS = [
  'src/lib/storage/providers',
  'node_modules',
  '.next',
];

// File extensions to check
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

interface Violation {
  file: string;
  line: number;
  package: string;
  content: string;
}

function isAllowedPath(filePath: string): boolean {
  return ALLOWED_DIRS.some(dir => filePath.includes(dir));
}

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  
  // Skip if in allowed directory
  if (isAllowedPath(filePath)) {
    return violations;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for import/require statements
      const importMatch = line.match(/(?:import|require)\s*\(?\s*['"]([^'"]+)['"]/);
      if (importMatch) {
        const packageName = importMatch[1];
        
        // Check if it's a vendor package
        for (const vendor of VENDOR_PACKAGES) {
          if (packageName.startsWith(vendor)) {
            violations.push({
              file: filePath,
              line: index + 1,
              package: packageName,
              content: line.trim(),
            });
          }
        }
      }
    });
  } catch (error) {
    // Ignore files that can't be read
  }
  
  return violations;
}

function scanDirectory(dir: string): Violation[] {
  const violations: Violation[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!entry.startsWith('.') && entry !== 'node_modules') {
          violations.push(...scanDirectory(fullPath));
        }
      } else if (stat.isFile()) {
        // Check if it's a source file
        if (FILE_EXTENSIONS.some(ext => entry.endsWith(ext))) {
          violations.push(...checkFile(fullPath));
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return violations;
}

function main() {
  console.log('🔍 Scanning for vendor SDK imports outside approved directories...\n');
  
  const projectRoot = process.cwd();
  const srcDir = join(projectRoot, 'src');
  
  const violations = scanDirectory(srcDir);
  
  if (violations.length === 0) {
    console.log('✅ No violations found! All vendor imports are properly isolated.\n');
    process.exit(0);
  } else {
    console.log(`❌ Found ${violations.length} violation(s):\n`);
    
    violations.forEach((violation, index) => {
      const relPath = relative(projectRoot, violation.file);
      console.log(`${index + 1}. ${relPath}:${violation.line}`);
      console.log(`   Package: ${violation.package}`);
      console.log(`   Line: ${violation.content}`);
      console.log();
    });
    
    console.log('💡 Fix suggestions:');
    console.log('   1. Move vendor-specific code to src/lib/storage/providers/');
    console.log('   2. Use the storage abstraction via getStorageProvider()');
    console.log('   3. Import from @/lib/storage instead of vendor packages\n');
    
    process.exit(1);
  }
}

// Run the scanner
if (require.main === module) {
  main();
}