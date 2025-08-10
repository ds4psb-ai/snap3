import { hookMax, durationEq8, fpsMin, bitrateMin, contrastAA } from '@/lib/qa/rules';
import { QAInput, RuleId, Severity } from '@/lib/qa/types';

describe('QA Rules', () => {
  const baseInput: QAInput = {
    fps: 30,
    bitrate: 1000000,
    duration: 8,
    aspectRatio: '16:9',
    resolution: '720p',
    target: 'reels',
  };

  describe('hookMax', () => {
    it('returns MAJOR penalty (-20) when hook > 3s', () => {
      const input = { ...baseInput, hookSec: 4 };
      const issues = hookMax(input);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe(RuleId.HOOK_TOO_LONG);
      expect(issues[0].severity).toBe('MAJOR');
    });

    it('returns no issues when hook ≤ 3s', () => {
      const input = { ...baseInput, hookSec: 3 };
      const issues = hookMax(input);
      expect(issues).toHaveLength(0);
    });
  });

  describe('durationEq8', () => {
    it('returns MAJOR penalty when duration ≠ 8', () => {
      const input = { ...baseInput, duration: 10 as any };
      const issues = durationEq8(input);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe(RuleId.INVALID_DURATION);
      expect(issues[0].severity).toBe('MAJOR');
    });

    it('returns no issues when duration === 8', () => {
      const issues = durationEq8(baseInput);
      expect(issues).toHaveLength(0);
    });
  });

  describe('fpsMin', () => {
    it('returns WARN for reels when fps < 30', () => {
      const input = { ...baseInput, fps: 29, target: 'reels' as const };
      const issues = fpsMin(input);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe(RuleId.LOW_FPS);
      expect(issues[0].severity).toBe('WARN');
    });

    it('returns no issues for reels when fps ≥ 30', () => {
      const input = { ...baseInput, fps: 30, target: 'reels' as const };
      const issues = fpsMin(input);
      expect(issues).toHaveLength(0);
    });
  });

  describe('bitrateMin', () => {
    it('returns WARN for tiktok when bitrate < 516000', () => {
      const input = { ...baseInput, bitrate: 400000, target: 'tiktok' as const };
      const issues = bitrateMin(input);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe(RuleId.LOW_BITRATE);
      expect(issues[0].severity).toBe('WARN');
    });

    it('returns no issues for tiktok when bitrate ≥ 516000', () => {
      const input = { ...baseInput, bitrate: 516000, target: 'tiktok' as const };
      const issues = bitrateMin(input);
      expect(issues).toHaveLength(0);
    });
  });

  describe('contrastAA', () => {
    it('returns WARN when contrast < 4.5:1', () => {
      const input = {
        ...baseInput,
        subtitles: [
          { text: 'Low contrast', fg: '#777777', bg: '#999999', bbox: [0, 0, 100, 30] }
        ]
      };
      const issues = contrastAA(input);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe(RuleId.LOW_CONTRAST);
      expect(issues[0].severity).toBe('WARN');
    });

    it('returns no issues when contrast ≥ 4.5:1', () => {
      const input = {
        ...baseInput,
        subtitles: [
          { text: 'Good contrast', fg: '#000000', bg: '#ffffff', bbox: [0, 0, 100, 30] }
        ]
      };
      const issues = contrastAA(input);
      expect(issues).toHaveLength(0);
    });

    it('validates contrast calculation with tolerance 1e-3', () => {
      const input = {
        ...baseInput,
        subtitles: [
          { text: 'Edge case', fg: '#767676', bg: '#ffffff', bbox: [0, 0, 100, 30] }
          // This should be exactly 4.54:1, just above threshold
        ]
      };
      const issues = contrastAA(input);
      expect(issues).toHaveLength(0);
    });
  });
});