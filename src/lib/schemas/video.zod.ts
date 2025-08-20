import { z } from 'zod';

// Cut Schema
export const CUT_SCHEMA = z.object({
  id: z.string().uuid(),
  startTime: z.number().min(0).max(8),
  endTime: z.number().min(0).max(8),
  duration: z.number().min(0.5).max(8),
  transition: z.enum(['fade', 'cut', 'dissolve']).default('cut'),
});

export type Cut = z.infer<typeof CUT_SCHEMA>;

// VideoGenIR Schema (8s, 16:9, 2-3 cuts)
export const VIDEO_GEN_IR_SCHEMA = z.object({
  duration: z.literal(8), // Fixed 8 seconds
  aspectRatio: z.literal('16:9'), // Fixed 16:9
  quality: z.enum(['720p', '1080p']),
  cuts: z.array(CUT_SCHEMA).min(2).max(3),
  fps: z.number().min(24).max(60).default(30),
  bitrate: z.number().min(1000000).default(2000000), // 1-5 Mbps
}).refine(
  (data) => {
    const totalDuration = data.cuts.reduce((sum, cut) => sum + cut.duration, 0);
    return Math.abs(totalDuration - 8) < 0.1; // Allow small tolerance
  },
  {
    message: 'Total cut duration must equal 8 seconds',
    path: ['cuts'],
  }
);

export type VideoGenIR = z.infer<typeof VIDEO_GEN_IR_SCHEMA>;

// Video Quality Schema
export const VIDEO_QUALITY_SCHEMA = z.object({
  resolution: z.enum(['720p', '1080p']),
  fps: z.number().min(24).max(60),
  bitrate: z.number().min(1000000).max(5000000), // 1-5 Mbps
  codec: z.enum(['h264', 'h265']).default('h264'),
});

export type VideoQuality = z.infer<typeof VIDEO_QUALITY_SCHEMA>;







