/**
 * Core type definitions for Snap3 Turbo API
 */

// Video data package interfaces
export interface VDPMin {
  digestId: string;
  category: string;
  hookSec: number;
  tempoBucket: string;
  source: {
    embedEligible: boolean;
    platform: string;
  };
}

// Evidence and trust scoring
export interface EvidenceChip {
  type: 'confidence' | 'engagement' | 'source';
  label: string;
  value: number | string;
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

// Video generation interfaces
export interface VideoGenIR {
  durationSec: number;
  aspect: '16:9';
  resolution: '720p' | '1080p';
  cuts: Array<{
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

// Scene and content interfaces
export interface TextboardScene {
  role: 'hook' | 'development' | 'climax';
  durationSec: number;
  visual: string;
  audio: string;
}

// Job management interfaces
export interface JobStatus {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Export interfaces
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