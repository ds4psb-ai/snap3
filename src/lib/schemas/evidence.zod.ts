import { z } from 'zod';

// Evidence Schema
export const EVIDENCE_SCHEMA = z.object({
  id: z.string().uuid(),
  type: z.enum(['text', 'url', 'image', 'video']),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    source: z.string(),
    timestamp: z.string().datetime(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export type Evidence = z.infer<typeof EVIDENCE_SCHEMA>;

// EvidencePack Schema
export const EVIDENCE_PACK_SCHEMA = z.object({
  id: z.string().uuid(),
  vdpId: z.string().uuid(),
  evidence: z.array(EVIDENCE_SCHEMA),
  metadata: z.object({
    source: z.string(),
    confidence: z.number().min(0).max(1),
    timestamp: z.string().datetime(),
    version: z.string().default('1.0'),
  }),
});

export type EvidencePack = z.infer<typeof EVIDENCE_PACK_SCHEMA>;







