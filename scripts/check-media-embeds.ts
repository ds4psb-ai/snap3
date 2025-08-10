#!/usr/bin/env tsx
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { exit } from 'process';

interface EmbedViolation {
  file: string;
  line: number;
  src: string;
  violation: string;
}

// Official embed patterns - ONLY these are allowed
const ALLOWED_EMBED_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]+/,
  /^https?:\/\/player\.vimeo\.com\/video\/\d+/
];

const violations: EmbedViolation[] = [];

// Extract iframe src from static and dynamic sources
function extractIframeSrc(line: string): string[] {
  const sources: string[] = [];
  
  // Static src attributes: src="url" or src='url'
  const staticMatches = line.matchAll(/(?:iframe[^>]*)?src=["']([^"']+)["']/gi);
  for (const match of staticMatches) {
    sources.push(match[1]);
  }
  
  // Dynamic src with template literals: src={`url`} or src={'url'}
  const templateMatches = line.matchAll(/src=\{["`']([^"`']+)["`']\}/gi);
  for (const match of templateMatches) {
    sources.push(match[1]);
  }
  
  // Variable assignment patterns: const src = "url"
  const varMatches = line.matchAll(/(?:const|let|var)\s+\w*[Ss]rc\s*=\s*["'`]([^"'`]+)["'`]/gi);
  for (const match of varMatches) {
    sources.push(match[1]);
  }
  
  return sources;
}

// Check if line is within CSS or comment context (to avoid false positives)
function isInCSSOrComment(line: string, content: string, lineIndex: number): boolean {
  const trimmed = line.trim();
  
  // Skip CSS-in-JS, style attributes, or comment lines
  if (trimmed.startsWith('//') || 
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      line.includes('/* ') ||
      line.includes('style=') ||
      line.includes('styled.') ||
      line.includes('css`')) {
    return true;
  }
  
  // Check if we're inside a multi-line comment block
  const linesUpToHere = content.split('\n').slice(0, lineIndex + 1).join('\n');
  const commentStart = linesUpToHere.lastIndexOf('/*');
  const commentEnd = linesUpToHere.lastIndexOf('*/');
  
  return commentStart > commentEnd;
}

function validateEmbedSource(src: string): boolean {
  // Skip variable references, empty strings, or relative paths
  if (!src || 
      src.startsWith('$') || 
      src.startsWith('{') || 
      src.includes('${') ||
      src.startsWith('/') ||
      src.startsWith('./') ||
      src.startsWith('../') ||
      src === '#' ||
      src.includes('localhost')) {
    return true; // Skip validation for dynamic/local content
  }
  
  return ALLOWED_EMBED_PATTERNS.some(pattern => pattern.test(src));
}

async function checkMediaEmbeds() {
  console.log('🎬 Checking embed policy compliance...\n');
  
  // Find all source files that might contain iframes
  const files = await glob('src/**/*.{tsx,jsx,ts,js}', {
    ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
  });
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Skip CSS/comment contexts to avoid false positives
      if (isInCSSOrComment(line, content, index)) {
        return;
      }
      
      // Only check lines that contain iframe elements
      if (!line.toLowerCase().includes('iframe')) {
        return;
      }
      
      const sources = extractIframeSrc(line);
      
      sources.forEach(src => {
        if (!validateEmbedSource(src)) {
          violations.push({
            file,
            line: index + 1,
            src,
            violation: 'Unauthorized embed source detected'
          });
        }
      });
    });
  }
  
  // Report violations
  if (violations.length > 0) {
    console.error('❌ Embed policy violations found:\n');
    
    violations.forEach(v => {
      console.error(`  📁 ${v.file}:${v.line}`);
      console.error(`  🔗 Source: ${v.src}`);
      console.error(`  ⚠️  ${v.violation}`);
      console.error(`  💡 Guide: Only YouTube (youtube.com/embed/*) and Vimeo (player.vimeo.com/video/*) embeds are allowed`);
      console.error('');
    });
    
    console.error(`Total violations: ${violations.length}`);
    console.error('\n📖 See .cursor/rules/40-embed-policy.md for detailed policy');
    exit(1);
  }
  
  console.log('✅ Embed policy check passed!');
}

checkMediaEmbeds().catch(error => {
  console.error('Error during embed policy check:', error);
  exit(1);
});