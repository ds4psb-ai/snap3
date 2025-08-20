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

// VDP Storage Metadata Schema for x-goog-meta headers
export const VDP_STORAGE_METADATA_SCHEMA = z.object({
  'x-goog-meta-vdp-content-id': z.string().regex(/^C\d{6}$/), // C000001 format
  'x-goog-meta-vdp-platform': z.enum(['tiktok', 'instagram', 'youtube', 'reels', 'shorts']),
  'x-goog-meta-vdp-origin': z.enum(['real', 'ai-generated']),
  'x-goog-meta-vdp-source-url': z.string().url(),
  'x-goog-meta-vdp-caption': z.string().max(1000),
  'x-goog-meta-vdp-posted-at': z.string().datetime(), // ISO 8601
  'x-goog-meta-vdp-view-count': z.string().regex(/^\d+$/),
  'x-goog-meta-vdp-like-count': z.string().regex(/^\d+$/),
  'x-goog-meta-vdp-comment-count': z.string().regex(/^\d+$/),
  'x-goog-meta-vdp-top-comment-1': z.string().max(500).optional(),
  'x-goog-meta-vdp-top-comment-2': z.string().max(500).optional(),
  'x-goog-meta-vdp-tags': z.string().max(200), // comma-separated
  'x-goog-meta-vdp-curator-id': z.string().min(1),
}).partial(); // All fields optional for flexibility

export type VDPStorageMetadata = z.infer<typeof VDP_STORAGE_METADATA_SCHEMA>;

// Sidecar JSON schema for complex VDP data
export const VDP_SIDECAR_SCHEMA = z.object({
  contentId: z.string().regex(/^C\d{6}$/),
  platform: z.enum(['tiktok', 'instagram', 'youtube', 'reels', 'shorts']),
  origin: z.enum(['real', 'ai-generated']),
  sourceUrl: z.string().url(),
  caption: z.string().max(1000),
  postedAt: z.string().datetime(),
  engagement: z.object({
    viewCount: z.number().int().min(0),
    likeCount: z.number().int().min(0),
    commentCount: z.number().int().min(0),
    shareCount: z.number().int().min(0).optional(),
  }),
  topComments: z.array(z.string().max(500)).max(5).optional(),
  tags: z.array(z.string().max(50)).max(20),
  curatorId: z.string().min(1),
  extractedData: z.object({
    asrTranscript: z.string().optional(),
    ocrText: z.string().optional(),
    detectedObjects: z.array(z.string()).optional(),
    dominantColors: z.array(z.string()).optional(),
  }).optional(),
  // VDP analysis data
  overallAnalysis: z.object({
    summary: z.string().optional(),
    confidence: z.object({
      overall: z.number().min(0).max(1).optional(),
      metadata_collection: z.number().min(0).max(1).optional(),
      detailed_analysis: z.number().min(0).max(1).optional(),
    }).optional(),
    audience_reaction: z.object({
      notable_comments: z.array(z.any()).optional(),
      sentiment_analysis: z.string().optional(),
      engagement_patterns: z.string().optional(),
    }).optional(),
  }).optional(),
}).partial();

export type VDPSidecar = z.infer<typeof VDP_SIDECAR_SCHEMA>;

