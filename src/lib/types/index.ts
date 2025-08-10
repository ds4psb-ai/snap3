// VDP Types
export interface VDPMin {
  digestId: string;
  category: string;
  hookSec: number;
  tempoBucket: string;
  source: {
    embedEligible: boolean;
  };
}

// Evidence Types
export interface EvidenceChip {
  type: 'engagement' | 'confidence' | 'source';
  label: string;
  value: string | number;
  confidence: number;
}

export interface EvidencePack {
  digestId: string;
  trustScore: number;
  evidenceChips: EvidenceChip[];
  synthIdDetected: boolean;
  provenance?: {
    source: string;
    timestamp: string;
  };
}

// Textboard Types
export interface TextboardScene {
  role: 'hook' | 'development' | 'climax';
  durationSec: number;
  visual: string;
  audio: string;
}

// Video Generation Types
export interface VideoGenIR {
  durationSec: number;
  aspect: '16:9';
  resolution: '720p' | '1080p';
  cuts?: Array<{
    timestamp: number;
    type: string;
  }>;
}

export interface Veo3Prompt {
  duration: number;
  aspect: '16:9';
  resolution: '720p' | '1080p';
  shots?: Array<{
    duration: number;
    description: string;
    camera: string;
  }>;
}

// Export Types
export interface BriefExport {
  digestId: string;
  title: string;
  scenes: TextboardScene[];
  evidencePack: EvidencePack;
  exportedAt: string;
}

export interface JSONExport {
  digestId: string;
  videoGenIR: VideoGenIR;
  veo3Prompt: Veo3Prompt;
  evidencePack: EvidencePack;
  exportedAt: string;
}