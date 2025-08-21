const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const { GoogleGenAI } = require('@google/genai');
const { VDP_SCHEMA } = require('./constants');
const execAsync = promisify(exec);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });

// VDP Clone Complete System Instruction (true-hybrid-v5 level) - Evidence Pack 완전 제거
const SYSTEM_INSTRUCTION = `You are 'Viral DNA Profile Extractor', a world-class expert in viral short-form video analysis. Your expertise lies not just in identifying what happens in a video, but in understanding the underlying narrative structure, cinematic techniques, audio cues, and cultural context (memes, trends) that make a video successful. You are precise, analytical, and objective.

Your sole purpose is to meticulously analyze an input video and its associated metadata to generate a comprehensive, structured VDP (Viral DNA Profile) in a valid JSON format.

[CRITICAL: Hook 수치 필드 강제 + 밀도 플로어]
- Hook Genome 분석 시 반드시 startSec(0-10초), endSec(0-10초), strength(0-1.0), trigger_modalities[], microbeats_sec[] 필드를 포함하세요.
- 텍스트 라벨만 제공하는 것은 금지됩니다. 반드시 정량적 수치를 산출하세요.
- Hook Gate 기준: startSec ≤ 3.0초, strength ≥ 0.70
- 밀도 기준: 최소 4개 scenes, 8개 shots, 20개 keyframes (30초 이하 영상은 2/4/8)
- 모든 scene에는 shots[] 배열 필수, 모든 shot에는 keyframes[] 배열 필수 (최소 2개 keyframes)

[Little change Patch — "additional Essentials, keep Core Intact"]
Do NOT change (non‑negotiables):
* Keep all existing fields and names exactly as they are.
* Preserve shots[].keyframes[].t_rel_shot (relative timing) — this is a core current app's strength.
* Keep asr_transcript strictly in the original spoken language (dialogue and proper nouns unaltered). If needed, use asr_translation_en for the English rendering only.
* Do not renumber scenes/shots; do not alter existing timestamps.
Add exactly these capabilities (and nothing else):
1. Scene Importance (lightweight, mandatory per scene)
    * For every scenes[i], ensure an importance string exists with one of: "critical" | "major" | "supporting".
    * Heuristic:
        * "critical" if the scene contains the hook window, a reveal/peak keyframe, or a CTA.
        * "major" if it advances the narrative or contains strong emotion/action beats.
        * Otherwise "supporting".
    * Do not add extra fields; just the single importance label.
2. Visual Brand/Service NER from OCR (merge into service_mentions)
    * Run NER over on‑screen text (use overall_analysis.ocr_text and any detected signs/logos).
    * When a brand/venue/service is found (e.g., "7‑Eleven"), add or merge into service_mentions[] with:
        * name: exact text as seen on screen (keep native script/casing; do not romanize).
        * type: "service".
        * sources: include "visual" (and "ocr" if that's the source). If the same entity already exists from ASR, merge sources (do not duplicate).
        * time_ranges: list of [startSec, endSec] where the sign/logo is visible.
        * confidence: "high" if OCR + visual both support; else "medium".
        * evidence: 1–2 short strings (e.g., "'7 ELEVEN' sign visible on storefront").
3. Idempotent Merge Rules for Mentions
    * If an ASR‑derived mention (e.g., "농협은행") already exists, and the same entity is detected visually, merge into one object: union the sources, append time_ranges, append evidence.
    * Keep product_mentions and service_mentions separate (no cross‑type merging).
4. Bilingual Fidelity (keep the current advantage)
    * Never replace native proper nouns in asr_transcript.
    * If English is useful, put it only in asr_translation_en.
    * Keyframes' desc may stay English; do not remove or rename t_rel_shot.

[MENTIONS_ONLY — products & services with evidential promotion status]

Scope
- Add ONLY two top-level arrays to the VDP: "product_mentions": [], "service_mentions": [].
- If nothing is detected, keep them as empty arrays [] (NOT null). Do not add any other new fields.

Capture rule
- Record an item ONLY when supported by explicit evidence from:
  • ASR (spoken words in the video),
  • OCR/on-frame captions/hashtags (visible in frames),
  • platform_caption/description (if provided as input),
  • platform_ui labels (e.g., "Paid partnership with …", if provided as input),
  • clear visual/logotype.
- Prefer evidence over inference. If unsure, skip or set confidence:"low".
- Do NOT classify "ad vs content".

Item shape (both arrays)
{
  "type": "product" | "service",
  "name": "<verbatim brand/service name as seen/heard>",
  "category": "<short English noun, optional>",
  "sources": ["asr" | "ocr" | "platform_caption" | "platform_ui" | "visual"+],   // ≥1
  "time_ranges": [[startSec, endSec]+],                                           // omit if unknown
  "evidence": ["<short quote/snippet or visual note>"+],                          // minimal, concrete
  "promotion": {
    "status": "paid" | "gifted" | "affiliate" | "organic" | "unknown",
    "signals": ["#광고","유료광고","paid partnership","sponsored",
                "협찬","무료 제공","제작비 지원","수수료 지급","affiliate","커미션",
                "공동구매","수익 배분","쿠폰코드","affiliate link",
                "#내돈내산","not sponsored","bought with my own money"+]          // keep original wording/lang
  },
  "confidence": "low" | "medium" | "high"
}

Decision logic for promotion.status (evidence-only)
- "paid": explicit paid/sponsored indications (e.g., "sponsored", "paid partnership", "#광고", "유료광고").
- "gifted": clear gift/PR sample terms (e.g., "협찬", "무료 제공/대여", "제작비 지원").
- "affiliate": explicit affiliate/commission terms (e.g., "affiliate", "수수료/커미션", "쿠폰코드 수익").
- "organic": explicit self-funded claims (e.g., "#내돈내산", "not sponsored", "bought with my own money") AND no conflicting paid/gifted/affiliate signals.
- Otherwise "unknown". Never guess.
- Precedence when multiple signals appear: paid > gifted > affiliate > organic > unknown.
- If platform metadata/labels are NOT part of the input, do NOT infer—leave status as "unknown" unless evidence exists in ASR/OCR/visual.

Merging & hygiene
- Merge duplicates of the same item (union time_ranges/evidence/signals). No hallucinated brands/services.
- Keep proper names exactly as written; you MAY add translation.en alongside originals if helpful.
- Do NOT change any scene/shot timecodes or other VDP fields.

Output
- JSON only, conforming to your existing schema plus these two arrays.

[LANGUAGE_POLICY — FIELD-LEVEL CONTROL]

Defaults:
- Use ENGLISH for all metadata/analysis fields: summary, composition.notes, visual_style.*, edit_grammar.*, tags, overall_analysis.*, graph_refs.*, etc.
- Preserve ORIGINAL language only for: narrative_unit.dialogue, on_screen_text (OCR), asr_transcript.
- Every free-text field must carry a BCP-47 language code (e.g., "lang":"en", "lang":"ko").

For preserved-original fields:
- Provide both forms:
  - original.text (lang = source language, e.g., "ko")
  - translation.en (concise, faithful English translation), when feasible

Normalization:
- If any non-English token appears in metadata/analysis fields, normalize to English and (optionally) copy the original into *.notes_localized[]. 
- Enumerations must be in English only (use allowed enums).

Self-check (fail → autofix, no timecode changes):
- dialogue/on_screen_text/asr_transcript: may be non-English but MUST include lang (BCP-47).
- All other fields: lang=="en". If not, translate to English and set lang="en".

[HOOK_GENOME_ANALYSIS — MANDATORY]

Purpose:
- In the \`overall_analysis\` object, you MUST add a new field called \`hookGenome\`.
- This field is a structured object that precisely breaks down the video's primary hook, typically occurring within the first 3 seconds.

Field Definitions:
- "startSec": The absolute start time in seconds of the hook. This should align with the start of the scene where \`narrative_role\` is 'Hook'.
- "endSec": The absolute end time in seconds when the core hook is established.
- "pattern": Classify the hook's narrative strategy from the enum: "problem_solution", "pattern_break", "question", "proof", "other".
- "delivery": Identify the primary medium used to deliver the hook from the enum: "dialogue", "voiceover", "on_screen_text", "visual_gag", "sfx_only".
- "strength": Provide a float value from 0.0 to 1.0 representing your confidence in the hook's ability to capture viewer attention, considering clarity, originality, and emotional impact.

[UGC_COMMENTS_LANGUAGE — light policy]

Treat user comments as source-of-truth.
- Store each comment exactly as written in its original language (no translation, no rewriting, no normalization). Keep emojis/slang/punctuation as-is.
- Add a language tag per comment using IETF BCP-47 (e.g., "lang":"ko"); if unknown, use "und".
- When helpful, you MAY add a separate "translation.en" field — but the original remains canonical and MUST stay untouched.
- Do not paraphrase, merge, or censor comments. Preserve original line breaks and message boundaries.
- If any comment text appears translated, regenerate ONLY the comments section restoring source text (timecodes/scene boundaries unchanged).

[POST_QA_AUTOFIX — UNIVERSAL COMPLIANCE & REGEN]

Purpose:
- Before emitting the final JSON, run a full self-check. If any rule is violated, regenerate ONLY the affected scene/shot with minimal edits to satisfy the rule.
- Never change timecodes or shot boundaries; only add missing keyframes/notes/summary.

Checks (all must pass):
1) PRIORITY_RULES
   - Scenes with narrative_role ∈ {Hook, Punchline} must include \`"importance":"critical"\` (if schema supports it).
   - In a Hook scene, any shot with camera.shot == "ECU" must have ≥ 3 keyframes (start, peak, end). The end keyframe's desc must describe closure (e.g., brief pause / hand freezes / time clearly visible / breath held).

2) SEGMENTATION
   - On any hard cut, dissolve, location/time shift, narrative beat change, dominant audio/graphics change, or qualitative camera shift (static ↔ handheld/pan/tilt/dolly), START A NEW SCENE.
   - 1–6 shots per scene. No timeline gaps or overlaps.

3) VERBOSITY_FLOOR (minimum detail by scene duration)
   - duration < 3s: ≥2 keyframes, ≥1 composition.note, summary ≥60 chars
   - 3s ≤ duration ≤ 7s: ≥3 keyframes, ≥2 notes, summary ≥90 chars (mention camera style, lighting, audio/mood change)
   - duration > 7s: ≥4 keyframes, ≥2 notes, summary ≥120 chars (mention camera movement + location/time cues)

4) MICRO_SCENE_DETAIL (ultra-short or critical beats)
   - Applies if duration ≤ 2s, or narrative_role ∈ {Hook, Reveal, Punchline, CTA}, or comedic_device includes expectation_subversion/anticlimax.
   - Require ≥3 keyframes (start, peak, end) and ≥2 composition.notes.
   - Explicitly set camera.shot, angle, and move (no "unknown").
   - Describe audio/SFX/tone changes in keyframes or summary.
   - If on-screen text is unreadable, note "text illegible".

5) ENUMS (allowed values only)
   - camera.shot ∈ {ECU, CU, MCU, MS, MLS, WS, EWS}
   - camera.angle ∈ {eye, high, low, overhead, dutch}
   - camera.move ∈ {static, pan, tilt, dolly, truck, handheld, crane, zoom}
   - composition.grid ∈ {left_third, center, right_third, symmetry}

6) TIME & BOUNDS
   - Enforce: scene.start ≤ shot.start < shot.end ≤ scene.end.
   - During fixes, do NOT alter timecodes or shot boundaries.

Auto-fix rules (apply only to failing IDs):
- If duration > 7s and keyframes < 4 → add exactly 1 keyframe (role = mid or peak) capturing facial/gesture change, camera movement, or audio shift.
- If 3–7s and composition.notes < 2 → add one concise note (e.g., "static ECU UI; centered; screen glow").
- If summary misses required mentions (camera style / lighting / audio or tone / movement / time cue), add only the missing bits.
- If Hook-ECU rule fails → add an end keyframe with a clear closure description.
- After fixes, re-run the full self-check; repeat up to 2 times. If still failing, set confidence="low" for that scene/shot and (if schema allows) record qa_flags with the violated items.

Output:
- JSON only. No extra text. Strictly follow the provided response schema.

[LAST_MILE_PATCH — minimal universal autofix]

Scope:
- Do not change timecodes or shot boundaries.
- Respect all higher-priority rules already in this prompt; run this only if a check fails.

Checks (micro):
1) Long-scene floor
   If scene.duration > 7.0s AND total keyframes (across its shots) < 4:
   → Add EXACTLY one keyframe (role: "mid" or "peak") describing a salient micro-change
     (facial/gesture shift, camera movement change, or audio/SFX shift).

2) Composition notes floor
   If 3.0s ≤ scene.duration ≤ 7.0s AND composition.notes < 2:
   → Add ONE concise note (e.g., "static ECU UI; centered; screen glow").

3) Summary completeness
   If the scene summary lacks either camera movement OR location/time cues:
   → Append ONLY the missing mention in one short clause.

Repair policy:
- Make the smallest possible change that satisfies the failing check.
- Do NOT delete or rename existing keyframes/notes.
- Perform at most one repair pass; then stop.

Output:
- JSON only; strictly follow the response schema.`;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Utility functions
async function downloadVideo(url, platform) {
  const downloadDir = path.join(__dirname, 'downloads');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const outputPath = path.join(downloadDir, `${platform}_${timestamp}.mp4`);
  
             // yt-dlp command without format selection (가장 안전한 방법)
           let ytDlpCommand = `yt-dlp -o "${outputPath}" "${url}"`;
           
           if (platform === 'instagram') {
             ytDlpCommand = `yt-dlp -o "${outputPath}" "${url}"`;
           } else if (platform === 'tiktok') {
             ytDlpCommand = `yt-dlp -o "${outputPath}" "${url}"`;
           } else if (platform === 'youtube') {
             // YouTube는 포맷 선택자 없이 자동 선택
             ytDlpCommand = `yt-dlp -o "${outputPath}" "${url}"`;
           }
  
  console.log(`Downloading video: ${ytDlpCommand}`);
  
  try {
    const { stdout, stderr } = await execAsync(ytDlpCommand, { timeout: 60000 });
    console.log('Download completed:', stdout);
    
    if (fs.existsSync(outputPath)) {
      return outputPath;
    } else {
      throw new Error('Video file not found after download');
    }
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Video download failed: ${error.message}`);
  }
}

async function analyzeVideoWithGemini(videoPath, url, platform) {
  const analysisStartTime = Date.now();
  let contentId = 'UNKNOWN'; // Declare contentId at function scope
  
  log('INFO', 'Starting Gemini video analysis', { 
    videoPath, 
    url, 
    platform,
    fileSize: fs.statSync(videoPath).size 
  });
  
  try {
    console.log(`[${new Date().toISOString()}] [INFO] Initializing Gemini model with structured response | {"model":"gemini-2.5-pro"}`);
    
    // Use new GoogleGenAI API approach
    
    // Read video file as base64
    const videoBuffer = fs.readFileSync(videoPath);
    const videoBase64 = videoBuffer.toString('base64');
    
    // Extract content ID from URL (reuse the function-scoped variable)
    contentId = 'UNKNOWN';
    if (platform === 'youtube') {
      const match = url.match(/(?:youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
      contentId = match ? match[1] : 'UNKNOWN';
    } else if (platform === 'instagram') {
      const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
      contentId = match ? match[1] : 'UNKNOWN';
    } else if (platform === 'tiktok') {
      const match = url.match(/\/video\/(\d+)/);
      contentId = match ? match[1] : 'UNKNOWN';
    }
    
    // VDP Clone Final 분석 요청
    const textPart = {
      text: `
      Please analyze the accompanying video file and the following information to generate its Viral DNA Profile based on your system instructions.

      **Analysis Input:**
      - content_id: "${contentId}"
      - parent_id: null
      - source_url: "${url}"
      - upload_date: "${new Date().toISOString()}"
      - platform: "${platform}"
      - view_count: 0
      - like_count: 0
      - comment_count: 0
      - share_count: 0
      - original_sound_id: null
      - original_sound_title: null
      - top_comments: No comments provided.

      CRITICAL: You MUST generate a valid JSON object that exactly follows the VDP schema with these required fields:
      - content_id (string)
      - default_lang (string) 
      - metadata (object with platform, source_url, upload_date, view_count, like_count, comment_count, share_count, hashtags, video_origin, cta_types, original_sound)
      - overall_analysis (object with summary, emotional_arc, hookGenome, audience_reaction, safety_flags, confidence, graph_refs, asr_transcript, asr_lang, asr_translation_en, ocr_text)
      - scenes (array of scene objects with scene_id, time_start, time_end, duration_sec, importance, narrative_unit, setting, shots)
      - product_mentions (array, can be empty [])
      - service_mentions (array, can be empty [])

      Return ONLY the JSON object - no other text, no markdown formatting, no explanation.
    `
    };
    
    const videoPart = {
      inlineData: {
        data: videoBase64,
        mimeType: "video/mp4"
      }
    };
    
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: { parts: [videoPart, textPart] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: VDP_SCHEMA,
        temperature: 0.1,
        candidateCount: 1,
        maxOutputTokens: 8192
      },
    });
    
    const text = result.text;
    
    const analysisTime = Date.now() - analysisStartTime;
    log('INFO', 'Gemini response received', {
      responseLength: text.length,
      analysisTimeMs: analysisTime,
      contentId
    });
    
    // Debug: Log the raw response
    console.log('=== GEMINI RAW RESPONSE START ===');
    console.log(text);
    console.log('=== GEMINI RAW RESPONSE END ===');
    
    // Check for empty response
    if (!text || text.trim().length === 0) {
      log('ERROR', 'Empty response from Gemini', { contentId, platform, url });
      throw new Error('Empty response from Gemini API');
    }
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('=== EXTRACTED JSON START ===');
      console.log(jsonMatch[0]);
      console.log('=== EXTRACTED JSON END ===');
      
      let vdpData;
      try {
        vdpData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        log('ERROR', 'JSON parsing failed', { 
          parseError: parseError.message,
          jsonLength: jsonMatch[0].length,
          contentId 
        });
        throw new Error(`Invalid JSON response from Gemini: ${parseError.message}`);
      }
      
      // Debug: Log the structure we received
      log('INFO', 'Gemini response structure analysis', {
        hasMetadata: !!vdpData.metadata,
        hasOverallAnalysis: !!vdpData.overall_analysis,
        hasScenes: !!vdpData.scenes,
        topLevelKeys: Object.keys(vdpData),
        contentId
      });
      
      // Ensure required fields with safe object creation
      vdpData.content_id = contentId;
      
      // Create metadata object if it doesn't exist
      if (!vdpData.metadata) {
        log('WARN', 'Metadata object missing from Gemini response, creating it', { contentId });
        vdpData.metadata = {};
      }
      
      // Safely set metadata fields
      vdpData.metadata.platform = platform;
      vdpData.metadata.source_url = url;
      vdpData.metadata.upload_date = new Date().toISOString();
      vdpData.metadata.view_count = 0;
      vdpData.metadata.like_count = 0;
      vdpData.metadata.comment_count = 0;
      vdpData.metadata.share_count = 0;
      vdpData.metadata.video_origin = "Real-Footage";
      vdpData.metadata.hashtags = vdpData.metadata.hashtags || [];
      vdpData.metadata.cta_types = vdpData.metadata.cta_types || [];
      vdpData.metadata.original_sound = vdpData.metadata.original_sound || {
        id: null,
        title: null
      };
      
      // Ensure mentions arrays exist
      vdpData.product_mentions = vdpData.product_mentions || [];
      vdpData.service_mentions = vdpData.service_mentions || [];
      
      // Ensure overall_analysis exists
      if (!vdpData.overall_analysis) {
        log('WARN', 'overall_analysis object missing from Gemini response, creating minimal structure', { contentId });
        vdpData.overall_analysis = {
          summary: "Analysis pending",
          emotional_arc: "Analysis pending",
          hookGenome: {
            startSec: 0,
            endSec: 3,
            pattern: "other",
            delivery: "visual_gag", 
            strength: 0.5,
            trigger_modalities: ["visual"],
            microbeats_sec: [0, 1.5, 3]
          },
          audience_reaction: {
            analysis: "Analysis pending",
            common_reactions: [],
            notable_comments: [],
            overall_sentiment: "Analysis pending"
          },
          safety_flags: [],
          confidence: {
            overall: 0.5,
            scene_classification: 0.5,
            device_analysis: 0.5
          },
          graph_refs: {
            potential_meme_template: "Analysis pending",
            related_hashtags: []
          }
        };
      }
      
      // Ensure scenes array exists
      if (!vdpData.scenes) {
        log('WARN', 'scenes array missing from Gemini response, creating empty array', { contentId });
        vdpData.scenes = [];
      }
      
      // 품질 검증 및 보강
      const densityCheck = ensureDensityFloor(vdpData);
      const hookValidation = vdpData.overall_analysis?.hookGenome ? 
        validateHookGenome(vdpData.overall_analysis.hookGenome) : false;
      
      // 품질 상태 로깅
      log('INFO', 'VDP Quality Check', {
        contentId,
        densityCheck: densityCheck.currentDensity,
        densityPassed: !densityCheck.needsPass2,
        hookValidation,
        hookGatePassed: hookValidation
      });
      
      // 품질 배지 추가
      vdpData.quality_badges = {
        hook_gate_passed: hookValidation,
        density_floor_met: !densityCheck.needsPass2,
        mandatory_arrays_complete: !densityCheck.needsPass2,
        overall_quality: hookValidation && !densityCheck.needsPass2 ? 'excellent' : 
                       hookValidation || !densityCheck.needsPass2 ? 'good' : 'needs_improvement'
      };
      
      log('INFO', 'VDP analysis completed successfully', {
        contentId,
        sceneCount: vdpData.scenes?.length || 0,
        productMentions: vdpData.product_mentions.length,
        serviceMentions: vdpData.service_mentions.length,
        hookStrength: vdpData.overall_analysis?.hookGenome?.strength,
        totalAnalysisTimeMs: Date.now() - analysisStartTime,
        qualityBadges: vdpData.quality_badges
      });
      
      return vdpData;
    } else {
      throw new Error('Invalid JSON response from Gemini');
    }
    
  } catch (error) {
    log('ERROR', 'Gemini analysis failed', {
      error: error.message,
      stack: error.stack,
      contentId,
      platform,
      analysisTimeMs: Date.now() - analysisStartTime
    });
    throw new Error(`Video analysis failed: ${error.message}`);
  }
}

// 2-Pass 밀도 플로어 검증 및 보강 함수
function ensureDensityFloor(vdpData) {
  const DENSITY_SCENES_MIN = 4;
  const DENSITY_SHOTS_MIN = 8;
  const DENSITY_KEYFRAMES_MIN = 20;
  const MIN_KF_PER_SHOT = 3;
  
  let needsPass2 = false;
  
  // Pass 1: 밀도 검증
  const totalScenes = vdpData.scenes?.length || 0;
  const totalShots = vdpData.scenes?.reduce((sum, scene) => sum + (scene.shots?.length || 0), 0) || 0;
  const totalKeyframes = vdpData.scenes?.reduce((sum, scene) => 
    sum + (scene.shots?.reduce((shotSum, shot) => shotSum + (shot.keyframes?.length || 0), 0) || 0), 0) || 0;
  
  console.log(`Density Check - Scenes: ${totalScenes}/${DENSITY_SCENES_MIN}, Shots: ${totalShots}/${DENSITY_SHOTS_MIN}, Keyframes: ${totalKeyframes}/${DENSITY_KEYFRAMES_MIN}`);
  
  // Short-mode 감지 (30초 이하)
  const isShortMode = vdpData.metadata?.duration_sec < 30;
  const shortModeThresholds = {
    scenes: 2,
    shots: 4,
    keyframes: 8
  };
  
  const thresholds = isShortMode ? shortModeThresholds : {
    scenes: DENSITY_SCENES_MIN,
    shots: DENSITY_SHOTS_MIN,
    keyframes: DENSITY_KEYFRAMES_MIN
  };
  
  // 밀도 미달 검출
  if (totalScenes < thresholds.scenes || totalShots < thresholds.shots || totalKeyframes < thresholds.keyframes) {
    needsPass2 = true;
    console.log(`Density Floor not met. Requires Pass 2. Short-mode: ${isShortMode}`);
  }
  
  // Mandatory 배열 검증
  if (vdpData.scenes) {
    for (let i = 0; i < vdpData.scenes.length; i++) {
      const scene = vdpData.scenes[i];
      
      // shots[] 배열 필수
      if (!scene.shots || scene.shots.length === 0) {
        needsPass2 = true;
        console.log(`Scene ${i} missing shots array`);
      } else {
        // 각 shot에 keyframes[] 필수
        for (let j = 0; j < scene.shots.length; j++) {
          const shot = scene.shots[j];
          if (!shot.keyframes || shot.keyframes.length < 2) {
            needsPass2 = true;
            console.log(`Shot ${j} in scene ${i} missing keyframes or insufficient keyframes`);
          }
        }
      }
    }
  }
  
  return { needsPass2, currentDensity: { totalScenes, totalShots, totalKeyframes }, thresholds };
}

// Hook 수치 필드 검증
function validateHookGenome(hookGenome) {
  const requiredFields = ['startSec', 'endSec', 'strength', 'trigger_modalities', 'microbeats_sec'];
  const missingFields = requiredFields.filter(field => !hookGenome[field]);
  
  if (missingFields.length > 0) {
    console.log(`Hook Genome missing required fields: ${missingFields.join(', ')}`);
    return false;
  }
  
  // Hook Gate 검증
  const hookGatePassed = hookGenome.startSec <= 3.0 && hookGenome.strength >= 0.70;
  console.log(`Hook Gate: ${hookGatePassed ? 'PASS' : 'FAIL'} (startSec: ${hookGenome.startSec}, strength: ${hookGenome.strength})`);
  
  return hookGatePassed;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'universal-vdp-clone',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Quality check endpoint
app.post('/api/quality/check', (req, res) => {
  try {
    const vdpData = req.body;
    
    if (!vdpData) {
      return res.status(400).json({ error: 'VDP data is required' });
    }
    
    const densityCheck = ensureDensityFloor(vdpData);
    const hookValidation = vdpData.overall_analysis?.hookGenome ? 
      validateHookGenome(vdpData.overall_analysis.hookGenome) : false;
    
    const qualityReport = {
      timestamp: new Date().toISOString(),
      content_id: vdpData.content_id,
      quality_badges: {
        hook_gate_passed: hookValidation,
        density_floor_met: !densityCheck.needsPass2,
        mandatory_arrays_complete: !densityCheck.needsPass2,
        overall_quality: hookValidation && !densityCheck.needsPass2 ? 'excellent' : 
                       hookValidation || !densityCheck.needsPass2 ? 'good' : 'needs_improvement'
      },
      metrics: {
        scenes: densityCheck.currentDensity.totalScenes,
        shots: densityCheck.currentDensity.totalShots,
        keyframes: densityCheck.currentDensity.totalKeyframes,
        hook_start_sec: vdpData.overall_analysis?.hookGenome?.startSec,
        hook_strength: vdpData.overall_analysis?.hookGenome?.strength
      },
      thresholds: densityCheck.thresholds,
      recommendations: []
    };
    
    // 개선 권장사항 생성
    if (!hookValidation) {
      qualityReport.recommendations.push('Hook 수치 필드 보강 필요 (startSec, strength, trigger_modalities, microbeats_sec)');
    }
    if (densityCheck.needsPass2) {
      qualityReport.recommendations.push('밀도 플로어 미달 - scenes/shots/keyframes 보강 필요');
    }
    
    res.json(qualityReport);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// VDP generation endpoint for file upload
app.post('/api/vdp/generate', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'VIDEO_FILE_REQUIRED',
        message: 'Video file is required'
      });
    }

    console.log('Processing video file:', req.file.filename);
    
    const videoPath = req.file.path;
    const platform = req.body.platform || 'unknown';
    const url = req.body.source_url || '';
    
    // Analyze with Gemini
    const vdpResult = await analyzeVideoWithGemini(videoPath, url, platform);
    
    // Clean up uploaded file
    fs.unlinkSync(videoPath);
    
    res.json({
      status: 'success',
      vdp: vdpResult,
      processing_time: Date.now() - req.startTime
    });

  } catch (error) {
    console.error('VDP generation error:', error);
    res.status(500).json({
      error: 'VDP_GENERATION_FAILED',
      message: error.message
    });
  }
});

// URL processing endpoint
app.post('/api/vdp/url', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { url, platform } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL_REQUIRED',
        message: 'URL is required'
      });
    }

    console.log('Processing URL:', url);
    
    // Determine platform if not provided
    let detectedPlatform = platform;
    if (!detectedPlatform) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        detectedPlatform = 'youtube';
      } else if (url.includes('instagram.com')) {
        detectedPlatform = 'instagram';
      } else if (url.includes('tiktok.com')) {
        detectedPlatform = 'tiktok';
      } else {
        detectedPlatform = 'unknown';
      }
    }
    
    // Download video
    const videoPath = await downloadVideo(url, detectedPlatform);
    
    // Analyze with Gemini
    const vdpResult = await analyzeVideoWithGemini(videoPath, url, detectedPlatform);
    
    // Clean up downloaded file
    fs.unlinkSync(videoPath);

    res.json({
      status: 'success',
      vdp: vdpResult,
      processing_time: Date.now() - startTime
    });

  } catch (error) {
    console.error('URL processing error:', error);
    res.status(500).json({
      error: 'URL_PROCESSING_FAILED',
      message: error.message
    });
  }
});

// Comprehensive logging system
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'universal-vdp-clone',
    message,
    ...(data && { data })
  };
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${data ? ` | ${JSON.stringify(data)}` : ''}`);
  
  // Additional file logging for important events
  if (level === 'ERROR' || level === 'WARN') {
    try {
      const logDir = path.join(__dirname, 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }
}

// Enhanced error tracking middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  log('INFO', `${req.method} ${req.path} started`, {
    requestId: req.requestId,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type')
  });
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(obj) {
    const processingTime = Date.now() - req.startTime;
    
    if (obj.error) {
      log('ERROR', `Request ${req.requestId} failed`, {
        error: obj.error,
        message: obj.message,
        processingTime,
        path: req.path
      });
    } else {
      log('INFO', `Request ${req.requestId} completed`, {
        status: 'success',
        processingTime,
        path: req.path
      });
    }
    
    return originalJson.call(this, obj);
  };
  
  next();
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  log('INFO', '🚀 Universal VDP Clone Service started', {
    port: PORT,
    endpoints: {
      health: `http://localhost:${PORT}/api/health`,
      generate: `http://localhost:${PORT}/api/vdp/generate`, 
      url: `http://localhost:${PORT}/api/vdp/url`
    },
    features: [
      'Evidence Pack REMOVED for stability',
      'true-hybrid-v5 analysis level',
      'Hook Genome analysis',
      'Scene-by-scene breakdown',
      'Promotion tracking',
      'Multi-language support'
    ]
  });
});