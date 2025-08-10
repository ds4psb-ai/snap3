#!/usr/bin/env tsx
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { exit } from 'process';

interface ContrastViolation {
  file: string;
  line: number;
  colors: { fg: string; bg: string };
  ratio: number;
}

const violations: ContrastViolation[] = [];
const WCAG_AA_RATIO = 4.5;

// Calculate relative luminance
function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;
  
  const [rs, gs, bs] = [r, g, b].map(c => 
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(fg: string, bg: string): number {
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function checkContrast() {
  console.log('🎨 Checking WCAG AA contrast compliance...\n');
  
  const files = await glob('src/**/*.{tsx,jsx,ts,js,css}', {
    ignore: ['**/*.test.*', '**/*.spec.*'],
  });
  
  // Common subtitle color patterns
  const COLOR_PATTERN = /#[0-9A-Fa-f]{6}/g;
  const SUBTITLE_PATTERN = /subtitle|caption|text|fg|bg/i;
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (SUBTITLE_PATTERN.test(line)) {
        const colors = line.match(COLOR_PATTERN) || [];
        
        // Check pairs of colors (assuming fg/bg pairs)
        if (colors.length >= 2) {
          for (let i = 0; i < colors.length - 1; i++) {
            const fg = colors[i];
            const bg = colors[i + 1];
            const ratio = getContrastRatio(fg, bg);
            
            if (ratio < WCAG_AA_RATIO) {
              violations.push({
                file,
                line: index + 1,
                colors: { fg, bg },
                ratio,
              });
            }
          }
        }
      }
    });
  }
  
  // Check specific overlay configurations
  const overlayFiles = await glob('src/**/overlay*.{tsx,jsx}');
  for (const file of overlayFiles) {
    const content = readFileSync(file, 'utf-8');
    
    // Check for 9:16 crop proxy width
    if (content.includes('crop-proxy') || content.includes('cropProxy')) {
      const widthMatch = content.match(/width:\s*["']?([\d.]+)%/);
      if (widthMatch && Math.abs(parseFloat(widthMatch[1]) - 31.640625) > 0.001) {
        console.warn(`⚠️  ${file}: 9:16 crop-proxy width is ${widthMatch[1]}% (should be 31.640625%)`);
      }
    }
  }
  
  // Report results
  if (violations.length > 0) {
    console.error('❌ Contrast violations found (WCAG AA requires ≥4.5:1):\n');
    violations.forEach(v => {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    Colors: ${v.colors.fg} on ${v.colors.bg}`);
      console.error(`    Ratio: ${v.ratio.toFixed(2)} (need ≥4.5)\n`);
    });
    console.error(`Total violations: ${violations.length}`);
    exit(1);
  }
  
  console.log('✅ Accessibility contrast check passed!');
}

checkContrast().catch(error => {
  console.error('Error during contrast check:', error);
  exit(1);
});