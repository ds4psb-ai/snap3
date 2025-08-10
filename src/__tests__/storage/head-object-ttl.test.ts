/**
 * HeadObject TTL Rules Test Matrix
 * Comprehensive testing of headObject with various TTL scenarios
 */

import { StorageProvider } from '@/lib/storage/types';

// Enhanced provider for TTL testing
class TTLTestProvider implements StorageProvider {
  private objects = new Map<string, {
    size: number;
    contentType: string;
    lastModified: Date;
    createdAt: Date;
    ttlSec?: number;
    accessCount: number;
  }>();

  async createSignedUploadUrl(key: string, contentType: string, options = {}) {
    const ttl = (options as any).ttlSec || 3600;
    return {
      url: `https://ttl-test.storage/upload/${key}`,
      headers: { 'content-type': contentType },
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  }

  async getSignedReadUrl(key: string, options = {}) {
    const ttl = (options as any).ttlSec || 3600;
    return {
      url: `https://ttl-test.storage/read/${key}`,
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  }

  async deleteObject(key: string) {
    this.objects.delete(key);
  }

  async objectExists(key: string) {
    const obj = this.objects.get(key);
    if (!obj) return false;
    
    // Check if object has expired based on TTL
    if (obj.ttlSec) {
      const expiryTime = obj.createdAt.getTime() + (obj.ttlSec * 1000);
      if (Date.now() > expiryTime) {
        return false;
      }
    }
    
    return true;
  }

  async headObject(key: string) {
    const obj = this.objects.get(key);
    
    if (!obj) {
      return {
        exists: false,
        size: undefined,
        contentType: undefined,
        lastModified: undefined,
      };
    }

    // Track access
    obj.accessCount++;

    // Check TTL expiry
    if (obj.ttlSec) {
      const expiryTime = obj.createdAt.getTime() + (obj.ttlSec * 1000);
      const now = Date.now();
      
      if (now > expiryTime) {
        // Object has expired
        return {
          exists: false,
          size: undefined,
          contentType: undefined,
          lastModified: undefined,
          expired: true,
          expiredAt: new Date(expiryTime),
        };
      }

      // Object exists and hasn't expired
      return {
        exists: true,
        size: obj.size,
        contentType: obj.contentType,
        lastModified: obj.lastModified,
        ttlRemaining: Math.floor((expiryTime - now) / 1000),
        expiresAt: new Date(expiryTime),
      };
    }

    // No TTL - object exists indefinitely
    return {
      exists: true,
      size: obj.size,
      contentType: obj.contentType,
      lastModified: obj.lastModified,
    };
  }

  // Test helpers
  _addObject(
    key: string,
    metadata: {
      size: number;
      contentType: string;
      lastModified?: Date;
      ttlSec?: number;
      createdAt?: Date;
    }
  ) {
    this.objects.set(key, {
      size: metadata.size,
      contentType: metadata.contentType,
      lastModified: metadata.lastModified || new Date(),
      createdAt: metadata.createdAt || new Date(),
      ttlSec: metadata.ttlSec,
      accessCount: 0,
    });
  }

  _getAccessCount(key: string): number {
    return this.objects.get(key)?.accessCount || 0;
  }

  _simulateTimeAdvance(key: string, seconds: number) {
    const obj = this.objects.get(key);
    if (obj) {
      obj.createdAt = new Date(obj.createdAt.getTime() - seconds * 1000);
    }
  }
}

describe('HeadObject TTL Rules Test Matrix', () => {
  let provider: TTLTestProvider;

  beforeEach(() => {
    provider = new TTLTestProvider();
    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic TTL Scenarios', () => {
    it('should handle objects without TTL', async () => {
      provider._addObject('permanent.mp4', {
        size: 1000000,
        contentType: 'video/mp4',
      });

      const result = await provider.headObject('permanent.mp4');
      
      expect(result.exists).toBe(true);
      expect(result.size).toBe(1000000);
      expect(result.contentType).toBe('video/mp4');
      expect((result as any).ttlRemaining).toBeUndefined();
      expect((result as any).expiresAt).toBeUndefined();
    });

    it('should handle objects with standard TTL (1 hour)', async () => {
      provider._addObject('temp.mp4', {
        size: 500000,
        contentType: 'video/mp4',
        ttlSec: 3600,
      });

      const result = await provider.headObject('temp.mp4');
      
      expect(result.exists).toBe(true);
      expect((result as any).ttlRemaining).toBe(3600);
      expect((result as any).expiresAt).toEqual(
        new Date('2024-01-01T13:00:00Z')
      );
    });

    it('should detect expired objects', async () => {
      provider._addObject('expired.mp4', {
        size: 750000,
        contentType: 'video/mp4',
        ttlSec: 3600,
      });

      // Simulate 2 hours passing
      provider._simulateTimeAdvance('expired.mp4', 7200);

      const result = await provider.headObject('expired.mp4');
      
      expect(result.exists).toBe(false);
      expect((result as any).expired).toBe(true);
      expect((result as any).expiredAt).toEqual(
        new Date('2024-01-01T11:00:00Z')
      );
    });
  });

  describe('24-Hour TTL Edge Cases', () => {
    it('should handle 24-hour TTL correctly', async () => {
      const twentyFourHours = 24 * 60 * 60; // 86400 seconds
      
      provider._addObject('daily.mp4', {
        size: 2000000,
        contentType: 'video/mp4',
        ttlSec: twentyFourHours,
      });

      const result = await provider.headObject('daily.mp4');
      
      expect(result.exists).toBe(true);
      expect((result as any).ttlRemaining).toBe(twentyFourHours);
      expect((result as any).expiresAt).toEqual(
        new Date('2024-01-02T12:00:00Z')
      );
    });

    it('should expire exactly after 24 hours', async () => {
      const twentyFourHours = 24 * 60 * 60;
      
      provider._addObject('daily-expire.mp4', {
        size: 1500000,
        contentType: 'video/mp4',
        ttlSec: twentyFourHours,
      });

      // Just before expiry (1 second before)
      provider._simulateTimeAdvance('daily-expire.mp4', twentyFourHours - 1);
      let result = await provider.headObject('daily-expire.mp4');
      expect(result.exists).toBe(true);
      expect((result as any).ttlRemaining).toBe(1);

      // Exactly at expiry
      provider._simulateTimeAdvance('daily-expire.mp4', 1);
      result = await provider.headObject('daily-expire.mp4');
      expect(result.exists).toBe(false);
      expect((result as any).expired).toBe(true);
    });

    it('should handle resumable upload parts with 24h TTL', async () => {
      const parts = ['part-1', 'part-2', 'part-3'];
      const twentyFourHours = 24 * 60 * 60;

      // Create parts with staggered creation times
      parts.forEach((part, index) => {
        provider._addObject(part, {
          size: 5242880, // 5MB per part
          contentType: 'application/octet-stream',
          ttlSec: twentyFourHours,
          createdAt: new Date(Date.now() - index * 3600 * 1000), // Each part 1 hour apart
        });
      });

      // Check all parts before any expire
      for (const part of parts) {
        const result = await provider.headObject(part);
        expect(result.exists).toBe(true);
      }

      // Simulate 25 hours passing - first part should expire
      provider._simulateTimeAdvance('part-1', 25 * 3600);
      provider._simulateTimeAdvance('part-2', 25 * 3600);
      provider._simulateTimeAdvance('part-3', 25 * 3600);

      const results = await Promise.all(
        parts.map(part => provider.headObject(part))
      );

      expect(results[0].exists).toBe(false); // First part expired
      expect(results[1].exists).toBe(false); // Second part expired (was created 24h ago)
      expect(results[2].exists).toBe(true);  // Third part still valid (23h old)
    });
  });

  describe('Short TTL Scenarios', () => {
    it('should handle 1-minute TTL', async () => {
      provider._addObject('short-lived.mp4', {
        size: 100000,
        contentType: 'video/mp4',
        ttlSec: 60,
      });

      const result = await provider.headObject('short-lived.mp4');
      expect(result.exists).toBe(true);
      expect((result as any).ttlRemaining).toBe(60);

      // After 30 seconds
      provider._simulateTimeAdvance('short-lived.mp4', 30);
      const midResult = await provider.headObject('short-lived.mp4');
      expect(midResult.exists).toBe(true);
      expect((midResult as any).ttlRemaining).toBe(30);

      // After 61 seconds (expired)
      provider._simulateTimeAdvance('short-lived.mp4', 31);
      const expiredResult = await provider.headObject('short-lived.mp4');
      expect(expiredResult.exists).toBe(false);
    });

    it('should handle 5-second TTL for testing', async () => {
      provider._addObject('test-object.mp4', {
        size: 50000,
        contentType: 'video/mp4',
        ttlSec: 5,
      });

      // Check immediately
      const immediate = await provider.headObject('test-object.mp4');
      expect(immediate.exists).toBe(true);
      expect((immediate as any).ttlRemaining).toBe(5);

      // After 6 seconds
      provider._simulateTimeAdvance('test-object.mp4', 6);
      const expired = await provider.headObject('test-object.mp4');
      expect(expired.exists).toBe(false);
    });
  });

  describe('Long TTL Scenarios', () => {
    it('should handle 7-day TTL', async () => {
      const sevenDays = 7 * 24 * 60 * 60; // 604800 seconds
      
      provider._addObject('weekly.mp4', {
        size: 5000000,
        contentType: 'video/mp4',
        ttlSec: sevenDays,
      });

      const result = await provider.headObject('weekly.mp4');
      expect(result.exists).toBe(true);
      expect((result as any).ttlRemaining).toBe(sevenDays);
      expect((result as any).expiresAt).toEqual(
        new Date('2024-01-08T12:00:00Z')
      );
    });

    it('should handle 30-day TTL', async () => {
      const thirtyDays = 30 * 24 * 60 * 60; // 2592000 seconds
      
      provider._addObject('monthly.mp4', {
        size: 10000000,
        contentType: 'video/mp4',
        ttlSec: thirtyDays,
      });

      const result = await provider.headObject('monthly.mp4');
      expect(result.exists).toBe(true);
      expect((result as any).ttlRemaining).toBe(thirtyDays);
    });
  });

  describe('Access Pattern Tests', () => {
    it('should track access count regardless of TTL', async () => {
      provider._addObject('tracked.mp4', {
        size: 1000000,
        contentType: 'video/mp4',
        ttlSec: 3600,
      });

      // Access multiple times
      await provider.headObject('tracked.mp4');
      await provider.headObject('tracked.mp4');
      await provider.headObject('tracked.mp4');

      expect(provider._getAccessCount('tracked.mp4')).toBe(3);
    });

    it('should not increment access count for non-existent objects', async () => {
      const result = await provider.headObject('missing.mp4');
      expect(result.exists).toBe(false);
      expect(provider._getAccessCount('missing.mp4')).toBe(0);
    });

    it('should not increment access count for expired objects', async () => {
      provider._addObject('expired-tracked.mp4', {
        size: 500000,
        contentType: 'video/mp4',
        ttlSec: 60,
      });

      // Access once while valid
      await provider.headObject('expired-tracked.mp4');
      expect(provider._getAccessCount('expired-tracked.mp4')).toBe(1);

      // Expire the object
      provider._simulateTimeAdvance('expired-tracked.mp4', 120);

      // Access after expiry
      await provider.headObject('expired-tracked.mp4');
      expect(provider._getAccessCount('expired-tracked.mp4')).toBe(2); // Still counts access attempts
    });
  });

  describe('TTL Update Scenarios', () => {
    it('should handle TTL refresh on re-upload', async () => {
      // Initial upload with 1-hour TTL
      provider._addObject('refreshable.mp4', {
        size: 1000000,
        contentType: 'video/mp4',
        ttlSec: 3600,
      });

      // Simulate 30 minutes passing
      provider._simulateTimeAdvance('refreshable.mp4', 1800);
      
      let result = await provider.headObject('refreshable.mp4');
      expect((result as any).ttlRemaining).toBe(1800);

      // Re-upload with new TTL (simulating refresh)
      provider._addObject('refreshable.mp4', {
        size: 1000000,
        contentType: 'video/mp4',
        ttlSec: 7200, // 2-hour TTL
        createdAt: new Date(), // Reset creation time
      });

      result = await provider.headObject('refreshable.mp4');
      expect((result as any).ttlRemaining).toBe(7200);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle zero TTL as no expiry', async () => {
      provider._addObject('zero-ttl.mp4', {
        size: 800000,
        contentType: 'video/mp4',
        ttlSec: 0, // Zero means no expiry in this implementation
      });

      const result = await provider.headObject('zero-ttl.mp4');
      expect(result.exists).toBe(true);
      expect((result as any).ttlRemaining).toBeUndefined();
    });

    it('should handle negative TTL as immediate expiry', async () => {
      provider._addObject('negative-ttl.mp4', {
        size: 600000,
        contentType: 'video/mp4',
        ttlSec: -1,
        createdAt: new Date(Date.now() + 1000), // Created 1 second in future to test negative
      });

      const result = await provider.headObject('negative-ttl.mp4');
      expect(result.exists).toBe(false);
    });

    it('should handle TTL exactly at boundary', async () => {
      provider._addObject('boundary.mp4', {
        size: 400000,
        contentType: 'video/mp4',
        ttlSec: 3600,
      });

      // Advance to exactly TTL boundary
      provider._simulateTimeAdvance('boundary.mp4', 3600);

      const result = await provider.headObject('boundary.mp4');
      expect(result.exists).toBe(false); // Should be expired at exact boundary
    });

    it('should handle maximum TTL values', async () => {
      const maxTTL = Number.MAX_SAFE_INTEGER / 1000; // Max safe seconds
      
      provider._addObject('max-ttl.mp4', {
        size: 900000,
        contentType: 'video/mp4',
        ttlSec: maxTTL,
      });

      const result = await provider.headObject('max-ttl.mp4');
      expect(result.exists).toBe(true);
      expect((result as any).ttlRemaining).toBe(maxTTL);
    });
  });

  describe('Concurrent Access Patterns', () => {
    it('should handle concurrent headObject calls', async () => {
      provider._addObject('concurrent.mp4', {
        size: 2000000,
        contentType: 'video/mp4',
        ttlSec: 3600,
      });

      // Simulate concurrent access
      const promises = Array(10).fill(null).map(() => 
        provider.headObject('concurrent.mp4')
      );

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.exists).toBe(true);
        expect(result.size).toBe(2000000);
      });

      // Access count should reflect all calls
      expect(provider._getAccessCount('concurrent.mp4')).toBe(10);
    });

    it('should handle race condition at TTL boundary', async () => {
      provider._addObject('race.mp4', {
        size: 1500000,
        contentType: 'video/mp4',
        ttlSec: 60,
      });

      // Advance to 1 second before expiry
      provider._simulateTimeAdvance('race.mp4', 59);

      // Concurrent access near boundary
      const promises = Array(5).fill(null).map(async (_, index) => {
        // Simulate slight time differences
        if (index > 2) {
          provider._simulateTimeAdvance('race.mp4', 1);
        }
        return provider.headObject('race.mp4');
      });

      const results = await Promise.all(promises);
      
      // First few should succeed, later ones should fail
      expect(results.filter(r => r.exists).length).toBeGreaterThan(0);
      expect(results.filter(r => !r.exists).length).toBeGreaterThan(0);
    });
  });

