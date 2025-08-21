// VDP Clone Final - Constants (Node.js version)
// Converted from TypeScript to JavaScript

const NOTABLE_COMMENT_SCHEMA = {
    type: "object",
    required: ["text", "lang"],
    properties: {
        text: { type: "string", description: "The original, verbatim comment text." },
        lang: { type: "string", description: "BCP-47 language code for the comment (e.g., 'ko', 'en', 'und')." },
        translation_en: { type: "string", nullable: true, description: "Concise, faithful English translation, if helpful." }
    }
};

const AUDIENCE_REACTION_SCHEMA = {
  type: "object",
  properties: {
    analysis: { type: "string", description: "Deep analysis of the audience's psychological and emotional reactions." },
    common_reactions: { type: "array", items: { type: "string" }, description: "List of common reactions or themes found in comments." },
    notable_comments: { 
        type: "array", 
        items: NOTABLE_COMMENT_SCHEMA,
        description: "List of specific, representative comments, preserved in their original language." 
    },
    overall_sentiment: { type: "string", description: "A summary of the overall sentiment (e.g., 'Highly Positive', 'Mixed but intrigued')." },
  },
  required: ["analysis", "common_reactions", "notable_comments", "overall_sentiment"],
};

const GRAPH_REFS_SCHEMA = {
    type: "object",
    properties: {
        potential_meme_template: { type: "string", description: "Description of how this video could become a meme template." },
        related_hashtags: { type: "array", items: { type: "string" }, description: "Hashtags related to the memes or trends referenced." }
    },
    required: ["potential_meme_template", "related_hashtags"]
};

const CONFIDENCE_SCORE_SCHEMA = {
    type: "object",
    description: "Detailed breakdown of the analysis confidence.",
    properties: {
        overall: { type: "number", description: "Overall confidence in the entire analysis." },
        scene_classification: { type: "number", description: "Confidence in the scene division and narrative role classification." },
        device_analysis: { type: "number", description: "Confidence in the identification of rhetorical and comedic devices." },
    },
    required: ["overall", "scene_classification", "device_analysis"],
};

const OCR_TEXT_SCHEMA = {
    type: "array",
    items: {
        type: "object",
        required: ["text", "lang"],
        properties: {
            text: { type: "string" },
            lang: { type: "string", description: "BCP-47 code for the on-screen text." },
            translation_en: { type: "string", nullable: true, description: "English translation of the text." }
        }
    }
};

const HOOK_GENOME_SCHEMA = {
    type: "object",
    description: "Detailed breakdown of the video's primary hook.",
    properties: {
        startSec: { type: "number", description: "Start time of the hook in seconds." },
        endSec: { type: "number", description: "End time of the hook in seconds." },
        pattern: { type: "string", enum: ["problem_solution", "pattern_break", "question", "proof", "other"], description: "The narrative pattern of the hook." },
        delivery: { type: "string", enum: ["dialogue", "voiceover", "on_screen_text", "visual_gag", "sfx_only"], description: "How the hook is delivered to the audience." },
        strength: { type: "number", description: "A score from 0.0 to 1.0 indicating the hook's effectiveness." }
    },
    required: ["startSec", "endSec", "pattern", "delivery", "strength"]
};

const OVERALL_ANALYSIS_SCHEMA = {
  type: "object",
  description: "A high-level analysis of the entire video.",
  properties: {
    summary: { type: "string", description: "A concise, comprehensive summary of the video's plot and message in English." },
    emotional_arc: { type: "string", description: "Description of the emotional journey the viewer experiences from start to finish in English." },
    hookGenome: HOOK_GENOME_SCHEMA,
    audience_reaction: AUDIENCE_REACTION_SCHEMA,
    safety_flags: { type: "array", items: { type: "string" }, description: "List of potential platform policy violations (e.g., 'profanity')." },
    confidence: CONFIDENCE_SCORE_SCHEMA,
    graph_refs: GRAPH_REFS_SCHEMA,
    asr_transcript: { type: "string", nullable: true },
    asr_lang: { type: "string", nullable: true, description: "BCP-47 code for the transcript language." },
    asr_translation_en: { type: "string", nullable: true },
    ocr_text: { ...OCR_TEXT_SCHEMA, nullable: true },
  },
  required: ["summary", "emotional_arc", "hookGenome", "audience_reaction", "safety_flags", "confidence", "graph_refs"],
};

const EDIT_GRAMMAR_SCHEMA = {
    type: "object",
    properties: {
        cut_speed: { type: "string", description: "Speed of cuts (e.g., 'slow', 'fast')." },
        camera_style: { type: "string", description: "Camera movement style (e.g., 'static_shot', 'handheld')." },
        subtitle_style: { type: "string", enum: ["none", "broadcast_entertainment", "news_caption", "simple_white_text"] },
    },
    required: ["cut_speed", "camera_style", "subtitle_style"],
};

