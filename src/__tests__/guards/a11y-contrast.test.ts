import { describe, it, expect } from '@jest/globals';

describe('Accessibility Contrast Guards', () => {
  describe('Contrast Ratio Calculation', () => {
    it('calculates contrast ratio correctly', () => {
      // Black on white = 21:1
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('calculates contrast ratio for similar colors', () => {
      // Light gray on slightly lighter gray
      const ratio = getContrastRatio('#999999', '#AAAAAA');
      expect(ratio).toBeLessThan(4.5);
    });
  });

  describe('WCAG AA Compliance', () => {
    it('fails on contrast ratio below 4.5:1', () => {
      const fg = '#777777';
      const bg = '#999999';
      const ratio = getContrastRatio(fg, bg);
      
      expect(ratio).toBeLessThan(4.5);
      
      const violations = checkContrast(fg, bg);
      expect(violations).toContainEqual(
        expect.objectContaining({
          ratio: expect.any(Number),
          required: 4.5,
        })
      );
    });

    it('passes on contrast ratio above 4.5:1', () => {
      const fg = '#000000';
      const bg = '#FFFFFF';
      const ratio = getContrastRatio(fg, bg);
      
      expect(ratio).toBeGreaterThan(4.5);
      
      const violations = checkContrast(fg, bg);
      expect(violations).toHaveLength(0);
    });
  });

  describe('Subtitle Color Validation', () => {
    it('validates subtitle foreground/background contrast', () => {
      const subtitles = [
        { fg: '#FFFFFF', bg: '#000000' }, // Good contrast
        { fg: '#FFFF00', bg: '#FFFFFF' }, // Bad contrast (yellow on white)
      ];
      
      const violations = checkSubtitleContrast(subtitles);
      
      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({
        colors: { fg: '#FFFF00', bg: '#FFFFFF' },
        ratio: expect.any(Number),
      });
      expect(violations[0].ratio).toBeLessThan(4.5);
    });

    it('handles multiple subtitle pairs', () => {
      const subtitles = [
        { fg: '#000000', bg: '#FFFFFF' }, // 21:1 - Good
        { fg: '#FFFFFF', bg: '#000000' }, // 21:1 - Good
        { fg: '#0000FF', bg: '#FFFFFF' }, // 8.59:1 - Good
        { fg: '#FFFF00', bg: '#FFFFFF' }, // 1.07:1 - Bad
      ];
      
      const violations = checkSubtitleContrast(subtitles);
      
      expect(violations).toHaveLength(1);
      expect(violations[0].colors.fg).toBe('#FFFF00');
    });
  });

  describe('Safezone Compliance', () => {
    it('validates text within safezones', () => {
      const bbox = [10, 10, 90, 90]; // 10% margins - within safezone
      const violations = checkSafezone(bbox);
      
      expect(violations).toHaveLength(0);
    });

    it('detects text outside safezones', () => {
      const bbox = [2, 2, 98, 98]; // 2% margins - outside safezone
      const violations = checkSafezone(bbox);
      
      expect(violations).toContainEqual(
        expect.objectContaining({
          violation: 'Text outside safezone boundaries',
        })
      );
    });
  });
});

// Helper functions
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

function getContrastRatio(fg: string, bg: string): number {
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkContrast(fg: string, bg: string): Array<any> {
  const ratio = getContrastRatio(fg, bg);
  const violations = [];
  
  if (ratio < 4.5) {
    violations.push({
      colors: { fg, bg },
      ratio,
      required: 4.5,
    });
  }
  
  return violations;
}

function checkSubtitleContrast(subtitles: Array<{ fg: string; bg: string }>): Array<any> {
  const violations = [];
  
  for (const subtitle of subtitles) {
    const ratio = getContrastRatio(subtitle.fg, subtitle.bg);
    if (ratio < 4.5) {
      violations.push({
        colors: subtitle,
        ratio,
      });
    }
  }
  
  return violations;
}

function checkSafezone(bbox: number[]): Array<{ violation: string }> {
  const violations = [];
  const [x1, y1, x2, y2] = bbox;
  
  // Check if text is within 5% margins (safezone)
  if (x1 < 5 || y1 < 5 || x2 > 95 || y2 > 95) {
    violations.push({ violation: 'Text outside safezone boundaries' });
  }
  
  return violations;
}