import { QAInput, QAIssue, RuleId } from './types';
import { contrastRatio, MIN_AA_RATIO } from './contrast';

export function hookMax(input: QAInput): QAIssue[] {
  const issues: QAIssue[] = [];
  
  if (input.hookSec && input.hookSec > 3) {
    issues.push({
      id: RuleId.HOOK_TOO_LONG,
      severity: 'MAJOR',
      message: `Hook must be ≤3 seconds, got ${input.hookSec}s`,
      field: 'hookSec',
      code: 'HOOK_TOO_LONG',
    });
  }
  
  return issues;
}

export function durationEq8(input: QAInput): QAIssue[] {
  const issues: QAIssue[] = [];
  
  if (input.duration !== 8) {
    issues.push({
      id: RuleId.INVALID_DURATION,
      severity: 'MAJOR',
      message: `Duration must be exactly 8 seconds, got ${input.duration}`,
      field: 'duration',
      code: 'INVALID_DURATION',
    });
  }
  
  return issues;
}

export function fpsMin(input: QAInput): QAIssue[] {
  const issues: QAIssue[] = [];
  
  if (input.target === 'reels' && input.fps < 30) {
    issues.push({
      id: RuleId.LOW_FPS,
      severity: 'WARN',
      message: `Instagram Reels recommends ≥30fps, got ${input.fps}fps`,
      field: 'fps',
      code: 'LOW_FPS',
    });
  }
  
  return issues;
}

export function bitrateMin(input: QAInput): QAIssue[] {
  const issues: QAIssue[] = [];
  
  if (input.target === 'tiktok' && input.bitrate < 516000) {
    issues.push({
      id: RuleId.LOW_BITRATE,
      severity: 'WARN',
      message: `TikTok recommends ≥516kbps, got ${Math.round(input.bitrate / 1000)}kbps`,
      field: 'bitrate',
      code: 'LOW_BITRATE',
    });
  }
  
  return issues;
}

export function contrastAA(input: QAInput): QAIssue[] {
  const issues: QAIssue[] = [];
  
  if (input.subtitles) {
    input.subtitles.forEach((subtitle, index) => {
      if (subtitle.fg && subtitle.bg) {
        const ratio = contrastRatio(subtitle.fg, subtitle.bg);
        
        if (ratio < MIN_AA_RATIO) {
          issues.push({
            id: RuleId.LOW_CONTRAST,
            severity: 'WARN',
            message: `Subtitle ${index + 1} contrast ${ratio.toFixed(2)}:1 below WCAG AA (4.5:1)`,
            field: `subtitles[${index}]`,
            code: 'LOW_CONTRAST',
          });
        }
      }
    });
  }
  
  return issues;
}