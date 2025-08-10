export interface BriefExport {
  digestId: string;
  title: string;
  scenes: Array<{
    role: 'hook' | 'development' | 'climax';
    durationSec: number;
    visual: string;
    audio: string;
  }>;
  evidencePack: any;
  exportedAt: string;
}

/**
 * Generate brief export data from VDP and scenes
 * Pure function - no side effects
 */
export function generateBriefExport(
  vdpMin: any,
  scenes: any[],
  evidencePack: any
): BriefExport {
  return {
    digestId: vdpMin.digestId,
    title: `Snap3 Brief - ${vdpMin.category || 'Export'}`,
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