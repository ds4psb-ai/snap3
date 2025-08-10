/**
 * Evidence Pack extraction from VDP_FULL
 */

export interface EvidencePack {
  digestId: string;
  trustScore: number;
  evidenceChips: string[];
  synthIdDetected: boolean;
  provenance: {
    platform: string;
    createdAt: string;
    verifiedAt?: string;
  };
}

/**
 * Extract evidence pack from VDP_FULL data
 * Masks sensitive fields while preserving trust signals
 */
export function extractEvidencePack(vdpFull: any): EvidencePack {
  // Calculate trust score based on confidence metrics
  const trustScore = Math.round((vdpFull.overall_analysis?.confidence || 0.95) * 100);
  
  // Extract evidence chips
  const evidenceChips: string[] = [];
  
  // Add engagement chip if high
  const viewCount = vdpFull.platform_metadata?.view_count || 0;
  if (viewCount > 1000000) {
    evidenceChips.push('Viral: 1M+ views');
  } else if (viewCount > 100000) {
    evidenceChips.push('Popular: 100K+ views');
  }
  
  // Add AI detection chip
  if (vdpFull.video_origin === 'AI-Generated') {
    evidenceChips.push('AI-Generated Content');
  } else {
    evidenceChips.push('Real Footage');
  }
  
  // Add sentiment chip
  const sentiment = vdpFull.overall_analysis?.audience_reactions?.overall_sentiment;
  if (sentiment?.includes('Positive')) {
    evidenceChips.push('Positive Sentiment');
  }
  
  // Add hook quality chip
  if (vdpFull.scenes?.[0]?.narrative_unit?.narrative_role === 'Hook') {
    evidenceChips.push('Strong Hook');
  }
  
  // Add platform chip
  const platform = vdpFull.platform_metadata?.platform || 'Unknown';
  evidenceChips.push(`Source: ${platform}`);
  
  // Limit to 5 chips
  const finalChips = evidenceChips.slice(0, 5);
  
  return {
    digestId: vdpFull.digest_id || 'unknown',
    trustScore,
    evidenceChips: finalChips,
    synthIdDetected: vdpFull.video_origin === 'AI-Generated',
    provenance: {
      platform: vdpFull.platform_metadata?.platform || 'Unknown',
      createdAt: vdpFull.platform_metadata?.upload_date || new Date().toISOString(),
      verifiedAt: new Date().toISOString()
    }
  };
}

/**
 * Validate evidence pack structure
 */
export function validateEvidencePack(pack: any): pack is EvidencePack {
  return (
    typeof pack === 'object' &&
    typeof pack.digestId === 'string' &&
    typeof pack.trustScore === 'number' &&
    Array.isArray(pack.evidenceChips) &&
    typeof pack.synthIdDetected === 'boolean' &&
    typeof pack.provenance === 'object'
  );
}