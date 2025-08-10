export type QAInput = {
  fps: number;
  bitrate: number;
  duration: 8;
  aspectRatio: '16:9';
  resolution: '720p' | '1080p';
  target: 'reels' | 'tiktok' | 'shorts';
  hookSec?: number;
  subtitles?: {
    text: string;
    fg?: string;
    bg?: string;
    bbox?: [number, number, number, number];
  }[];
};

export enum RuleId {
  HOOK_TOO_LONG = 'HOOK_TOO_LONG',
  INVALID_DURATION = 'INVALID_DURATION',
  LOW_FPS = 'LOW_FPS',
  LOW_BITRATE = 'LOW_BITRATE',
  LOW_CONTRAST = 'LOW_CONTRAST',
}

export type Severity = 'MAJOR' | 'WARN';

export type QAIssue = {
  id: RuleId;
  severity: Severity;
  message: string;
  field?: string;
  code?: string;
};

export type QAReport = {
  pass: boolean;
  score: number;
  issues: QAIssue[];
};