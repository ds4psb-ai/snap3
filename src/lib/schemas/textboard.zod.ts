import { z } from 'zod';

// TextStyle Schema
export const TEXT_STYLE_SCHEMA = z.object({
  fontSize: z.number().min(12).max(72),
  fontWeight: z.enum(['normal', 'bold', 'light']),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  opacity: z.number().min(0).max(1).default(1),
});

export type TextStyle = z.infer<typeof TEXT_STYLE_SCHEMA>;

// Textboard Schema
export const TEXTBOARD_SCHEMA = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(200),
  duration: z.number().min(0.5).max(8), // Max 8 seconds
  position: z.object({
    x: z.number().min(0).max(1), // Normalized coordinates
    y: z.number().min(0).max(1),
  }),
  style: TEXT_STYLE_SCHEMA,
  startTime: z.number().min(0).max(8), // Start time in video
});

export type Textboard = z.infer<typeof TEXTBOARD_SCHEMA>;

// Textboard Pack Schema (2-4 textboards, total duration ≤8s)
export const TEXTBOARD_PACK_SCHEMA = z.object({
  id: z.string().uuid(),
  textboards: z.array(TEXTBOARD_SCHEMA).min(2).max(4),
}).refine(
  (data) => {
    const totalDuration = data.textboards.reduce((sum, tb) => sum + tb.duration, 0);
    return totalDuration <= 8;
  },
  {
    message: 'Total duration must be ≤8 seconds',
    path: ['textboards'],
  }
);

export type TextboardPack = z.infer<typeof TEXTBOARD_PACK_SCHEMA>;









