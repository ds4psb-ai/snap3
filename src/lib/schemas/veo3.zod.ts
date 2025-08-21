import { z } from 'zod';

// Updated Veo3Prompt Schema to match OpenAPI spec and tests
export const VEO3_PROMPT_SCHEMA = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt must not exceed 1000 characters'),
  duration: z.literal(8), // Fixed 8 seconds
  aspect: z.literal('16:9'), // Fixed 16:9
  resolution: z.enum(['720p', '1080p']),
  model: z.string().optional(),
  parameters: z.object({
    temperature: z.number().min(0).max(1),
    topP: z.number().min(0).max(1).optional(),
    maxTokens: z.number().positive().optional(),
  }).optional(),
  shots: z.array(z.object({
    duration: z.number(),
    description: z.string(),
    camera: z.string(),
  })).optional(),
}).strict(); // No additional properties allowed

export type Veo3Prompt = z.infer<typeof VEO3_PROMPT_SCHEMA>;

// Veo3Response Schema
export const VEO3_RESPONSE_SCHEMA = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  prompt: VEO3_PROMPT_SCHEMA,
  result: z.object({
    videoUrl: z.string().url().optional(),
    duration: z.literal(8),
    aspectRatio: z.literal('16:9'),
    quality: z.enum(['720p', '1080p']),
    metadata: z.record(z.any()).optional(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }).optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export type Veo3Response = z.infer<typeof VEO3_RESPONSE_SCHEMA>;

// Veo3Job Schema
export const VEO3_JOB_SCHEMA = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  prompt: VEO3_PROMPT_SCHEMA,
  result: z.object({
    videoUrl: z.string().url(),
    duration: z.literal(8),
    aspectRatio: z.literal('16:9'),
    quality: z.enum(['720p', '1080p']),
    fps: z.number().min(24).max(60),
    bitrate: z.number().min(1000000),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    fix: z.string().optional(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export type Veo3Job = z.infer<typeof VEO3_JOB_SCHEMA>;








