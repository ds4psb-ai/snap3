import { VEO3_PROMPT_SCHEMA } from '../../lib/schemas/veo3.zod';
import { VEO3_VALID_FIXTURES, VEO3_INVALID_FIXTURES, VEO3_TEST_MATRIX } from '../fixtures/veo3-fixtures.data';

describe('Veo3 Contract Tests', () => {
  describe('Table-Driven Test Matrix', () => {
    test.each(VEO3_TEST_MATRIX)(
      '$id: $description',
      ({ input, shouldPass }) => {
        const result = VEO3_PROMPT_SCHEMA.safeParse(input);
        expect(result.success).toBe(shouldPass);
      }
    );
  });

  describe('Valid Cases', () => {
    const validCases = [
      { name: 'minimal valid config', fixture: VEO3_VALID_FIXTURES.minimal },
      { name: '1080p quality', fixture: VEO3_VALID_FIXTURES.with1080p },
      { name: 'with parameters', fixture: VEO3_VALID_FIXTURES.withParameters },
    ];

    test.each(validCases)('should accept $name', ({ fixture }) => {
      const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration).toBe(8);
        expect(result.data.aspect).toBe('16:9');
        expect(['720p', '1080p']).toContain(result.data.resolution);
      }
    });
  });

  describe('Duration Constraints (literal: 8)', () => {
    const durationCases = [
      { duration: 7, shouldFail: true },
      { duration: 8, shouldFail: false },
      { duration: 9, shouldFail: true },
      { duration: 10, shouldFail: true },
      { duration: 0, shouldFail: true },
      { duration: -1, shouldFail: true },
    ];

    test.each(durationCases)(
      'duration=$duration should fail=$shouldFail',
      ({ duration, shouldFail }) => {
        const fixture = { ...VEO3_VALID_FIXTURES.minimal, duration };
        const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
        expect(result.success).toBe(!shouldFail);
        if (!result.success && shouldFail) {
          expect(result.error.errors[0].message).toContain('Invalid literal value');
        }
      }
    );
  });

  describe('Aspect Ratio Constraints (literal: "16:9")', () => {
    const aspectRatioCases = [
      { aspect: '16:9', shouldFail: false },
      { aspect: '9:16', shouldFail: true },
      { aspect: '4:3', shouldFail: true },
      { aspect: '1:1', shouldFail: true },
      { aspect: '21:9', shouldFail: true },
    ];

    test.each(aspectRatioCases)(
      'aspect=$aspect should fail=$shouldFail',
      ({ aspect, shouldFail }) => {
        const fixture = { ...VEO3_VALID_FIXTURES.minimal, aspect };
        const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
        expect(result.success).toBe(!shouldFail);
        if (!result.success && shouldFail) {
          expect(result.error.errors[0].message).toContain('Invalid literal value');
        }
      }
    );
  });

  describe('Quality Constraints (enum: ["720p", "1080p"])', () => {
    const qualityCases = [
      { resolution: '720p', shouldFail: false },
      { resolution: '1080p', shouldFail: false },
      { resolution: '480p', shouldFail: true },
      { resolution: '540p', shouldFail: true },
      { resolution: '4K', shouldFail: true },
      { resolution: '2K', shouldFail: true },
      { resolution: '360p', shouldFail: true },
    ];

    test.each(qualityCases)(
      'resolution=$resolution should fail=$shouldFail',
      ({ resolution, shouldFail }) => {
        const fixture = { ...VEO3_VALID_FIXTURES.minimal, resolution };
        const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
        expect(result.success).toBe(!shouldFail);
        if (!result.success && shouldFail) {
          expect(result.error.errors[0].message).toContain('Invalid enum value');
        }
      }
    );
  });

  describe('Prompt Validation', () => {
    test('should reject empty prompt', () => {
      const fixture = { ...VEO3_VALID_FIXTURES.minimal, prompt: '' };
      const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Prompt is required');
    });

    test('should reject prompt over 1000 characters', () => {
      const fixture = { ...VEO3_VALID_FIXTURES.minimal, prompt: 'a'.repeat(1001) };
      const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Prompt must not exceed 1000 characters');
    });

    test('should accept valid prompt', () => {
      const fixture = { ...VEO3_VALID_FIXTURES.minimal, prompt: 'Valid prompt text' };
      const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
      expect(result.success).toBe(true);
    });
  });

  describe('Strict Mode', () => {
    test('should reject extra fields', () => {
      const result = VEO3_PROMPT_SCHEMA.safeParse(VEO3_INVALID_FIXTURES.extraFields);
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Unrecognized key');
    });

    test('should reject missing required fields', () => {
      const incomplete = {
        prompt: 'test',
        duration: 8,
        // missing aspectRatio and quality
      };
      const result = VEO3_PROMPT_SCHEMA.safeParse(incomplete);
      expect(result.success).toBe(false);
    });
  });

  describe('Parameter Validation', () => {
    test('should reject temperature > 1', () => {
      const result = VEO3_PROMPT_SCHEMA.safeParse(VEO3_INVALID_FIXTURES.invalidTemperature);
      expect(result.success).toBe(false);
    });

    test('should reject temperature < 0', () => {
      const fixture = {
        ...VEO3_VALID_FIXTURES.minimal,
        parameters: { temperature: -0.1, topP: 0.9, maxTokens: 500 },
      };
      const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
      expect(result.success).toBe(false);
    });

    test('should accept valid temperature', () => {
      const fixture = {
        ...VEO3_VALID_FIXTURES.minimal,
        parameters: { temperature: 0.5 },
      };
      const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
      expect(result.success).toBe(true);
    });

    test('should accept complete valid parameters', () => {
      const fixture = {
        ...VEO3_VALID_FIXTURES.minimal,
        parameters: {
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 500,
        },
      };
      const result = VEO3_PROMPT_SCHEMA.safeParse(fixture);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Messages', () => {
    test('should provide clear error for invalid duration', () => {
      const result = VEO3_PROMPT_SCHEMA.safeParse(VEO3_INVALID_FIXTURES.wrongDuration7);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors[0];
        expect(error.path).toEqual(['duration']);
        expect(error.message).toContain('Invalid literal value');
      }
    });

    test('should provide clear error for invalid aspect ratio', () => {
      const result = VEO3_PROMPT_SCHEMA.safeParse(VEO3_INVALID_FIXTURES.wrongAspectRatio916);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors[0];
        expect(error.path).toEqual(['aspect']);
        expect(error.message).toContain('Invalid literal value');
      }
    });

    test('should provide clear error for invalid quality', () => {
      const result = VEO3_PROMPT_SCHEMA.safeParse(VEO3_INVALID_FIXTURES.wrongQuality480p);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors[0];
        expect(error.path).toEqual(['resolution']);
        expect(error.message).toContain('Invalid enum value');
      }
    });
  });
});