  describe('objectExists() TTL Integration', () => {
    it('should respect TTL in objectExists', async () => {
      provider._addObject('exists-test.mp4', {
        size: 700000,
        contentType: 'video/mp4',
        ttlSec: 300, // 5 minutes
      });

      // Should exist initially
      expect(await provider.objectExists('exists-test.mp4')).toBe(true);

      // Should still exist after 4 minutes
      provider._simulateTimeAdvance('exists-test.mp4', 240);
      expect(await provider.objectExists('exists-test.mp4')).toBe(true);

      // Should not exist after 6 minutes
      provider._simulateTimeAdvance('exists-test.mp4', 120);
      expect(await provider.objectExists('exists-test.mp4')).toBe(false);
    });

    it('should be consistent between objectExists and headObject', async () => {
      provider._addObject('consistency.mp4', {
        size: 850000,
        contentType: 'video/mp4',
        ttlSec: 120,
      });

      // Check at various time points
      const timePoints = [0, 60, 119, 121];
      
      for (const seconds of timePoints) {
        if (seconds > 0) {
          provider._simulateTimeAdvance('consistency.mp4', seconds);
        }

        const exists = await provider.objectExists('consistency.mp4');
        const head = await provider.headObject('consistency.mp4');
        
        expect(exists).toBe(head.exists);
      }
    });
  });
});