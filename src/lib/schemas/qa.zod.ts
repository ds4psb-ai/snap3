import { z } from 'zod';

export const QAInputSchema = z.object({
  fps: z.number().min(1).max(120),
  bitrate: z.number().min(1000),
  duration: z.literal(8),
  aspectRatio: z.literal('16:9'),
  resolution: z.enum(['720p', '1080p']),
  target: z.enum(['reels', 'tiktok', 'shorts']),
  hookSec: z.number().min(0).max(10).optional(),
  subtitles: z.array(z.object({
    text: z.string(),
    fg: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  })).optional(),
});

export type QAInputType = z.infer<typeof QAInputSchema>;