#!/usr/bin/env tsx
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { exit } from 'process';

interface PolicyViolation {
  file: string;
  line: number;
  violation: string;
}

const violations: PolicyViolation[] = [];

// Patterns to check
const VIDEO_TAG_PATTERN = /<video\b[^>]*>/gi;
const MUTED_ATTR_PATTERN = /\bmuted\b/i;
const AUTOPLAY_ATTR_PATTERN = /\bautoplay\b/i;
const PLAYSINLINE_ATTR_PATTERN = /\bplaysinline\b/i;
const CROP_PROXY_WIDTH = /width:\s*31\.640625%/;
const UNOFFICIAL_EMBEDS = [
  // Match iframes with hardcoded non-official URLs (not variables)
  /iframe.*src=["']https?:\/\/(?!(?:www\.)?(?:youtube\.com|vimeo\.com))[^"']+["']/i,
  // Direct MP4 hosting in video tags with hardcoded URLs
  /video.*src=["']https?:\/\/[^"']*\.mp4["']/i,
];

async function checkMediaPolicy() {
  console.log('🎬 Checking media policy compliance...\n');
  
  // Find all TSX/JSX files
  const files = await glob('src/**/*.{tsx,jsx,ts,js}', {
    ignore: ['**/*.test.*', '**/*.spec.*'],
  });
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check video tags
      const videoMatches = line.matchAll(VIDEO_TAG_PATTERN);
      for (const match of videoMatches) {
        const videoTag = match[0];
        
        // Check for required attributes
        if (!MUTED_ATTR_PATTERN.test(videoTag)) {
          violations.push({
            file,
            line: index + 1,
            violation: 'Video element missing "muted" attribute',
          });
        }
        
        if (!AUTOPLAY_ATTR_PATTERN.test(videoTag)) {
          violations.push({
            file,
            line: index + 1,
            violation: 'Video element missing "autoplay" attribute',
          });
        }
        
        if (!PLAYSINLINE_ATTR_PATTERN.test(videoTag)) {
          violations.push({
            file,
            line: index + 1,
            violation: 'Video element missing "playsinline" attribute',
          });
        }
      }
      
      // Check for unofficial embeds
      UNOFFICIAL_EMBEDS.forEach(pattern => {
        if (pattern.test(line)) {
          violations.push({
            file,
            line: index + 1,
            violation: 'Unofficial embed detected (use official embeds only)',
          });
        }
      });
      
      // Check 9:16 crop proxy width (only in CSS or style attributes)
      if ((line.includes('crop-proxy') || line.includes('cropProxy')) && 
          (line.includes('width') || line.includes('style'))) {
        if (!CROP_PROXY_WIDTH.test(line)) {
          violations.push({
            file,
            line: index + 1,
            violation: '9:16 crop-proxy width must be exactly 31.640625%',
          });
        }
      }
    });
  }
  
  // Report results
  if (violations.length > 0) {
    console.error('❌ Media policy violations found:\n');
    violations.forEach(v => {
      console.error(`  ${v.file}:${v.line} - ${v.violation}`);
    });
    console.error(`\nTotal violations: ${violations.length}`);
    exit(1);
  }
  
  console.log('✅ Media policy check passed!');
}

checkMediaPolicy().catch(error => {
  console.error('Error during media policy check:', error);
  exit(1);
});