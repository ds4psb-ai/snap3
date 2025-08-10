import { describe, it, expect } from '@jest/globals';

describe('Media Policy Guards', () => {
  describe('Video Element Attributes', () => {
    it('detects missing muted attribute in video elements', () => {
      const code = '<video autoplay playsinline src="video.mp4"></video>';
      const violations = checkMediaPolicy(code);
      
      expect(violations).toContainEqual(
        expect.objectContaining({
          violation: 'Video element missing "muted" attribute',
        })
      );
    });

    it('detects missing autoplay attribute in video elements', () => {
      const code = '<video muted playsinline src="video.mp4"></video>';
      const violations = checkMediaPolicy(code);
      
      expect(violations).toContainEqual(
        expect.objectContaining({
          violation: 'Video element missing "autoplay" attribute',
        })
      );
    });

    it('detects missing playsinline attribute in video elements', () => {
      const code = '<video muted autoplay src="video.mp4"></video>';
      const violations = checkMediaPolicy(code);
      
      expect(violations).toContainEqual(
        expect.objectContaining({
          violation: 'Video element missing "playsinline" attribute',
        })
      );
    });

    it('passes valid video element with all required attributes', () => {
      const code = '<video muted autoplay playsinline src="video.mp4"></video>';
      const violations = checkMediaPolicy(code);
      
      expect(violations).toHaveLength(0);
    });
  });

  describe('9:16 Crop Proxy Validation', () => {
    it('validates 9:16 crop-proxy overlay width', () => {
      const validCode = `
        .crop-proxy {
          width: 31.640625%;
          height: 100%;
        }
      `;
      
      const violations = checkCropProxyWidth(validCode);
      expect(violations).toHaveLength(0);
    });

    it('detects incorrect crop-proxy width', () => {
      const invalidCode = `
        .crop-proxy {
          width: 30%;
          height: 100%;
        }
      `;
      
      const violations = checkCropProxyWidth(invalidCode);
      expect(violations).toContainEqual(
        expect.objectContaining({
          violation: '9:16 crop-proxy width must be exactly 31.640625%',
        })
      );
    });
  });

  describe('Unofficial Embeds Detection', () => {
    it('detects unofficial video embeds', () => {
      const code = '<iframe src="https://unofficial-site.com/video"></iframe>';
      const violations = checkUnofficialEmbeds(code);
      
      expect(violations).toContainEqual(
        expect.objectContaining({
          violation: 'Unofficial embed detected (use official embeds only)',
        })
      );
    });

    it('allows official YouTube embeds', () => {
      const code = '<iframe src="https://youtube.com/embed/xyz"></iframe>';
      const violations = checkUnofficialEmbeds(code);
      
      expect(violations).toHaveLength(0);
    });

    it('detects direct MP4 hosting', () => {
      const code = '<video src="https://example.com/video.mp4"></video>';
      const violations = checkUnofficialEmbeds(code);
      
      expect(violations).toContainEqual(
        expect.objectContaining({
          violation: 'Unofficial embed detected (use official embeds only)',
        })
      );
    });
  });
});

// Mock functions for testing
function checkMediaPolicy(code: string): Array<{ violation: string }> {
  const violations = [];
  
  const videoTagPattern = /<video\b[^>]*>/gi;
  const videoMatches = code.match(videoTagPattern) || [];
  
  for (const videoTag of videoMatches) {
    if (!/\bmuted\b/i.test(videoTag)) {
      violations.push({ violation: 'Video element missing "muted" attribute' });
    }
    if (!/\bautoplay\b/i.test(videoTag)) {
      violations.push({ violation: 'Video element missing "autoplay" attribute' });
    }
    if (!/\bplaysinline\b/i.test(videoTag)) {
      violations.push({ violation: 'Video element missing "playsinline" attribute' });
    }
  }
  
  return violations;
}

function checkCropProxyWidth(code: string): Array<{ violation: string }> {
  const violations = [];
  
  if (code.includes('crop-proxy') || code.includes('cropProxy')) {
    const widthMatch = code.match(/width:\s*([\d.]+)%/);
    if (widthMatch && Math.abs(parseFloat(widthMatch[1]) - 31.640625) > 0.001) {
      violations.push({ violation: '9:16 crop-proxy width must be exactly 31.640625%' });
    }
  }
  
  return violations;
}

function checkUnofficialEmbeds(code: string): Array<{ violation: string }> {
  const violations = [];
  
  // Check for iframe embeds
  const iframeMatches = code.match(/<iframe.*?src=["']([^"']+)["']/gi) || [];
  for (const iframeMatch of iframeMatches) {
    const srcMatch = iframeMatch.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      const src = srcMatch[1];
      // Check if it's NOT an official YouTube or Vimeo embed
      if (!src.includes('youtube.com') && !src.includes('vimeo.com')) {
        violations.push({ violation: 'Unofficial embed detected (use official embeds only)' });
      }
    }
  }
  
  // Check for direct MP4 hosting
  if (/<video.*src=["'][^"']*\.mp4/i.test(code)) {
    violations.push({ violation: 'Unofficial embed detected (use official embeds only)' });
  }
  
  return violations;
}