const AUDIO_EVENT_SCHEMA = {
  type: "object",
  properties: {
    timestamp: { type: "number", description: "Timestamp of the event in seconds (float)." },
    event: { type: "string", enum: ["music_starts", "music_stops", "music_change", "music_crescendo", "narration_starts", "critical_sfx", "laughter", "singing_starts", "abrupt_sound_change"] },
    description: { type: "string", description: "A brief explanation of the sound event in English." },
    intensity: { type: "string", description: "The intensity of the audio event (e.g., 'High', 'Medium', 'Low')." },
  },
  required: ["timestamp", "event", "description", "intensity"]
};

const KEYFRAME_SCHEMA = {
  type: "object",
  required: ["role", "desc"],
  properties: {
    role: { type: "string", enum: ["start", "mid", "peak", "end"] },
    t_rel_shot: { type: "number", description: "Relative time in seconds within the shot.", nullable: true },
    desc: { type: "string", description: "Natural language description of the keyframe in English." },
  },
};

const CAMERA_SCHEMA = {
  type: "object",
  required: ["shot", "angle", "move"],
  properties: {
    shot: { type: "string", enum: ["ECU", "CU", "MCU", "MS", "MLS", "WS", "EWS"] },
    angle: { type: "string", enum: ["eye", "high", "low", "overhead", "dutch"] },
    move: { type: "string", enum: ["static", "pan", "tilt", "dolly", "truck", "handheld", "crane", "zoom"] },
  },
};

const COMPOSITION_SCHEMA = {
  type: "object",
  required: ["grid"],
  properties: {
    grid: { type: "string", enum: ["left_third", "center", "right_third", "symmetry"] },
    notes: { type: "array", items: { type: "string" }, description: "Short notes on composition in English (0-3 items).", nullable: true },
  },
};

