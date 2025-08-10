import { z } from 'zod';

/**
 * Evidence Pack Schema
 * Provides trust signals without exposing VDP_FULL data
 */
export const EvidencePackSchema = z.object({
  digestId: z.string().regex(/^[A-Z0-9]{8}$/),
  trustScore: z.number().min(0).max(1),
  evidenceChips: z.array(z.string()).min(3).max(5),
  synthIdDetected: z.boolean(),
  provenance: z.string().url().optional(),
});

export type EvidencePack = z.infer<typeof EvidencePackSchema>;

/**
 * Generate Evidence Pack from VDP data
 * Masks sensitive VDP_FULL fields and only exposes trust signals
 */
export function generateEvidencePack(vdpData: any): EvidencePack {
  // Calculate trust score components
  const confidence = vdpData?.overall_analysis?.confidence?.overall || 0.85;
  const viewCount = vdpData?.metadata?.view_count || 0;
  const engagement = Math.min(viewCount / 10000000, 1);
  const isAIGenerated = vdpData?.metadata?.video_origin === 'AI-Generated';
  
  // Weighted trust score calculation
  const trustScore = Math.min(
    confidence * 0.5 +      // 50% weight on analysis confidence
    engagement * 0.3 +      // 30% weight on engagement
    (isAIGenerated ? 0 : 0.2), // 20% bonus for real footage
    1.0
  );
  
  // Generate evidence chips (3-5 items)
  const chips: string[] = [];
  
  // Add view count chip if significant
  if (viewCount > 1000000) {
    chips.push(`${(viewCount / 1000000).toFixed(1)}M views`);
  } else if (viewCount > 1000) {
    chips.push(`${(viewCount / 1000).toFixed(0)}K views`);
  }
  
  // Add sentiment chip
  const sentiment = vdpData?.overall_analysis?.audience_reaction?.overall_sentiment;
  if (sentiment) {
    chips.push(sentiment);
  }
  
  // Add platform verification
  const platform = vdpData?.metadata?.platform;
  if (platform) {
    chips.push(`Verified on ${platform}`);
  }
  
  // Add engagement metrics
  const likeCount = vdpData?.metadata?.like_count;
  if (likeCount > 100000) {
    chips.push(`${(likeCount / 1000).toFixed(0)}K likes`);
  }
  
  // Add viral indicator
  if (viewCount > 5000000) {
    chips.push('Viral');
  }
  
  // Ensure we have 3-5 chips
  if (chips.length < 3) {
    chips.push('Analyzed');
    if (chips.length < 3) chips.push('Processed');
    if (chips.length < 3) chips.push('Verified');
  }
  
  return {
    digestId: vdpData?.content_id || 'UNKNOWN',
    trustScore: Math.round(trustScore * 100) / 100,
    evidenceChips: chips.slice(0, 5),
    synthIdDetected: isAIGenerated,
    provenance: vdpData?.metadata?.source_url,
  };
}