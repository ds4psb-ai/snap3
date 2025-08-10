// Test fixtures for Veo3 contract testing
export const VEO3_VALID_FIXTURES = {
  minimal: {
    prompt: 'Generate a product showcase video',
    duration: 8,
    aspectRatio: '16:9' as const,
    quality: '720p' as const,
  },
  with1080p: {
    prompt: 'Generate a product showcase video',
    duration: 8,
    aspectRatio: '16:9' as const,
    quality: '1080p' as const,
  },
  withParameters: {
    prompt: 'Generate a product showcase video',
    duration: 8,
    aspectRatio: '16:9' as const,
    quality: '720p' as const,
    model: 'veo-3',
    parameters: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 500,
    },
  },
};

export const VEO3_INVALID_FIXTURES = {
  wrongDuration7: {
    prompt: 'test',
    duration: 7,
    aspectRatio: '16:9' as const,
    quality: '720p' as const,
  },
  wrongDuration10: {
    prompt: 'test',
    duration: 10,
    aspectRatio: '16:9' as const,
    quality: '720p' as const,
  },
  wrongAspectRatio916: {
    prompt: 'test',
    duration: 8,
    aspectRatio: '9:16',
    quality: '720p' as const,
  },
  wrongAspectRatio43: {
    prompt: 'test',
    duration: 8,
    aspectRatio: '4:3',
    quality: '720p' as const,
  },
  wrongQuality480p: {
    prompt: 'test',
    duration: 8,
    aspectRatio: '16:9' as const,
    quality: '480p',
  },
  wrongQuality4K: {
    prompt: 'test',
    duration: 8,
    aspectRatio: '16:9' as const,
    quality: '4K',
  },
  extraFields: {
    prompt: 'test',
    duration: 8,
    aspectRatio: '16:9' as const,
    quality: '720p' as const,
    extraField: 'should fail strict mode',
  },
  invalidTemperature: {
    prompt: 'test',
    duration: 8,
    aspectRatio: '16:9' as const,
    quality: '720p' as const,
    parameters: {
      temperature: 1.5,
      topP: 0.9,
      maxTokens: 500,
    },
  },
};

// Test case matrix for table-driven testing
export const VEO3_TEST_MATRIX = [
  { id: 'VEO3-001', input: VEO3_VALID_FIXTURES.minimal, shouldPass: true, description: 'Valid minimal config' },
  { id: 'VEO3-002', input: VEO3_INVALID_FIXTURES.wrongDuration7, shouldPass: false, description: 'Invalid duration 7' },
  { id: 'VEO3-003', input: VEO3_INVALID_FIXTURES.wrongDuration10, shouldPass: false, description: 'Invalid duration 10' },
  { id: 'VEO3-004', input: VEO3_VALID_FIXTURES.with1080p, shouldPass: true, description: 'Valid 1080p quality' },
  { id: 'VEO3-005', input: VEO3_INVALID_FIXTURES.wrongAspectRatio916, shouldPass: false, description: 'Invalid AR 9:16' },
  { id: 'VEO3-006', input: VEO3_INVALID_FIXTURES.wrongAspectRatio43, shouldPass: false, description: 'Invalid AR 4:3' },
  { id: 'VEO3-007', input: { ...VEO3_VALID_FIXTURES.minimal, quality: '720p' }, shouldPass: true, description: 'Valid 720p' },
  { id: 'VEO3-008', input: { ...VEO3_VALID_FIXTURES.minimal, quality: '1080p' }, shouldPass: true, description: 'Valid 1080p' },
  { id: 'VEO3-009', input: VEO3_INVALID_FIXTURES.wrongQuality480p, shouldPass: false, description: 'Invalid 480p' },
  { id: 'VEO3-010', input: VEO3_INVALID_FIXTURES.wrongQuality4K, shouldPass: false, description: 'Invalid 4K' },
  { id: 'VEO3-011', input: VEO3_VALID_FIXTURES.withParameters, shouldPass: true, description: 'Valid with params' },
  { id: 'VEO3-012', input: VEO3_INVALID_FIXTURES.extraFields, shouldPass: false, description: 'Extra fields strict' },
  { id: 'VEO3-013', input: { prompt: '', duration: 8, aspectRatio: '16:9', quality: '720p' }, shouldPass: false, description: 'Empty prompt' },
  { id: 'VEO3-014', input: VEO3_VALID_FIXTURES.withParameters, shouldPass: true, description: 'Valid parameters' },
  { id: 'VEO3-015', input: VEO3_INVALID_FIXTURES.invalidTemperature, shouldPass: false, description: 'Invalid temp > 1' },
];