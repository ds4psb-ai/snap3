// API Types for Snap3 Turbo

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface IngestRequest {
  type: 'url' | 'text' | 'upload';
  content: string;
  metadata?: Record<string, any>;
}

export interface IngestResponse {
  id: string;
  type: string;
  status: 'normalized';
  embedCompatibility: boolean;
}

export interface TurboRequest {
  ingestId: string;
  evidencePack: EvidencePack;
}

export interface TurboResponse {
  id: string;
  textboards: Textboard[];
  totalDuration: number;
  evidencePack: EvidencePack;
}

export interface Veo3CompileRequest {
  prompt: string;
  duration: 8;
  aspectRatio: '16:9';
  quality: '720p' | '1080p';
}

export interface Veo3CompileResponse {
  id: string;
  prompt: string;
  duration: 8;
  aspectRatio: '16:9';
  quality: '720p' | '1080p';
  status: 'compiled';
}

export interface PreviewRequest {
  veo3Id: string;
  prompt: string;
  duration: 8;
  aspectRatio: '16:9';
  quality: '720p' | '1080p';
}

export interface PreviewResponse {
  jobId: string;
  status: 'accepted';
  message: string;
  pollUrl: string;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    previewUrl: string;
    duration: 8;
    aspectRatio: '16:9';
    quality: '720p' | '1080p';
  };
  createdAt: string;
  completedAt?: string;
}

export interface QAValidationRequest {
  previewUrl: string;
  duration: number;
  aspectRatio: string;
  quality: string;
  hooks: Array<{
    name: string;
    duration: number;
  }>;
  safezones: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  fps: number;
  bitrate: number;
}

export interface QAValidationResponse {
  status: 'passed' | 'failed';
  message: string;
  score?: number;
  violations?: Array<{
    rule: string;
    message: string;
    details?: string;
  }>;
}

export interface BriefExport {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  evidence: Evidence[];
}

export interface JSONExport {
  id: string;
  type: 'json';
  version: string;
  timestamp: string;
  data: {
    vdp_min: VDP_MIN;
    evidence: Evidence[];
  };
}

// Import types from schemas
export interface VDP_MIN {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  type: 'text' | 'url' | 'image' | 'video';
  content: string;
  confidence: number;
  metadata?: {
    source: string;
    timestamp: string;
    tags?: string[];
  };
}

export interface EvidencePack {
  id: string;
  vdpId: string;
  evidence: Evidence[];
  metadata: {
    source: string;
    confidence: number;
    timestamp: string;
    version?: string;
  };
}

export interface Textboard {
  id: string;
  content: string;
  duration: number;
  position: {
    x: number;
    y: number;
  };
  style: {
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'light';
    color: string;
    backgroundColor?: string;
    opacity?: number;
  };
  startTime: number;
}




