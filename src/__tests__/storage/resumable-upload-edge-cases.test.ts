/**
 * Resumable Upload Edge Cases Test Suite
 * Focus on 24h TTL scenarios and part ordering edge cases
 */

import { ResumableStorageProvider, ResumableUploadSession } from '@/lib/storage/types';

// Enhanced provider with TTL and part ordering simulation
class EdgeCaseResumableProvider implements ResumableStorageProvider {
  private objects = new Map<string, boolean>();
  private uploadSessions = new Map<string, {
    session: ResumableUploadSession;
    createdAt: Date;
    ttlSec: number;
    completedParts: Map<number, { etag: string; uploadedAt: Date }>;
    lastActivity: Date;
  }>();

  // Mock current time for testing
  private currentTime = new Date('2024-01-01T00:00:00Z');

  async createSignedUploadUrl(key: string, contentType: string, options = {}) {
    return {
      url: `https://edge-storage.test/upload/${key}`,
      headers: { 'content-type': contentType },
      expiresAt: new Date(this.currentTime.getTime() + 3600 * 1000),
    };
  }

  async getSignedReadUrl(key: string, options = {}) {
    if (!this.objects.has(key)) {
      throw new Error('Object not found');
    }
    return {
      url: `https://edge-storage.test/read/${key}`,
      expiresAt: new Date(this.currentTime.getTime() + 3600 * 1000),
    };
  }

  async deleteObject(key: string) {
    this.objects.delete(key);
  }

  async objectExists(key: string) {
    return this.objects.has(key);
  }

  async headObject(key: string) {
    const exists = this.objects.has(key);
    return {
      exists,
      size: exists ? 10485760 : undefined, // 10MB
      contentType: exists ? 'video/mp4' : undefined,
    };
  }

  async initResumableUpload(
    key: string,
    contentType: string,
    options?: {
      partCount?: number;
      ttlSec?: number;
    }
  ): Promise<ResumableUploadSession> {
    const uploadId = `edge_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const partCount = options?.partCount || 5; // Default to 5 parts for edge testing
    const ttlSec = options?.ttlSec || 86400; // Default 24 hours
    
    const parts = [];
    for (let i = 1; i <= partCount; i++) {
      parts.push({
        partNumber: i,
        url: `https://edge-storage.test/upload/${uploadId}/part${i}`,
        expiresAt: new Date(this.currentTime.getTime() + ttlSec * 1000),
      });
    }
    
    const session: ResumableUploadSession = {
      uploadId,
      key,
      parts,
    };
    
    this.uploadSessions.set(uploadId, {
      session,
      createdAt: new Date(this.currentTime),
      ttlSec,
      completedParts: new Map(),
      lastActivity: new Date(this.currentTime),
    });
    
    return session;
  }

  async completeResumableUpload(
    uploadId: string,
    parts: Array<{
      partNumber: number;
      etag: string;
    }>
  ): Promise<void> {
    const sessionData = this.uploadSessions.get(uploadId);
    if (!sessionData) {
      throw new Error('Upload session not found');
    }

    // Check if session has expired
    const sessionAge = (this.currentTime.getTime() - sessionData.createdAt.getTime()) / 1000;
    if (sessionAge > sessionData.ttlSec) {
      throw new Error('Upload session expired');
    }

    // Check for session inactivity timeout (6 hours)
    const inactivityPeriod = (this.currentTime.getTime() - sessionData.lastActivity.getTime()) / 1000;
    if (inactivityPeriod > 21600) { // 6 hours
      throw new Error('Upload session timed out due to inactivity');
    }
    
    // Validate all parts are provided
    const expectedParts = sessionData.session.parts.map(p => p.partNumber).sort();
    const providedParts = parts.map(p => p.partNumber).sort();
    
    if (expectedParts.length !== providedParts.length) {
      throw new Error(`Expected ${expectedParts.length} parts, got ${providedParts.length}`);
    }

    // Check for duplicate part numbers
    const uniqueParts = new Set(providedParts);
    if (uniqueParts.size !== providedParts.length) {
      throw new Error('Duplicate part numbers detected');
    }

    // Verify all expected parts are present
    for (const expectedPart of expectedParts) {
      if (!providedParts.includes(expectedPart)) {
        throw new Error(`Missing part ${expectedPart}`);
      }
    }

    // Validate part ETags match uploaded parts
    for (const part of parts) {
      const uploadedPart = sessionData.completedParts.get(part.partNumber);
      if (uploadedPart && uploadedPart.etag !== part.etag) {
        throw new Error(`ETag mismatch for part ${part.partNumber}`);
      }
    }
    
    // Mark object as complete
    this.objects.set(sessionData.session.key, true);
    
    // Cleanup
    this.uploadSessions.delete(uploadId);
  }

  async abortResumableUpload(uploadId: string): Promise<void> {
    const sessionData = this.uploadSessions.get(uploadId);
    if (!sessionData) {
      return; // Gracefully handle non-existent sessions
    }

    // Check if session has already expired
    const sessionAge = (this.currentTime.getTime() - sessionData.createdAt.getTime()) / 1000;
    if (sessionAge > sessionData.ttlSec) {
      // Session already expired, just cleanup
      this.uploadSessions.delete(uploadId);
      return;
    }

    this.uploadSessions.delete(uploadId);
  }

  // Test helpers
  _simulatePartUpload(uploadId: string, partNumber: number, etag: string, uploadTime?: Date) {
    const sessionData = this.uploadSessions.get(uploadId);
    if (!sessionData) {
      throw new Error('Session not found');
    }

    // Check if part upload is within TTL
    const partTTL = sessionData.session.parts.find(p => p.partNumber === partNumber);
    if (partTTL) {
      const uploadTimeActual = uploadTime || this.currentTime;
      if (uploadTimeActual > partTTL.expiresAt) {
        throw new Error(`Part ${partNumber} upload URL has expired`);
      }
    }

    sessionData.completedParts.set(partNumber, {
      etag,
      uploadedAt: uploadTime || new Date(this.currentTime),
    });
    sessionData.lastActivity = uploadTime || new Date(this.currentTime);
  }

  _advanceTime(seconds: number) {
    this.currentTime = new Date(this.currentTime.getTime() + seconds * 1000);
  }

  _resetTime() {
    this.currentTime = new Date('2024-01-01T00:00:00Z');
  }

  _getSessionData(uploadId: string) {
    return this.uploadSessions.get(uploadId);
  }

  _getCurrentTime() {
    return new Date(this.currentTime);
  }
}

