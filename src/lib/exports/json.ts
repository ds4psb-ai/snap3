import { VideoGenIR, Veo3Prompt, EvidencePack } from '@/lib/types';

export interface JSONExportData {
  digestId: string;
  videoGenIR: VideoGenIR;
  veo3Prompt: Veo3Prompt;
  evidencePack: EvidencePack;
  exportedAt: string;
}

/**
 * Generate JSON export data
 * Pure function - combines VideoGen IR + Veo3 Prompt + Evidence
 */
export function generateJSONExport(
  digestId: string,
  videoGenIR: VideoGenIR,
  veo3Prompt: Veo3Prompt,
  evidencePack: EvidencePack
): JSONExportData {
  // Ensure compliance with constraints
  const validatedIR: VideoGenIR = {
    ...videoGenIR,
    durationSec: 8,
    aspect: '16:9' as const,
    resolution: videoGenIR.resolution || '1080p',
  };
  
  const validatedPrompt: Veo3Prompt = {
    ...veo3Prompt,
    duration: 8,
    aspect: '16:9' as const,
    resolution: veo3Prompt.resolution || '1080p',
  };
  
  return {
    digestId,
    videoGenIR: validatedIR,
    veo3Prompt: validatedPrompt,
    evidencePack,
    exportedAt: new Date().toISOString(),
  };
}