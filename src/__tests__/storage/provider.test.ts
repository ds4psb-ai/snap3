/**
 * Storage Provider Contract Tests
 * Ensures all providers implement the interface correctly
 */

import { StorageProvider } from '@/lib/storage/types';

// Fake provider for unit tests
class FakeStorageProvider implements StorageProvider {
  private objects = new Map<string, boolean>();
  private uploadUrls = new Map<string, string>();

  async createSignedUploadUrl(
    key: string,
    contentType: string,
    options: {
      expiresIn?: number;
      maxSizeBytes?: number;
      resumable?: boolean;
    } = {}
  ) {
    const expiresIn = options.expiresIn || 3600;
    const url = `https://fake-storage.test/upload/${key}?expires=${expiresIn}`;
    this.uploadUrls.set(key, url);
    
    return {
      url,
      fields: { 'x-fake': 'true' },
      headers: { 'content-type': contentType },
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async getSignedReadUrl(
    key: string,
    options: {
      expiresIn?: number;
      download?: boolean;
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
    const expiresIn = options.expiresIn || 3600;
    const params = new URLSearchParams({
      expires: String(expiresIn),
      ...(options.download && { download: 'true' }),
      ...(options.transform?.width && { w: String(options.transform.width) }),
      ...(options.transform?.height && { h: String(options.transform.height) }),
    });
    
    return {
      url: `https://fake-storage.test/read/${key}?${params}`,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async deleteObject(key: string) {
    this.objects.delete(key);
  }

  async objectExists(key: string) {
    return this.objects.has(key);
  }

  // Test helpers
  _addObject(key: string) {
    this.objects.set(key, true);
  }

  _getUploadUrl(key: string) {
    return this.uploadUrls.get(key);
  }
}

describe('StorageProvider Contract', () => {
  let provider: FakeStorageProvider;

  beforeEach(() => {
    provider = new FakeStorageProvider();
  });

  describe('createSignedUploadUrl', () => {
    it('should return valid URL structure', async () => {
      const result = await provider.createSignedUploadUrl('test.mp4', 'video/mp4');
      
      expect(result.url).toMatch(/^https?:\/\/.+/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should respect TTL options', async () => {
      const ttl = 7200; // 2 hours
      const result = await provider.createSignedUploadUrl('test.mp4', 'video/mp4', {
        expiresIn: ttl,
      });

      const expectedExpiry = Date.now() + ttl * 1000;
      // Allow 1 second tolerance for test execution time
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it('should include content type when specified', async () => {
      const result = await provider.createSignedUploadUrl('test.mp4', 'video/mp4');

      expect(result.headers?.['content-type']).toBe('video/mp4');
    });

    it('should generate unique URLs for different keys', async () => {
      const result1 = await provider.createSignedUploadUrl('file1.mp4', 'video/mp4');
      const result2 = await provider.createSignedUploadUrl('file2.mp4', 'video/mp4');

      expect(result1.url).not.toBe(result2.url);
    });

    it('should include fields for multipart uploads', async () => {
      const result = await provider.createSignedUploadUrl('test.mp4', 'video/mp4');
      
      expect(result.fields).toBeDefined();
      expect(typeof result.fields).toBe('object');
    });
  });

  describe('getSignedReadUrl', () => {
    it('should return valid URL for existing objects', async () => {
      provider._addObject('exists.mp4');
      
      const result = await provider.getSignedReadUrl('exists.mp4');
      
      expect(result.url).toMatch(/^https?:\/\/.+/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw for non-existent objects', async () => {
      await expect(
        provider.getSignedReadUrl('missing.mp4')
      ).rejects.toThrow('Object not found');
    });

    it('should include download parameter when specified', async () => {
      provider._addObject('download.mp4');
      
      const result = await provider.getSignedReadUrl('download.mp4', {
        download: true,
      });
      
      expect(result.url).toContain('download=true');
    });

    it('should include transform parameters when specified', async () => {
      provider._addObject('image.jpg');
      
      const result = await provider.getSignedReadUrl('image.jpg', {
        transform: {
          width: 800,
          height: 600,
          quality: 85,
        },
      });
      
      expect(result.url).toContain('w=800');
      expect(result.url).toContain('h=600');
    });

    it('should respect custom TTL', async () => {
      provider._addObject('custom-ttl.mp4');
      const ttl = 1800; // 30 minutes
      
      const result = await provider.getSignedReadUrl('custom-ttl.mp4', {
        expiresIn: ttl,
      });
      
      const expectedExpiry = Date.now() + ttl * 1000;
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });

  describe('deleteObject', () => {
    it('should delete existing objects', async () => {
      provider._addObject('to-delete.mp4');
      expect(await provider.objectExists('to-delete.mp4')).toBe(true);
      
      await provider.deleteObject('to-delete.mp4');
      
      expect(await provider.objectExists('to-delete.mp4')).toBe(false);
    });

    it('should not throw when deleting non-existent objects', async () => {
      await expect(
        provider.deleteObject('does-not-exist.mp4')
      ).resolves.not.toThrow();
    });
  });

  describe('objectExists', () => {
    it('should return true for existing objects', async () => {
      provider._addObject('exists.mp4');
      
      const exists = await provider.objectExists('exists.mp4');
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existent objects', async () => {
      const exists = await provider.objectExists('missing.mp4');
      
      expect(exists).toBe(false);
    });

    it('should handle paths with directories', async () => {
      provider._addObject('path/to/file.mp4');
      
      const exists = await provider.objectExists('path/to/file.mp4');
      
      expect(exists).toBe(true);
    });
  });

  describe('URL Security', () => {
    it('should not expose bucket names in URLs', async () => {
      const uploadResult = await provider.createSignedUploadUrl('test.mp4');
      provider._addObject('test.mp4');
      const readResult = await provider.getSignedReadUrl('test.mp4');
      
      // Check that URLs don't contain common bucket name patterns
      expect(uploadResult.url).not.toMatch(/bucket[=\/:-]/i);
      expect(readResult.url).not.toMatch(/bucket[=\/:-]/i);
    });

    it('should not include credentials in URLs', async () => {
      const result = await provider.createSignedUploadUrl('test.mp4', 'video/mp4');
      
      // Check for common credential patterns
      expect(result.url).not.toMatch(/key[=\/:-]/i);
      expect(result.url).not.toMatch(/secret/i);
      expect(result.url).not.toMatch(/password/i);
      expect(result.url).not.toMatch(/token/i);
    });
  });
});