describe('Resumable Upload Edge Cases', () => {
  let provider: EdgeCaseResumableProvider;

  beforeEach(() => {
    provider = new EdgeCaseResumableProvider();
    provider._resetTime();
  });

  describe('24-Hour TTL Scenarios', () => {
    it('should handle upload completing just before 24h TTL expiry', async () => {
      const session = await provider.initResumableUpload('24h-edge.mp4', 'video/mp4', {
        partCount: 10,
        ttlSec: 86400, // 24 hours
      });

      // Upload parts over 23 hours
      for (let i = 1; i <= 10; i++) {
        provider._advanceTime(8280); // 2.3 hours per part
        provider._simulatePartUpload(session.uploadId, i, `etag${i}`);
      }

      // Should be at 23 hours now
      const parts = Array.from({ length: 10 }, (_, i) => ({
        partNumber: i + 1,
        etag: `etag${i + 1}`,
      }));

      // Complete just before 24h
      provider._advanceTime(3500); // Move to 23h 58m 20s
      await expect(
        provider.completeResumableUpload(session.uploadId, parts)
      ).resolves.not.toThrow();

      expect(await provider.objectExists('24h-edge.mp4')).toBe(true);
    });

    it('should fail upload after 24h TTL expiry', async () => {
      const session = await provider.initResumableUpload('24h-expired.mp4', 'video/mp4', {
        partCount: 5,
        ttlSec: 86400,
      });

      // Upload some parts within TTL
      provider._simulatePartUpload(session.uploadId, 1, 'etag1');
      provider._advanceTime(43200); // 12 hours
      provider._simulatePartUpload(session.uploadId, 2, 'etag2');

      // Advance past 24h
      provider._advanceTime(43201); // Total: 24h + 1s

      // Try to complete after expiry
      await expect(
        provider.completeResumableUpload(session.uploadId, [
          { partNumber: 1, etag: 'etag1' },
          { partNumber: 2, etag: 'etag2' },
          { partNumber: 3, etag: 'etag3' },
          { partNumber: 4, etag: 'etag4' },
          { partNumber: 5, etag: 'etag5' },
        ])
      ).rejects.toThrow('Upload session expired');
    });

    it('should handle resume after 23h idle time', async () => {
      const session = await provider.initResumableUpload('resume-23h.mp4', 'video/mp4', {
        partCount: 3,
        ttlSec: 86400,
      });

      // Upload first part
      provider._simulatePartUpload(session.uploadId, 1, 'etag1');

      // Idle for 23 hours
      provider._advanceTime(82800); // 23 hours

      // Resume and complete
      provider._simulatePartUpload(session.uploadId, 2, 'etag2');
      provider._simulatePartUpload(session.uploadId, 3, 'etag3');

      await provider.completeResumableUpload(session.uploadId, [
        { partNumber: 1, etag: 'etag1' },
        { partNumber: 2, etag: 'etag2' },
        { partNumber: 3, etag: 'etag3' },
      ]);

      expect(await provider.objectExists('resume-23h.mp4')).toBe(true);
    });

    it('should fail individual part upload after part URL expiry', async () => {
      const session = await provider.initResumableUpload('part-expiry.mp4', 'video/mp4', {
        partCount: 3,
        ttlSec: 86400,
      });

      // Upload first part immediately
      provider._simulatePartUpload(session.uploadId, 1, 'etag1');

      // Advance past 24h
      provider._advanceTime(86401);

      // Try to upload expired part
      expect(() => {
        provider._simulatePartUpload(session.uploadId, 2, 'etag2');
      }).toThrow('Part 2 upload URL has expired');
    });

    it('should track last activity and timeout after 6h inactivity', async () => {
      const session = await provider.initResumableUpload('inactive.mp4', 'video/mp4', {
        partCount: 3,
        ttlSec: 86400,
      });

      // Upload first part
      provider._simulatePartUpload(session.uploadId, 1, 'etag1');

      // Idle for 6 hours and 1 second
      provider._advanceTime(21601);

      // Try to complete after inactivity timeout
      await expect(
        provider.completeResumableUpload(session.uploadId, [
          { partNumber: 1, etag: 'etag1' },
          { partNumber: 2, etag: 'etag2' },
          { partNumber: 3, etag: 'etag3' },
        ])
      ).rejects.toThrow('Upload session timed out due to inactivity');
    });
  });

  describe('Part Ordering Edge Cases', () => {
    it('should handle parts uploaded in reverse order', async () => {
      const session = await provider.initResumableUpload('reverse-order.mp4', 'video/mp4', {
        partCount: 5,
      });

      // Upload parts in reverse order
      for (let i = 5; i >= 1; i--) {
        provider._simulatePartUpload(session.uploadId, i, `etag${i}`);
      }

      // Complete with correct order in request
      const parts = Array.from({ length: 5 }, (_, i) => ({
        partNumber: i + 1,
        etag: `etag${i + 1}`,
      }));

      await provider.completeResumableUpload(session.uploadId, parts);
      expect(await provider.objectExists('reverse-order.mp4')).toBe(true);
    });

    it('should handle random part upload order', async () => {
      const session = await provider.initResumableUpload('random-order.mp4', 'video/mp4', {
        partCount: 7,
      });

      // Upload parts in random order: 3, 7, 1, 5, 2, 6, 4
      const randomOrder = [3, 7, 1, 5, 2, 6, 4];
      for (const partNum of randomOrder) {
        provider._simulatePartUpload(session.uploadId, partNum, `etag${partNum}`);
        provider._advanceTime(3600); // 1 hour between parts
      }

      // Complete with all parts
      const parts = Array.from({ length: 7 }, (_, i) => ({
        partNumber: i + 1,
        etag: `etag${i + 1}`,
      }));

      await provider.completeResumableUpload(session.uploadId, parts);
      expect(await provider.objectExists('random-order.mp4')).toBe(true);
    });

    it('should reject duplicate part numbers in completion', async () => {
      const session = await provider.initResumableUpload('duplicate-parts.mp4', 'video/mp4', {
        partCount: 3,
      });

      // Upload all parts
      provider._simulatePartUpload(session.uploadId, 1, 'etag1');
      provider._simulatePartUpload(session.uploadId, 2, 'etag2');
      provider._simulatePartUpload(session.uploadId, 3, 'etag3');

      // Try to complete with duplicate part
      await expect(
        provider.completeResumableUpload(session.uploadId, [
          { partNumber: 1, etag: 'etag1' },
          { partNumber: 2, etag: 'etag2' },
          { partNumber: 2, etag: 'etag2' }, // Duplicate
          { partNumber: 3, etag: 'etag3' },
        ])
      ).rejects.toThrow('Duplicate part numbers detected');
    });

    it('should handle sparse part numbers correctly', async () => {
      const session = await provider.initResumableUpload('sparse-parts.mp4', 'video/mp4', {
        partCount: 3,
      });

      // Upload parts with delays
      provider._simulatePartUpload(session.uploadId, 1, 'etag1');
      provider._advanceTime(7200); // 2 hours
      provider._simulatePartUpload(session.uploadId, 3, 'etag3');
      provider._advanceTime(7200); // 2 hours
      provider._simulatePartUpload(session.uploadId, 2, 'etag2');

      // Complete with all parts
      await provider.completeResumableUpload(session.uploadId, [
        { partNumber: 1, etag: 'etag1' },
        { partNumber: 2, etag: 'etag2' },
        { partNumber: 3, etag: 'etag3' },
      ]);

      expect(await provider.objectExists('sparse-parts.mp4')).toBe(true);
    });

    it('should validate ETag consistency', async () => {
      const session = await provider.initResumableUpload('etag-mismatch.mp4', 'video/mp4', {
        partCount: 3,
      });

      // Upload parts
      provider._simulatePartUpload(session.uploadId, 1, 'etag1');
      provider._simulatePartUpload(session.uploadId, 2, 'etag2');
      provider._simulatePartUpload(session.uploadId, 3, 'etag3');

      // Try to complete with wrong ETag
      await expect(
        provider.completeResumableUpload(session.uploadId, [
          { partNumber: 1, etag: 'etag1' },
          { partNumber: 2, etag: 'wrong-etag' }, // Wrong ETag
          { partNumber: 3, etag: 'etag3' },
        ])
      ).rejects.toThrow('ETag mismatch for part 2');
    });

    it('should handle large part count (100 parts)', async () => {
      const session = await provider.initResumableUpload('large-multipart.mp4', 'video/mp4', {
        partCount: 100,
        ttlSec: 86400,
      });

      // Upload all 100 parts
      for (let i = 1; i <= 100; i++) {
        provider._simulatePartUpload(session.uploadId, i, `etag${i}`);
        // Simulate realistic upload time
        provider._advanceTime(60); // 1 minute per part
      }

      // Complete with all parts
      const parts = Array.from({ length: 100 }, (_, i) => ({
        partNumber: i + 1,
        etag: `etag${i + 1}`,
      }));

      await provider.completeResumableUpload(session.uploadId, parts);
      expect(await provider.objectExists('large-multipart.mp4')).toBe(true);
    });
  });

  describe('Resume After TTL Scenarios', () => {
    it('should handle resume with new session after 24h', async () => {
      // First session
      const session1 = await provider.initResumableUpload('resume-new.mp4', 'video/mp4', {
        partCount: 5,
        ttlSec: 86400,
      });

      // Upload some parts
      provider._simulatePartUpload(session1.uploadId, 1, 'etag1');
      provider._simulatePartUpload(session1.uploadId, 2, 'etag2');

      // Session expires after 24h
      provider._advanceTime(86401);

      // Verify old session is expired
      await expect(
        provider.completeResumableUpload(session1.uploadId, [
          { partNumber: 1, etag: 'etag1' },
          { partNumber: 2, etag: 'etag2' },
          { partNumber: 3, etag: 'etag3' },
          { partNumber: 4, etag: 'etag4' },
          { partNumber: 5, etag: 'etag5' },
        ])
      ).rejects.toThrow('Upload session expired');

      // Create new session for same file
      const session2 = await provider.initResumableUpload('resume-new.mp4', 'video/mp4', {
        partCount: 5,
        ttlSec: 86400,
      });

      // Upload all parts in new session
      for (let i = 1; i <= 5; i++) {
        provider._simulatePartUpload(session2.uploadId, i, `new-etag${i}`);
      }

      // Complete new session
      const newParts = Array.from({ length: 5 }, (_, i) => ({
        partNumber: i + 1,
        etag: `new-etag${i + 1}`,
      }));

      await provider.completeResumableUpload(session2.uploadId, newParts);
      expect(await provider.objectExists('resume-new.mp4')).toBe(true);
    });

    it('should handle partial upload recovery', async () => {
      const session = await provider.initResumableUpload('partial-recovery.mp4', 'video/mp4', {
        partCount: 10,
        ttlSec: 86400,
      });

      // Upload first 7 parts over 20 hours
      for (let i = 1; i <= 7; i++) {
        provider._simulatePartUpload(session.uploadId, i, `etag${i}`);
        provider._advanceTime(10800); // 3 hours per part
      }

      // Now at 21 hours, upload remaining parts quickly
      for (let i = 8; i <= 10; i++) {
        provider._simulatePartUpload(session.uploadId, i, `etag${i}`);
        provider._advanceTime(600); // 10 minutes per part
      }

      // Complete within 24h window (at ~21.5 hours)
      const parts = Array.from({ length: 10 }, (_, i) => ({
        partNumber: i + 1,
        etag: `etag${i + 1}`,
      }));

      await provider.completeResumableUpload(session.uploadId, parts);
      expect(await provider.objectExists('partial-recovery.mp4')).toBe(true);
    });
  });

  describe('Concurrent Upload Sessions', () => {
    it('should handle multiple sessions with different TTLs', async () => {
      // Create sessions with different TTLs
      const shortSession = await provider.initResumableUpload('short-ttl.mp4', 'video/mp4', {
        partCount: 2,
        ttlSec: 3600, // 1 hour
      });

      const mediumSession = await provider.initResumableUpload('medium-ttl.mp4', 'video/mp4', {
        partCount: 3,
        ttlSec: 43200, // 12 hours
      });

      const longSession = await provider.initResumableUpload('long-ttl.mp4', 'video/mp4', {
        partCount: 4,
        ttlSec: 86400, // 24 hours
      });

      // Upload parts for all sessions
      provider._simulatePartUpload(shortSession.uploadId, 1, 'short1');
      provider._simulatePartUpload(mediumSession.uploadId, 1, 'medium1');
      provider._simulatePartUpload(longSession.uploadId, 1, 'long1');

      // Advance 2 hours - short session should be expired
      provider._advanceTime(7200);

      // Short session should fail
      await expect(
        provider.completeResumableUpload(shortSession.uploadId, [
          { partNumber: 1, etag: 'short1' },
          { partNumber: 2, etag: 'short2' },
        ])
      ).rejects.toThrow('Upload session expired');

      // Medium and long sessions should still work
      provider._simulatePartUpload(mediumSession.uploadId, 2, 'medium2');
      provider._simulatePartUpload(mediumSession.uploadId, 3, 'medium3');
      
      await provider.completeResumableUpload(mediumSession.uploadId, [
        { partNumber: 1, etag: 'medium1' },
        { partNumber: 2, etag: 'medium2' },
        { partNumber: 3, etag: 'medium3' },
      ]);

      expect(await provider.objectExists('medium-ttl.mp4')).toBe(true);
    });
  });

  describe('Abort Scenarios', () => {
    it('should handle abort of expired session gracefully', async () => {
      const session = await provider.initResumableUpload('abort-expired.mp4', 'video/mp4', {
        ttlSec: 3600,
      });

      // Expire the session
      provider._advanceTime(3601);

      // Should not throw when aborting expired session
      await expect(
        provider.abortResumableUpload(session.uploadId)
      ).resolves.not.toThrow();
    });

    it('should cleanup partial uploads on abort', async () => {
      const session = await provider.initResumableUpload('abort-partial.mp4', 'video/mp4', {
        partCount: 5,
      });

      // Upload some parts
      provider._simulatePartUpload(session.uploadId, 1, 'etag1');
      provider._simulatePartUpload(session.uploadId, 3, 'etag3');

      // Abort the upload
      await provider.abortResumableUpload(session.uploadId);

      // Session should be gone
      expect(provider._getSessionData(session.uploadId)).toBeUndefined();
      
      // Object should not exist
      expect(await provider.objectExists('abort-partial.mp4')).toBe(false);
    });
  });
});