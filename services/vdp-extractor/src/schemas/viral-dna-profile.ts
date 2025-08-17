import { z } from 'zod';

// Original Sound schema
export const OriginalSoundSchema = z.object({
  id: z.string().nullable(),
  title: z.string().nullable(),
});

// Metadata schema - matches GitHub VDP extractor structure
export const MetadataSchema = z.object({
  comment_count: z.number().int().min(0),
  cta_types: z.array(z.string()),
  hashtags: z.array(z.string()),
  like_count: z.number().int().min(0),
  original_sound: OriginalSoundSchema,
  platform: z.string(),
  share_count: z.number().int().min(0),
  source_url: z.string().url(),
  upload_date: z.string().datetime(),
  video_origin: z.enum(['Real-Footage', 'AI-Generated', 'Mixed', 'Unknown']),
  view_count: z.number().int().min(0),
});

// Notable comment schema
export const NotableCommentSchema = z.object({
  lang: z.string(),
  text: z.string(),
  translation_en: z.string(),
});

// Audience reaction schema
export const AudienceReactionSchema = z.object({
  analysis: z.string(),
  common_reactions: z.array(z.string()),
  notable_comments: z.array(NotableCommentSchema),
  overall_sentiment: z.string(),
});

// Confidence schema
export const ConfidenceSchema = z.object({
  device_analysis: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
  scene_classification: z.number().min(0).max(1),
});

// Graph references schema
export const GraphRefsSchema = z.object({
  potential_meme_template: z.string(),
  related_hashtags: z.array(z.string()),
});

// OCR text schema
export const OCRTextSchema = z.object({
  lang: z.string(),
  text: z.string(),
  translation_en: z.string().nullable(),
});

// Overall analysis schema
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
  ocr_text: z.array(OCRTextSchema),
});

// Promotion status schema
export const PromotionSchema = z.object({
  signals: z.array(z.string()),
  status: z.enum(['sponsored', 'organic', 'unknown']),
});

// Product/Service mention schema
export const MentionSchema = z.object({
  confidence: z.enum(['high', 'medium', 'low']),
  evidence: z.array(z.string()),
  name: z.string(),
  promotion: PromotionSchema,
  sources: z.array(z.enum(['ocr', 'asr', 'visual'])),
  type: z.enum(['product', 'service']),
  category: z.string(),
  time_ranges: z.array(z.tuple([z.number(), z.number()])),
});

// Camera schema
export const CameraSchema = z.object({
  angle: z.enum(['eye', 'high', 'low', 'bird', 'worm']),
  move: z.enum(['static', 'handheld', 'pan', 'tilt', 'zoom', 'dolly', 'crane']),
  shot: z.enum(['ECU', 'CU', 'MCU', 'MS', 'MLS', 'LS', 'ELS']),
});

// Composition schema
export const CompositionSchema = z.object({
  grid: z.enum(['center', 'rule_of_thirds', 'symmetrical', 'dynamic']),
  notes: z.array(z.string()),
});

// Keyframe schema
export const KeyframeSchema = z.object({
  desc: z.string(),
  role: z.enum(['start', 'peak', 'mid', 'end']),
  t_rel_shot: z.number(),
});

// Shot schema
export const ShotSchema = z.object({
  camera: CameraSchema,
  composition: CompositionSchema,
  confidence: z.enum(['high', 'medium', 'low']),
  end: z.number(),
  keyframes: z.array(KeyframeSchema),
  shot_id: z.string(),
  start: z.number(),
});

// Comedic device schema
export const ComedyDeviceSchema = z.enum([
  'relatability',
  'timing',
  'surprise',
  'exaggeration',
  'absurdity',
  'irony',
  'contrast',
  'repetition',
  'callback',
  'escalation'
]);

// Narrative unit schema
export const NarrativeUnitSchema = z.object({
  comedic_device: z.array(ComedyDeviceSchema),
  dialogue: z.string(),
  narrative_role: z.enum([
    'Hook',
    'Setup',
    'Demonstration',
    'Problem_Solution',
    'Climax',
    'Resolution',
    'Call_to_Action'
  ]),
  rhetoric: z.array(z.enum([
    'storytelling',
    'curiosity_gap',
    'problem_solution',
    'demonstration',
    'pathos',
    'ethos',
    'logos',
    'comparison',
    'hyperbole'
  ])),
  summary: z.string(),
  dialogue_lang: z.string(),
  dialogue_translation_en: z.string(),
});

