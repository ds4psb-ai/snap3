import { z } from 'zod';

// VDP_MIN Schema - VDP_FULL fields excluded
export const VDP_MIN_SCHEMA = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // VDP_FULL fields are explicitly excluded
});

export type VDP_MIN = z.infer<typeof VDP_MIN_SCHEMA>;

// VDP_FULL Schema (internal only - not exposed)
export const VDP_FULL_SCHEMA = VDP_MIN_SCHEMA.extend({
  content: z.string(),
  metadata: z.object({
    description: z.string().optional(),
    category: z.string().optional(),
  }).optional(),
  // Internal fields only
  internalData: z.record(z.any()).optional(),
  sensitiveInfo: z.string().optional(),
});

export type VDP_FULL = z.infer<typeof VDP_FULL_SCHEMA>;

// Alias for backward compatibility
export type VDP = VDP_FULL;

