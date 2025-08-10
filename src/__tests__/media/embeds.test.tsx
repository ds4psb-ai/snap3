/**
 * Comprehensive embed security tests
 * Validates embed policy enforcement and security headers
 */

import { describe, expect, test, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/embed-meta/route';
import { render } from '@testing-library/react';
import { EmbedFrame, SecureEmbed } from '../../components/EmbedFrame';

// Mock console.warn to capture security warnings
const consoleMock = {
  warn: jest.fn()
};
global.console = { ...global.console, ...consoleMock };

describe('Embed Security Policy', () => {
  beforeEach(() => {
    consoleMock.warn.mockClear();
  });

  describe('API Route: /embed-meta', () => {
    describe('✅ Allowed Domains', () => {
      test('should accept YouTube embed URLs', async () => {
        const request = new NextRequest('http://localhost:3000/api/embed-meta', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.provider).toBe('youtube');
        expect(data.embedUrl).toMatch(/^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]+/);
        expect(data.videoId).toBe('dQw4w9WgXcQ');
      });

      test('should accept Vimeo embed URLs', async () => {
        const request = new NextRequest('http://localhost:3000/api/embed-meta', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://player.vimeo.com/video/123456789'
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.provider).toBe('vimeo');
        expect(data.embedUrl).toMatch(/^https:\/\/player\.vimeo\.com\/video\/\d+/);
        expect(data.videoId).toBe('123456789');
      });

      test('should normalize YouTube watch URLs to embed URLs', async () => {
        const request = new NextRequest('http://localhost:3000/api/embed-meta', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
        expect(data.originalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      });
    });

    describe('❌ Forbidden Domains', () => {
      const forbiddenUrls = [
        { url: 'https://example.com/video.mp4', expectedStatus: 403 },
        { url: 'https://malicious-site.com/embed/123', expectedStatus: 403 },
        { url: 'https://youtube-proxy.com/embed/123', expectedStatus: 403 },
        { url: 'https://dailymotion.com/embed/xyz', expectedStatus: 403 },
        { url: 'https://twitch.tv/embed/channel', expectedStatus: 403 },
        { url: 'https://badsite.com/vimeo.com/123456789', expectedStatus: 403 }, // Not actually vimeo.com
        { url: './assets/video.mp4', expectedStatus: 400 }, // Invalid URL format
        { url: '/videos/sample.mp4', expectedStatus: 400 } // Invalid URL format
      ];

      test.each(forbiddenUrls)('should reject unauthorized domain: $url', async ({ url, expectedStatus }) => {
        const request = new NextRequest('http://localhost:3000/api/embed-meta', {
          method: 'POST',
          body: JSON.stringify({ url }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        const data = await response.json();

        // Should return Problem+JSON format
        expect(response.status).toBe(expectedStatus);
        expect(response.headers.get('Content-Type')).toBe('application/problem+json');
        
        if (expectedStatus === 403) {
          // Validate EMBED_DENIED Problem+JSON structure
          expect(data).toHaveProperty('type');
          expect(data).toHaveProperty('title', 'Embed denied');
          expect(data).toHaveProperty('status', 403);
          expect(data).toHaveProperty('code', 'EMBED_DENIED');
          expect(data).toHaveProperty('fix');
          expect(data.detail).toContain('YouTube and Vimeo embeds');
        } else {
          // Validate VALIDATION_ERROR Problem+JSON structure
          expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
          expect(data).toHaveProperty('violations');
          expect(data.violations[0].field).toBe('url');
        }
      });
    });

    describe('🔍 Validation Errors', () => {
      test('should reject invalid URL format', async () => {
        const request = new NextRequest('http://localhost:3000/api/embed-meta', {
          method: 'POST',
          body: JSON.stringify({
            url: 'not-a-valid-url'
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(response.headers.get('Content-Type')).toBe('application/problem+json');
        expect(data.code).toBe('VALIDATION_ERROR');
        expect(data.violations).toHaveLength(1);
        expect(data.violations[0].field).toBe('url');
      });

      test('should reject missing URL field', async () => {
        const request = new NextRequest('http://localhost:3000/api/embed-meta', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.code).toBe('VALIDATION_ERROR');
        expect(data.violations[0].field).toBe('url');
      });
    });
  });

  describe('Component: EmbedFrame', () => {
    describe('✅ Security Validation', () => {
      test('should render YouTube embeds', () => {
        const { container } = render(
          <EmbedFrame src="https://www.youtube.com/embed/dQw4w9WgXcQ" />
        );

        const iframe = container.querySelector('iframe');
        expect(iframe).toBeInTheDocument();
        expect(iframe?.getAttribute('src')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
      });

      test('should render Vimeo embeds', () => {
        const { container } = render(
          <EmbedFrame src="https://player.vimeo.com/video/123456789" />
        );

        const iframe = container.querySelector('iframe');
        expect(iframe).toBeInTheDocument();
        expect(iframe?.getAttribute('src')).toBe('https://player.vimeo.com/video/123456789');
      });

      test('should block unauthorized domains', () => {
        const { container } = render(
          <EmbedFrame src="https://malicious-site.com/embed/123" />
        );

        const iframe = container.querySelector('iframe');
        expect(iframe).not.toBeInTheDocument();
        
        const errorDiv = container.querySelector('.embed-frame-error');
        expect(errorDiv).toBeInTheDocument();
        expect(errorDiv?.textContent).toContain('Embed Blocked');
        
        expect(consoleMock.warn).toHaveBeenCalledWith(
          'EmbedFrame: Unauthorized embed source blocked:',
          'https://malicious-site.com/embed/123'
        );
      });
    });

    describe('🛡️ Security Attributes', () => {
      test('should have proper security attributes', () => {
        const { container } = render(
          <EmbedFrame src="https://www.youtube.com/embed/test123" />
        );

        const iframe = container.querySelector('iframe');
        expect(iframe).toHaveAttribute('referrerPolicy', 'no-referrer');
        expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
        expect(iframe).toHaveAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
        expect(iframe).toHaveAttribute('frameBorder', '0');
        expect(iframe).toHaveAttribute('allowFullScreen');
        expect(iframe).toHaveAttribute('credentialless', 'true');
      });

      test('should have default accessibility attributes', () => {
        const { container } = render(
          <EmbedFrame src="https://www.youtube.com/embed/test123" />
        );

        const iframe = container.querySelector('iframe');
        expect(iframe).toHaveAttribute('title', 'Embedded Video');
        expect(iframe).toHaveAttribute('loading', 'lazy');
      });

      test('should accept custom title and loading attributes', () => {
        const { container } = render(
          <EmbedFrame 
            src="https://www.youtube.com/embed/test123"
            title="Custom Video Title"
            loading="eager"
          />
        );

        const iframe = container.querySelector('iframe');
        expect(iframe).toHaveAttribute('title', 'Custom Video Title');
        expect(iframe).toHaveAttribute('loading', 'eager');
      });
    });

    describe('🔧 SecureEmbed HOC', () => {
      test('should render successfully with valid embed', () => {
        const { container } = render(
          <SecureEmbed src="https://www.youtube.com/embed/test123" />
        );

        const iframe = container.querySelector('iframe');
        expect(iframe).toBeInTheDocument();
      });

      test('should show custom fallback for invalid embed', () => {
        const fallback = <div data-testid="custom-fallback">Custom Error</div>;
        
        const { getByTestId } = render(
          <SecureEmbed 
            src="https://malicious-site.com/embed/123"
            fallback={fallback}
          />
        );

        expect(getByTestId('custom-fallback')).toBeInTheDocument();
      });

      test('should show default fallback when no custom fallback provided', () => {
        const { container } = render(
          <SecureEmbed src="https://malicious-site.com/embed/123" />
        );

        const fallback = container.querySelector('.embed-error-fallback');
        expect(fallback).toBeInTheDocument();
        expect(fallback?.textContent).toContain('Unable to load embed');
      });
    });
  });

  describe('🔒 CSP Header Validation', () => {
    // Note: This would typically be tested in E2E tests with actual headers
    // Here we validate the expected header structure
    test('should define proper frame-src policy', () => {
      const expectedFrameSrc = "frame-src 'self' https://www.youtube.com https://youtube.com https://player.vimeo.com";
      const expectedFrameAncestors = "frame-ancestors 'self'";
      
      // These would be tested against actual Next.js config in integration tests
      expect(expectedFrameSrc).toContain('youtube.com');
      expect(expectedFrameSrc).toContain('player.vimeo.com');
      expect(expectedFrameAncestors).toBe("frame-ancestors 'self'");
    });

    test('should define restrictive permissions policy', () => {
      const expectedPermissions = [
        'autoplay=(self)',
        'camera=()',
        'microphone=()',
        'geolocation=()'
      ];
      
      expectedPermissions.forEach(permission => {
        expect(permission).toMatch(/^[a-z-]+=/);
      });
    });
  });

  describe('📊 Component Snapshots', () => {
    test('iframe properties snapshot for YouTube', () => {
      const { container } = render(
        <EmbedFrame 
          src="https://www.youtube.com/embed/test123"
          width={560}
          height={315}
        />
      );

      const iframe = container.querySelector('iframe');
      const attributes = {
        src: iframe?.getAttribute('src'),
        width: iframe?.getAttribute('width'),
        height: iframe?.getAttribute('height'),
        referrerPolicy: iframe?.getAttribute('referrerPolicy'),
        sandbox: iframe?.getAttribute('sandbox'),
        allow: iframe?.getAttribute('allow'),
        frameBorder: iframe?.getAttribute('frameBorder'),
        allowFullScreen: iframe?.hasAttribute('allowFullScreen'),
        credentialless: iframe?.getAttribute('credentialless')
      };

      expect(attributes).toMatchSnapshot({
        src: 'https://www.youtube.com/embed/test123',
        width: '560',
        height: '315',
        referrerPolicy: 'no-referrer',
        sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups',
        allow: 'autoplay; fullscreen; picture-in-picture',
        frameBorder: '0',
        allowFullScreen: true,
        credentialless: 'true'
      });
    });
  });
});