// Audio event schema
export const AudioEventSchema = z.object({
  description: z.string(),
  event: z.string(),
  intensity: z.enum(['Low', 'Medium', 'High']),
  timestamp: z.number(),
});

// Audio style schema
export const AudioStyleSchema = z.object({
  ambient_sound: z.string(),
  audio_events: z.array(AudioEventSchema),
  music: z.string(),
  tone: z.string(),
});

// Edit grammar schema
export const EditGrammarSchema = z.object({
  camera_style: z.enum(['static', 'handheld', 'gimbal', 'tripod']),
  cut_speed: z.enum(['slow', 'medium', 'fast', 'variable']),
  subtitle_style: z.enum(['broadcast_entertainment', 'social_media', 'educational', 'minimal']),
});

// Visual style schema
export const VisualStyleSchema = z.object({
  cinematic_properties: z.string(),
  edit_grammar: EditGrammarSchema,
  lighting: z.string(),
  mood_palette: z.array(z.string()),
});

// Setting schema
export const SettingSchema = z.object({
  audio_style: AudioStyleSchema,
  location: z.string(),
  visual_style: VisualStyleSchema,
});

// Scene schema
export const SceneSchema = z.object({
  duration_sec: z.number(),
  narrative_unit: NarrativeUnitSchema,
  scene_id: z.string(),
  setting: SettingSchema,
  shots: z.array(ShotSchema),
  time_end: z.number(),
  time_start: z.number(),
  importance: z.enum(['critical', 'high', 'medium', 'low']),
});

// Main Viral DNA Profile schema - exact GitHub VDP extractor structure
export const ViralDNAProfileSchema = z.object({
  content_id: z.string(),
  metadata: MetadataSchema,
  overall_analysis: OverallAnalysisSchema,
  product_mentions: z.array(MentionSchema),
  scenes: z.array(SceneSchema),
  service_mentions: z.array(MentionSchema),
  default_lang: z.string(),
});

// Type exports
export type ViralDNAProfile = z.infer<typeof ViralDNAProfileSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type OverallAnalysis = z.infer<typeof OverallAnalysisSchema>;
export type AudienceReaction = z.infer<typeof AudienceReactionSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Shot = z.infer<typeof ShotSchema>;
export type NarrativeUnit = z.infer<typeof NarrativeUnitSchema>;
export type Mention = z.infer<typeof MentionSchema>;
export type NotableComment = z.infer<typeof NotableCommentSchema>;
export type OCRText = z.infer<typeof OCRTextSchema>;

// Validation functions
export const validateViralDNAProfile = (data: unknown): ViralDNAProfile => {
  return ViralDNAProfileSchema.parse(data);
};

// Helper function to create empty VDP structure
export const createEmptyVDP = (contentId: string): Partial<ViralDNAProfile> => {
  return {
    content_id: contentId,
    metadata: {
      comment_count: 0,
      cta_types: [],
      hashtags: [],
      like_count: 0,
      original_sound: { id: null, title: null },
      platform: '',
      share_count: 0,
      source_url: '',
      upload_date: new Date().toISOString(),
      video_origin: 'Unknown',
      view_count: 0,
    },
    overall_analysis: {
      audience_reaction: {
        analysis: '',
        common_reactions: [],
        notable_comments: [],
        overall_sentiment: '',
      },
      confidence: {
        device_analysis: 0,
        overall: 0,
        scene_classification: 0,
      },
      emotional_arc: '',
      graph_refs: {
        potential_meme_template: '',
        related_hashtags: [],
      },
      safety_flags: [],
      summary: '',
      asr_lang: 'en',
      asr_transcript: '',
      asr_translation_en: '',
      ocr_text: [],
    },
    product_mentions: [],
    scenes: [],
    service_mentions: [],
    default_lang: 'en',
  };
};