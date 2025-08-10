/**
 * Signed Read URL Tests
 * Tests TTL, content disposition, and URL security
 */

import { StorageProvider } from '@/lib/storage/types';

// Fake provider for signed read testing
class FakeSignedReadProvider implements StorageProvider {
  private objects = new Map<string, { size: number; contentType: string; lastModified: Date }>();

  async createSignedUploadUrl(key: string, contentType: string, options = {}) {
    return {
      url: `https://fake-storage.test/upload/${key}`,
      headers: { 'content-type': contentType },
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
  }

  async getSignedReadUrl(
    key: string,
    options: {
      ttlSec?: number;
      responseDisposition?: 'attachment' | 'inline';
      transform?: {
        width?: number;
        height?: number;
        quality?: number;
      };
    } = {}
  ) {
    if (!this.objects.has(key)) {
      throw new Error('Object not found');
    }

    const ttlSec = options.ttlSec || 3600;
    const params = new URLSearchParams();
    
    // Add TTL parameter
    params.set('expires', String(Math.floor(Date.now() / 1000) + ttlSec));
    
    // Add disposition parameter
    if (options.responseDisposition) {
      params.set('response-content-disposition', options.responseDisposition);
    }
    
    // Add transform parameters
    if (options.transform) {
      if (options.transform.width) params.set('w', String(options.transform.width));
      if (options.transform.height) params.set('h', String(options.transform.height));
      if (options.transform.quality) params.set('q', String(options.transform.quality));
    }
    
    return {
      url: `https://fake-storage.test/read/${key}?${params}`,
      expiresAt: new Date(Date.now() + ttlSec * 1000),
    };
  }

  async deleteObject(key: string) {
    this.objects.delete(key);
  }

  async objectExists(key: string) {
    return this.objects.has(key);
  }

  async headObject(key: string) {
    const obj = this.objects.get(key);
    return {
      exists: !!obj,
      size: obj?.size,
      contentType: obj?.contentType,
      lastModified: obj?.lastModified,
    };
  }

  // Test helpers
  _addObject(key: string, metadata: { size: number; contentType: string; lastModified?: Date }) {
    this.objects.set(key, {
      size: metadata.size,
      contentType: metadata.contentType,
      lastModified: metadata.lastModified || new Date(),
    });
  }
}

describe('Signed Read URLs', () => {
  let provider: FakeSignedReadProvider;

  beforeEach(() => {
    provider = new FakeSignedReadProvider();
  });

  describe('TTL (Time To Live)', () => {
    it('should use default TTL of 3600 seconds', async () => {
      provider._addObject('test.mp4', { size: 1000, contentType: 'video/mp4' });
      
      const result = await provider.getSignedReadUrl('test.mp4');
      
      expect(result.url).toContain('expires=');
      
      // Extract expires parameter
      const url = new URL(result.url);
      const expires = parseInt(url.searchParams.get('expires') || '0');
      const expectedExpires = Math.floor(Date.now() / 1000) + 3600;
      
      expect(expires).toBeGreaterThanOrEqual(expectedExpires - 5); // Allow 5 second tolerance
      expect(expires).toBeLessThanOrEqual(expectedExpires + 5);
    });

    it('should respect custom TTL', async () => {
      provider._addObject('test.mp4', { size: 1000, contentType: 'video/mp4' });
      const customTtl = 7200; // 2 hours
      
      const result = await provider.getSignedReadUrl('test.mp4', {
        ttlSec: customTtl,
      });
      
      const url = new URL(result.url);
      const expires = parseInt(url.searchParams.get('expires') || '0');
      const expectedExpires = Math.floor(Date.now() / 1000) + customTtl;
      
      expect(expires).toBeGreaterThanOrEqual(expectedExpires - 5);
      expect(expires).toBeLessThanOrEqual(expectedExpires + 5);
      
      // Check expiresAt matches TTL
      const expectedExpiresAt = Date.now() + customTtl * 1000;
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiresAt - 5000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiresAt + 5000);
    });

    it('should handle short TTL values', async () => {
      provider._addObject('test.mp4', { size: 1000, contentType: 'video/mp4' });
      const shortTtl = 60; // 1 minute
      
      const result = await provider.getSignedReadUrl('test.mp4', {
        ttlSec: shortTtl,
      });
      
      const expectedExpiresAt = Date.now() + shortTtl * 1000;
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiresAt - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiresAt + 1000);
    });
  });

