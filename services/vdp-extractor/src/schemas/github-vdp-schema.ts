import { z } from 'zod';

// GitHub VDP 추출기와 완전히 동일한 스키마 구조
// Based on vdp-C000888.json and vdp-C000889.json

// Metadata schema (GitHub VDP 구조)
export const VDPMetadataSchema = z.object({
  comment_count: z.number().int().min(0),
  cta_types: z.array(z.string()).optional(),
  hashtags: z.array(z.string()),
  like_count: z.number().int().min(0),
  original_sound: z.object({
    id: z.string().nullable(),
    title: z.string().nullable()
  }).optional(),
  platform: z.string(), // Instagram, TikTok, YouTube, etc.
  share_count: z.number().int().min(0),
  source_url: z.string().url(),
  upload_date: z.string().datetime(),
  video_origin: z.enum(['Real-Footage', 'AI-Generated']),
  view_count: z.number().int().min(0)
});

// OCR/ASR text structure
export const TextWithTranslationSchema = z.object({
  lang: z.string(),
  text: z.string(),
  translation_en: z.string().nullable().optional()
});

// Notable comments structure
export const NotableCommentSchema = z.object({
  lang: z.string(),
  text: z.string(),
  translation_en: z.string()
});

// Audience reaction analysis
export const AudienceReactionSchema = z.object({
  analysis: z.string(),
  common_reactions: z.array(z.string()),
  notable_comments: z.array(NotableCommentSchema),
  overall_sentiment: z.string()
});

// Confidence scores
export const ConfidenceSchema = z.object({
  device_analysis: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
  scene_classification: z.number().min(0).max(1)
});

// Graph references
export const GraphRefsSchema = z.object({
  potential_meme_template: z.string(),
  related_hashtags: z.array(z.string())
});

// Overall analysis structure
export const OverallAnalysisSchema = z.object({
  audience_reaction: AudienceReactionSchema,
  confidence: ConfidenceSchema,
  emotional_arc: z.string(),
  graph_refs: GraphRefsSchema,
  safety_flags: z.array(z.string()),
  summary: z.string(),
  asr_lang: z.string(),
  asr_transcript: z.string(),
  asr_translation_en: z.string(),
  ocr_text: z.array(TextWithTranslationSchema)
});

// Camera settings
export const CameraSchema = z.object({
  angle: z.enum(['eye', 'high', 'low']),
  move: z.enum(['static', 'handheld', 'dolly', 'zoom']),
  shot: z.enum(['CU', 'ECU', 'MCU', 'MS', 'LS', 'WS'])
});

// Composition
export const CompositionSchema = z.object({
  grid: z.enum(['center', 'left', 'right', 'top', 'bottom']),
  notes: z.array(z.string())
});

// Keyframe
export const KeyframeSchema = z.object({
  desc: z.string(),
  role: z.enum(['start', 'peak', 'mid', 'end']),
  t_rel_shot: z.number()
});

// Shot
export const ShotSchema = z.object({
  camera: CameraSchema,
  composition: CompositionSchema,
  confidence: z.enum(['high', 'medium', 'low']),
  end: z.number(),
  keyframes: z.array(KeyframeSchema),
  shot_id: z.string(),
  start: z.number()
});

// Audio style
export const AudioEventSchema = z.object({
  description: z.string(),
  event: z.string(),
  intensity: z.string(),
  timestamp: z.number()
});

export const AudioStyleSchema = z.object({
  ambient_sound: z.string(),
  audio_events: z.array(AudioEventSchema),
  music: z.string(),
  tone: z.string()
});

// Edit grammar
export const EditGrammarSchema = z.object({
  camera_style: z.enum(['handheld', 'static', 'cinematic']),
  cut_speed: z.enum(['fast', 'medium', 'slow']),
  subtitle_style: z.enum(['broadcast_entertainment', 'minimal', 'none'])
});

// Visual style
export const VisualStyleSchema = z.object({
  cinematic_properties: z.string(),
  edit_grammar: EditGrammarSchema,
  lighting: z.string(),
  mood_palette: z.array(z.string())
});

// Setting
export const SettingSchema = z.object({
  audio_style: AudioStyleSchema,
  location: z.string(),
  visual_style: VisualStyleSchema
});

// Narrative unit
export const NarrativeUnitSchema = z.object({
  comedic_device: z.array(z.string()),
  dialogue: z.string(),
  narrative_role: z.enum(['Hook', 'Demonstration', 'Problem_Solution', 'Conclusion']),
  rhetoric: z.array(z.string()),
  summary: z.string(),
  dialogue_lang: z.string(),
  dialogue_translation_en: z.string()
});

// Scene
export const SceneSchema = z.object({
  duration_sec: z.number(),
  narrative_unit: NarrativeUnitSchema,
  scene_id: z.string(),
  setting: SettingSchema,
  shots: z.array(ShotSchema),
  time_end: z.number(),
  time_start: z.number(),
  importance: z.enum(['critical', 'high', 'medium', 'low']).optional()
});

// Promotion status
export const PromotionSchema = z.object({
  signals: z.array(z.string()),
  status: z.enum(['sponsored', 'organic', 'unknown'])
});

// Product mention
export const ProductMentionSchema = z.object({
  confidence: z.enum(['high', 'medium', 'low']),
  evidence: z.array(z.string()),
  name: z.string(),
  promotion: PromotionSchema,
  sources: z.array(z.enum(['ocr', 'asr', 'visual'])),
  type: z.string(),
  category: z.string(),
  time_ranges: z.array(z.array(z.number()))
});

// Service mention
export const ServiceMentionSchema = z.object({
  confidence: z.enum(['high', 'medium', 'low']),
  evidence: z.array(z.string()),
  name: z.string(),
  promotion: PromotionSchema,
  sources: z.array(z.enum(['ocr', 'asr', 'visual'])),
  type: z.string(),
  category: z.string(),
  time_ranges: z.array(z.array(z.number()))
});

// Main GitHub VDP Schema - 완전히 동일한 구조
export const GitHubVDPSchema = z.object({
  content_id: z.string(),
  metadata: VDPMetadataSchema,
  overall_analysis: OverallAnalysisSchema,
  scenes: z.array(SceneSchema),
  product_mentions: z.array(ProductMentionSchema),
  service_mentions: z.array(ServiceMentionSchema),
  default_lang: z.string()
});

export type GitHubVDP = z.infer<typeof GitHubVDPSchema>;
export type VDPMetadata = z.infer<typeof VDPMetadataSchema>;
export type OverallAnalysis = z.infer<typeof OverallAnalysisSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Shot = z.infer<typeof ShotSchema>;
export type ProductMention = z.infer<typeof ProductMentionSchema>;
export type ServiceMention = z.infer<typeof ServiceMentionSchema>;