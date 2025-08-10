import { describe, it, expect } from '@jest/globals';
import { extractEvidencePack } from '@/lib/exports/brief';

describe('Evidence Pack Extraction', () => {
  const mockVDPFull = {
    content_id: 'C0008888',
    metadata: {
      platform: 'Instagram',
      video_origin: 'Real-Footage',
      view_count: 5000000,
      like_count: 80000,
      comment_count: 7000,
      share_count: 30000,
    },
    overall_analysis: {
      confidence: {
        overall: 0.95,
        scene_classification: 0.98,
        device_analysis: 0.9,
      },
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
    
    // Verify chip structure
    evidencePack.evidenceChips.forEach(chip => {
      expect(chip).toHaveProperty('type');
      expect(chip).toHaveProperty('label');
      expect(chip).toHaveProperty('value');
      expect(chip).toHaveProperty('confidence');
      expect(['engagement', 'confidence', 'source', 'virality']).toContain(chip.type);
    });
  });

  it('calculates trust score based on confidence metrics', () => {
    const evidencePack = extractEvidencePack(mockVDPFull);
    
    // Trust score should be based on overall confidence (0.95 * 100 = 95)
    expect(evidencePack.trustScore).toBe(95);
    
    // Test with lower confidence
    const lowConfidenceVDP = {
      ...mockVDPFull,
      overall_analysis: {
        ...mockVDPFull.overall_analysis,
        confidence: { overall: 0.65 },
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
      metadata: {
        ...mockVDPFull.metadata,
        video_origin: 'AI-Generated',
      },
    };
    
    evidencePack = extractEvidencePack(aiGeneratedVDP);
    expect(evidencePack.synthIdDetected).toBe(true);
  });

  it('adds virality chip for high engagement', () => {
    const evidencePack = extractEvidencePack(mockVDPFull);
    
    // Should have virality chip for 5M views
    const viralityChip = evidencePack.evidenceChips.find(
      (chip: any) => chip.type === 'virality'
    );
    expect(viralityChip).toBeDefined();
    expect(viralityChip?.value).toBe('High');
    
    // Test with low engagement
    const lowEngagementVDP = {
      ...mockVDPFull,
      metadata: {
        ...mockVDPFull.metadata,
        view_count: 500,
      },
    };
    
    const lowEngagementPack = extractEvidencePack(lowEngagementVDP);
    const noViralityChip = lowEngagementPack.evidenceChips.find(
      (chip: any) => chip.type === 'virality'
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
      content_id: 'TEST1234',
    };
    
    const evidencePack = extractEvidencePack(minimalVDP);
    
    expect(evidencePack.digestId).toBe('TEST1234');
    expect(evidencePack.trustScore).toBe(85); // Default confidence
    expect(evidencePack.evidenceChips.length).toBeGreaterThanOrEqual(3);
    expect(evidencePack.synthIdDetected).toBe(false);
  });

  it('includes provenance information', () => {
    const evidencePack = extractEvidencePack(mockVDPFull);
    
    expect(evidencePack.provenance).toBeDefined();
    expect(evidencePack.provenance?.source).toBeDefined();
    expect(evidencePack.provenance?.timestamp).toBeDefined();
    
    // Timestamp should be valid ISO string
    const timestamp = new Date(evidencePack.provenance!.timestamp);
    expect(timestamp.toISOString()).toBe(evidencePack.provenance!.timestamp);
  });

  it('respects maximum 5 evidence chips limit', () => {
    const highEngagementVDP = {
      ...mockVDPFull,
      metadata: {
        ...mockVDPFull.metadata,
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