  describe('Response Disposition', () => {
    it('should handle inline disposition', async () => {
      provider._addObject('image.jpg', { size: 500, contentType: 'image/jpeg' });
      
      const result = await provider.getSignedReadUrl('image.jpg', {
        responseDisposition: 'inline',
      });
      
      expect(result.url).toContain('response-content-disposition=inline');
    });

    it('should handle attachment disposition', async () => {
      provider._addObject('document.pdf', { size: 2000, contentType: 'application/pdf' });
      
      const result = await provider.getSignedReadUrl('document.pdf', {
        responseDisposition: 'attachment',
      });
      
      expect(result.url).toContain('response-content-disposition=attachment');
    });

    it('should not add disposition when not specified', async () => {
      provider._addObject('test.mp4', { size: 1000, contentType: 'video/mp4' });
      
      const result = await provider.getSignedReadUrl('test.mp4');
      
      expect(result.url).not.toContain('response-content-disposition');
    });
  });

  describe('Transform Parameters', () => {
    it('should include width and height transforms', async () => {
      provider._addObject('image.jpg', { size: 500, contentType: 'image/jpeg' });
      
      const result = await provider.getSignedReadUrl('image.jpg', {
        transform: {
          width: 800,
          height: 600,
        },
      });
      
      expect(result.url).toContain('w=800');
      expect(result.url).toContain('h=600');
    });

    it('should include quality parameter', async () => {
      provider._addObject('image.jpg', { size: 500, contentType: 'image/jpeg' });
      
      const result = await provider.getSignedReadUrl('image.jpg', {
        transform: {
          quality: 85,
        },
      });
      
      expect(result.url).toContain('q=85');
    });

    it('should handle all transform parameters together', async () => {
      provider._addObject('image.jpg', { size: 500, contentType: 'image/jpeg' });
      
      const result = await provider.getSignedReadUrl('image.jpg', {
        transform: {
          width: 1200,
          height: 800,
          quality: 90,
        },
      });
      
      expect(result.url).toContain('w=1200');
      expect(result.url).toContain('h=800');
      expect(result.url).toContain('q=90');
    });
  });

  describe('Combined Options', () => {
    it('should handle TTL, disposition, and transform together', async () => {
      provider._addObject('image.jpg', { size: 500, contentType: 'image/jpeg' });
      
      const result = await provider.getSignedReadUrl('image.jpg', {
        ttlSec: 1800,
        responseDisposition: 'attachment',
        transform: {
          width: 800,
          quality: 85,
        },
      });
      
      expect(result.url).toContain('expires=');
      expect(result.url).toContain('response-content-disposition=attachment');
      expect(result.url).toContain('w=800');
      expect(result.url).toContain('q=85');
      
      // Verify TTL
      const expectedExpiresAt = Date.now() + 1800 * 1000;
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiresAt - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiresAt + 1000);
    });
  });

  describe('Error Handling', () => {
    it('should throw for non-existent objects', async () => {
      await expect(
        provider.getSignedReadUrl('missing.mp4')
      ).rejects.toThrow('Object not found');
    });

    it('should handle invalid TTL gracefully', async () => {
      provider._addObject('test.mp4', { size: 1000, contentType: 'video/mp4' });
      
      // Should not throw for zero TTL (will use default)
      const result = await provider.getSignedReadUrl('test.mp4', {
        ttlSec: 0,
      });
      
      expect(result.url).toContain('expires=');
    });
  });

  describe('URL Security', () => {
    it('should not expose bucket names in URLs', async () => {
      provider._addObject('sensitive.mp4', { size: 1000, contentType: 'video/mp4' });
      
      const result = await provider.getSignedReadUrl('sensitive.mp4');
      
      // Common bucket name patterns
      expect(result.url).not.toMatch(/bucket[=\/:-]/i);
      expect(result.url).not.toMatch(/storage[=\/:-]/i);
      expect(result.url).not.toMatch(/s3[=\/:-]/i);
    });

    it('should not include credentials', async () => {
      provider._addObject('test.mp4', { size: 1000, contentType: 'video/mp4' });
      
      const result = await provider.getSignedReadUrl('test.mp4');
      
      // Common credential patterns
      expect(result.url).not.toMatch(/key[=\/:-]/i);
      expect(result.url).not.toMatch(/secret/i);
      expect(result.url).not.toMatch(/token/i);
      expect(result.url).not.toMatch(/password/i);
    });

    it('should use HTTPS URLs', async () => {
      provider._addObject('test.mp4', { size: 1000, contentType: 'video/mp4' });
      
      const result = await provider.getSignedReadUrl('test.mp4');
      
      expect(result.url).toMatch(/^https:\/\//);
    });
  });
});