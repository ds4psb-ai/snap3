export const OpenAPIComponents = {
  schemas: {
    TextboardScene: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['hook', 'development', 'climax'] },
        durationSec: { type: 'number' },
        visual: { type: 'string' },
        audio: { type: 'string' }
      },
      required: ['role', 'durationSec', 'visual', 'audio']
    },
    VideoGenIR: {
      type: 'object',
      properties: {
        durationSec: { type: 'number', const: 8 },
        aspect: { type: 'string', const: '16:9' },
        resolution: { type: 'string', enum: ['720p', '1080p'] },
        cuts: { type: 'array' }
      },
      required: ['durationSec', 'aspect', 'resolution']
    },
    VDP_MIN: {
      type: 'object',
      properties: {
        digestId: { type: 'string' },
        category: { type: 'string' },
        hookSec: { type: 'number' },
        tempoBucket: { type: 'string' },
        source: { type: 'object' }
      },
      required: ['digestId']
    },
    EvidencePack: {
      type: 'object',
      properties: {
        digestId: { type: 'string' },
        trustScore: { type: 'number' },
        evidenceChips: { type: 'array', items: { type: 'string' } },
        synthIdDetected: { type: 'boolean' },
        provenance: { type: 'object' }
      },
      required: ['digestId', 'trustScore', 'evidenceChips', 'synthIdDetected', 'provenance']
    }
  }
};
