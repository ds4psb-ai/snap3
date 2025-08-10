import { VDPMin, EvidencePack, TextboardScene } from '@/lib/types';

export interface BriefExportData {
  digestId: string;
  title: string;
  scenes: TextboardScene[];
  evidencePack: EvidencePack;
  exportedAt: string;
}

/**
 * Generate brief export data from VDP and scenes
 * Pure function - no side effects
 */
export function generateBriefExport(
  vdpMin: VDPMin,
  scenes: TextboardScene[],
  evidencePack: EvidencePack
): BriefExportData {
  return {
    digestId: vdpMin.digestId,
    title: `Snap3 Brief - ${vdpMin.category}`,
    scenes: scenes.map(scene => ({
      role: scene.role,
      durationSec: scene.durationSec,
      visual: scene.visual,
      audio: scene.audio,
    })),
    evidencePack,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Extract evidence pack from VDP data
 * Masks sensitive information, returns only trust signals
 */
export function extractEvidencePack(vdpData: any): EvidencePack {
  const confidence = vdpData.overall_analysis?.confidence?.overall || 0.85;
  const engagement = vdpData.metadata?.view_count || 0;
  const isAIGenerated = vdpData.metadata?.video_origin === 'AI-Generated';
  
  const evidenceChips = [
    {
      type: 'confidence' as const,
      label: 'Analysis Confidence',
      value: Math.round(confidence * 100),
      confidence: confidence,
    },
    {
      type: 'engagement' as const,
      label: 'View Count',
      value: engagement,
      confidence: 0.9,
    },
    {
      type: 'source' as const,
      label: 'Platform',
      value: vdpData.metadata?.platform || 'Unknown',
      confidence: 1.0,
    },
  ];
  
  // Add virality chip if high engagement
  if (engagement > 1000000) {
    evidenceChips.push({
      type: 'virality' as const,
      label: 'Viral Status',
      value: 'High',
      confidence: 0.95,
    });
  }
  
  return {
    digestId: vdpData.content_id || 'UNKNOWN',
    trustScore: Math.round(confidence * 100),
    evidenceChips: evidenceChips.slice(0, 5), // Max 5 chips
    synthIdDetected: isAIGenerated,
    provenance: {
      source: vdpData.metadata?.source_url || 'internal',
      timestamp: new Date().toISOString(),
    },
  };
}