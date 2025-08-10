import { describe, it, expect } from '@jest/globals';
import { extractEvidencePack } from '@/lib/evidence/extract';

describe('Evidence Pack Extraction', () => {
  const mockVDPFull = {
    digest_id: 'C0008888',
    platform_metadata: {
      platform: 'Instagram',
      view_count: 5000000,
      like_count: 80000,
      comment_count: 7000,
      share_count: 30000,
      upload_date: '2024-01-15T00:00:00Z',
    },
    video_origin: 'Real-Footage',
    overall_analysis: {
      confidence: 0.95, // Extract function expects direct number
      audience_reaction: {
        overall_sentiment: 'Highly Positive',
        notable_comments: [
          { text: 'Great product!', lang: 'en' },
        ],
      },
      asr_transcript: 'This should not be exposed',
      summary: 'This is the full analysis that should be masked',
    },
    scenes: [
      {
        narrative_unit: {
          narrative_role: 'Hook',
          summary: 'Opening scene details',
        },
      },
    ],
  };

  it('extracts evidence chips from VDP correctly', () => {
    const evidencePack = extractEvidencePack(mockVDPFull);
    
    expect(evidencePack).toHaveProperty('digestId', 'C0008888');
    expect(evidencePack).toHaveProperty('trustScore');
    expect(evidencePack).toHaveProperty('evidenceChips');
    expect(evidencePack).toHaveProperty('synthIdDetected');
    
    // Check evidence chips
    expect(evidencePack.evidenceChips).toBeInstanceOf(Array);
    expect(evidencePack.evidenceChips.length).toBeGreaterThanOrEqual(3);
    expect(evidencePack.evidenceChips.length).toBeLessThanOrEqual(5);
    
    // Verify chip structure - chips are strings
    evidencePack.evidenceChips.forEach(chip => {
      expect(typeof chip).toBe('string');
      expect(chip.length).toBeGreaterThan(0);
    });
  });

  it('calculates trust score based on confidence metrics', () => {
    const evidencePack = extractEvidencePack(mockVDPFull);
    
    // Trust score should be based on overall confidence (0.95 -> rounded to integer)
    expect(evidencePack.trustScore).toBe(95);
    
    // Test with lower confidence
    const lowConfidenceVDP = {
      ...mockVDPFull,
      overall_analysis: {
        ...mockVDPFull.overall_analysis,
        confidence: 0.65, // Note: extract function expects direct number, not nested object
      },
    };
    
    const lowConfidencePack = extractEvidencePack(lowConfidenceVDP);
    expect(lowConfidencePack.trustScore).toBe(65);
  });

  it('detects AI-generated content correctly', () => {
    // Real footage
    let evidencePack = extractEvidencePack(mockVDPFull);
    expect(evidencePack.synthIdDetected).toBe(false);
    
    // AI-generated
    const aiGeneratedVDP = {
      ...mockVDPFull,
      video_origin: 'AI-Generated', // Note: extract function expects video_origin at root level
    };
    
    evidencePack = extractEvidencePack(aiGeneratedVDP);
    expect(evidencePack.synthIdDetected).toBe(true);
  });

  it('adds virality chip for high engagement', () => {
    const evidencePack = extractEvidencePack(mockVDPFull);
    
    // Should have virality chip for 5M views - extract function generates "Viral: 1M+ views"
    const viralityChip = evidencePack.evidenceChips.find(
      (chip: string) => chip.includes('Viral')
    );
    expect(viralityChip).toBeDefined();
    expect(viralityChip).toBe('Viral: 1M+ views');
    
    // Test with low engagement
    const lowEngagementVDP = {
      ...mockVDPFull,
      platform_metadata: {
        ...mockVDPFull.platform_metadata,
        view_count: 500,
      },
    };
    
    const lowEngagementPack = extractEvidencePack(lowEngagementVDP);
    const noViralityChip = lowEngagementPack.evidenceChips.find(
      (chip: string) => chip.includes('Viral')
    );
    expect(noViralityChip).toBeUndefined();
  });

  it('masks sensitive VDP_FULL fields', () => {
    const evidencePack = extractEvidencePack(mockVDPFull);
    const packStr = JSON.stringify(evidencePack);
    
    // Should NOT contain any VDP_FULL specific fields
    expect(packStr).not.toContain('asr_transcript');
    expect(packStr).not.toContain('overall_analysis');
    expect(packStr).not.toContain('audience_reaction');
    expect(packStr).not.toContain('notable_comments');
    expect(packStr).not.toContain('narrative_unit');
    expect(packStr).not.toContain('scenes');
    
    // Should only contain Evidence Pack fields
    expect(packStr).toContain('trustScore');
    expect(packStr).toContain('evidenceChips');
    expect(packStr).toContain('synthIdDetected');
  });

  it('handles missing VDP data gracefully', () => {
    const minimalVDP = {
      digest_id: 'TEST1234', // Extract function uses digest_id, not content_id
    };
    
    const evidencePack = extractEvidencePack(minimalVDP);
    
    expect(evidencePack.digestId).toBe('TEST1234');
    expect(evidencePack.trustScore).toBe(95); // Default confidence in extract function is 0.95 * 100 = 95
    expect(evidencePack.evidenceChips.length).toBeGreaterThanOrEqual(1);
    expect(evidencePack.synthIdDetected).toBe(false);
  });

  it('includes provenance information', () => {
    const evidencePack = extractEvidencePack(mockVDPFull);
    
    expect(evidencePack.provenance).toBeDefined();
    expect(evidencePack.provenance.platform).toBeDefined();
    expect(evidencePack.provenance.createdAt).toBeDefined();
    
    // CreatedAt should be valid ISO string
    const timestamp = new Date(evidencePack.provenance.createdAt);
    expect(timestamp.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
  });

  it('respects maximum 5 evidence chips limit', () => {
    const highEngagementVDP = {
      ...mockVDPFull,
      platform_metadata: {
        ...mockVDPFull.platform_metadata,
        view_count: 10000000,
        like_count: 1000000,
        comment_count: 100000,
        share_count: 500000,
      },
    };
    
    const evidencePack = extractEvidencePack(highEngagementVDP);
    
    // Should not exceed 5 chips even with high engagement
    expect(evidencePack.evidenceChips.length).toBeLessThanOrEqual(5);
  });
});