const SHOT_SCHEMA = {
  type: "object",
  required: ["shot_id", "start", "end", "camera", "composition", "keyframes", "confidence"],
  properties: {
    shot_id: { type: "string", description: "Unique ID for the shot within the scene." },
    start: { type: "number", description: "Absolute start time of the shot in seconds, relative to the video start." },
    end: { type: "number", description: "Absolute end time of the shot in seconds, relative to the video start." },
    camera: CAMERA_SCHEMA,
    composition: COMPOSITION_SCHEMA,
    keyframes: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: KEYFRAME_SCHEMA,
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
};

const SCENE_SCHEMA = {
  type: "object",
  description: "Analysis of a single, distinct scene within the video.",
  properties: {
    scene_id: { type: "string", description: "A unique identifier for the scene, formatted as 'S<NN>_<Theme>' (e.g., 'S01_GukbapRestaurant')." },
    time_start: { type: "number", description: "The start time of the scene in seconds." },
    time_end: { type: "number", description: "The end time of the scene in seconds." },
    duration_sec: { type: "number", description: "The total duration of the scene in seconds (time_end - time_start)." },
    importance: { type: "string", enum: ["critical", "major", "supporting"], description: "The narrative importance of the scene." },
    narrative_unit: {
      type: "object",
      properties: {
        narrative_role: { type: "string", description: "The role of this scene in the overall story (e.g., 'Setup & Punchline')." },
        summary: { type: "string", description: "A summary of the events and actions within this scene, in English." },
        dialogue: { type: "string", description: "The full transcript of all dialogue in the scene, in its original language." },
        dialogue_lang: { type: "string", nullable: true, description: "IETF BCP-47 language tag for the dialogue (e.g., 'ko', 'en-US')." },
        dialogue_translation_en: { type: "string", nullable: true, description: "English translation of the dialogue." },
        rhetoric: { type: "array", items: { type: "string" }, description: "List of literary or rhetorical devices used (in snake_case)." },
        comedic_device: { type: "array", items: { type: "string" }, description: "List of specific comedic devices used (in snake_case)." }
      },
      required: ["narrative_role", "summary", "dialogue", "rhetoric", "comedic_device"],
    },
    setting: {
      type: "object",
      properties: {
        location: { type: "string", description: "The primary location of the scene." },
        visual_style: {
          type: "object",
          properties: {
            cinematic_properties: { type: "string", description: "A summary of key camera work, composition, and other cinematic techniques." },
            lighting: { type: "string", description: "Description of the lighting style and its effect." },
            mood_palette: { type: "array", items: { type: "string" }, description: "Keywords describing the color palette and mood." },
            edit_grammar: EDIT_GRAMMAR_SCHEMA,
          },
          required: ["cinematic_properties", "lighting", "mood_palette", "edit_grammar"],
        },
        audio_style: {
          type: "object",
          properties: {
            music: { type: "string", description: "Description of the background music and its mood." },
            ambient_sound: { type: "string", description: "Description of the background or ambient sounds." },
            tone: { type: "string", description: "The dominant tone of the dialogue or narration in the scene." },
            audio_events: { type: "array", items: AUDIO_EVENT_SCHEMA }
          },
          required: ["music", "ambient_sound", "tone", "audio_events"],
        },
      },
      required: ["location", "visual_style", "audio_style"],
    },
    shots: {
      type: "array",
      description: "An array of individual shots that comprise the scene.",
      items: SHOT_SCHEMA,
    }
  },
  required: ["scene_id", "time_start", "time_end", "duration_sec", "narrative_unit", "setting", "shots", "importance"],
};

const PROMOTION_SCHEMA = {
    type: "object",
    required: ["status", "signals"],
    properties: {
        status: { type: "string", enum: ["paid", "gifted", "affiliate", "organic", "unknown"] },
        signals: { type: "array", items: { type: "string" } }
    },
    description: "Details about the promotional nature of the mention."
};

const MENTION_ITEM_SCHEMA = {
    type: "object",
    required: ["type", "name", "sources", "evidence", "promotion", "confidence"],
    properties: {
        type: { type: "string", enum: ["product", "service"], description: "The type of mention." },
        name: { type: "string", description: "The verbatim name of the product or service." },
        category: { type: "string", nullable: true, description: "A short English noun for the product/service category." },
        sources: {
            type: "array",
            items: { type: "string", enum: ["asr", "ocr", "platform_caption", "platform_ui", "visual"] },
            description: "Evidence sources for the mention."
        },
        time_ranges: {
            type: "array",
            items: {
                type: "array",
                items: { type: "number" },
                minItems: 2,
                maxItems: 2,
            },
            nullable: true,
            description: "List of [start, end] time ranges in seconds where the mention occurs."
        },
        evidence: {
            type: "array",
            items: { type: "string" },
            description: "Short quotes or visual notes supporting the mention."
        },
        promotion: PROMOTION_SCHEMA,
        confidence: { type: "string", enum: ["low", "medium", "high"], description: "Confidence level of the detection." }
    }
};

const VDP_SCHEMA = {
  type: "object",
  properties: {
    content_id: { type: "string", description: "The unique 6-digit zero-padded content ID provided in the prompt." },
    default_lang: { type: "string", description: "Default language for analysis fields, e.g., 'en'." },
    metadata: {
      type: "object",
      properties: {
        platform: { type: "string" },
        source_url: { type: "string", description: "The full URL of the original video." },
        upload_date: { type: "string", description: "The platform upload timestamp in ISO 8601 format, provided by the user." },
        view_count: { type: "integer" },
        like_count: { type: "integer" },
        comment_count: { type: "integer" },
        share_count: { type: "integer" },
        hashtags: { type: "array", items: { type: "string" }, description: "Creative, viral-potential hashtags in English." },
        video_origin: { type: "string", description: "Classification of video source ('AI-Generated', 'Real-Footage', 'Unknown')." },
        cta_types: { type: "array", items: { type: "string" }, description: "Call to action types observed." },
        original_sound: {
            type: "object",
            properties: {
                id: { type: "string", nullable: true },
                title: { type: "string", nullable: true }
            },
            required: ['id', 'title']
        },
      },
      required: ["platform", "source_url", "upload_date", "view_count", "like_count", "comment_count", "share_count", "hashtags", "video_origin", "cta_types", "original_sound"],
    },
    overall_analysis: OVERALL_ANALYSIS_SCHEMA,
    scenes: {
      type: "array",
      items: SCENE_SCHEMA,
    },
    product_mentions: {
        type: "array",
        items: MENTION_ITEM_SCHEMA,
        description: "List of detected product mentions."
    },
    service_mentions: {
        type: "array",
        items: MENTION_ITEM_SCHEMA,
        description: "List of detected service mentions."
    },
  },
  required: ["content_id", "metadata", "overall_analysis", "scenes", "product_mentions", "service_mentions"],
};

module.exports = {
  VDP_SCHEMA,
  HOOK_GENOME_SCHEMA,
  OVERALL_ANALYSIS_SCHEMA,
  SCENE_SCHEMA,
  SHOT_SCHEMA,
  AUDIENCE_REACTION_SCHEMA,
  CONFIDENCE_SCORE_SCHEMA,
  GRAPH_REFS_SCHEMA,
  OCR_TEXT_SCHEMA,
  NOTABLE_COMMENT_SCHEMA,
  EDIT_GRAMMAR_SCHEMA,
  AUDIO_EVENT_SCHEMA,
  KEYFRAME_SCHEMA,
  CAMERA_SCHEMA,
  COMPOSITION_SCHEMA,
  PROMOTION_SCHEMA,
  MENTION_ITEM_SCHEMA
};
