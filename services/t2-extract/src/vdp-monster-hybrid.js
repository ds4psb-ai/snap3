/**
 * 괴물 하이브리드 VDP v2.1 생성기
 * OLD VDP의 강점(관객 인사이트, ASR/OCR 증거, 브랜드 구간 근거) + Hook Genome 통합
 * 영상 길이에 따라 유연하게 최대 16K 토큰 내 완결
 */

import { VertexAI } from '@google-cloud/vertexai';

// 환경 변수 설정
const PROJECT_ID = process.env.PROJECT_ID || 'tough-variety-466003-c5';
const REGION = process.env.REGION || 'us-central1';
const MODEL_NAME = process.env.MODEL_NAME || 'gemini-2.5-pro';

class MonsterHybridVDPGenerator {
    constructor() {
        this.vertexAI = new VertexAI({
            project: PROJECT_ID,
            location: REGION
        });
        this.model = this.vertexAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                maxOutputTokens: 16000,
                temperature: 0.1,
                responseMimeType: 'application/json'
            }
        });
    }

    /**
     * 영상 길이별 적응형 모드 결정
     * @param {number} duration - 영상 길이 (초)
     * @returns {object} 모드 설정
     */
    getAdaptiveMode(duration) {
        if (duration <= 9) {
            return {
                mode: 'S',
                scenes_target: '2-3',
                shots_per_scene: '2-3', 
                keyframes_per_shot: '3-4',
                hook_max_sec: Math.min(duration * 0.4, 3),
                token_budget: '8K-12K',
                target_tokens: Math.min(8000 + (duration * 600), 12000), // OLD VDP 수준 토큰 할당
                max_tokens: 12000
            };
        } else if (duration <= 20) {
            return {
                mode: 'M', 
                scenes_target: '4-5',
                shots_per_scene: '2-3',
                keyframes_per_shot: '3-4',
                hook_max_sec: 3,
                token_budget: '10K-14K',
                target_tokens: Math.min(10000 + ((duration - 9) * 600), 14000), // OLD VDP 수준 토큰 할당
                max_tokens: 14000
            };
        } else {
            return {
                mode: 'L',
                scenes_target: '5-6', 
                shots_per_scene: '2-3',
                keyframes_per_shot: '3-4',
                hook_max_sec: 3,
                token_budget: '12K-16K',
                target_tokens: Math.min(12000 + ((duration - 20) * 400), 16000), // OLD VDP 수준 토큰 할당
                max_tokens: 16000
            };
        }
    }

    /**
     * 괴물 하이브리드 시스템 프롬프트 생성 (OLD VDP 전체 로직 통합)
     * @param {object} mode - 적응형 모드 설정
     * @returns {string} 시스템 프롬프트
     */
    generateSystemPrompt(mode) {
        return `You are 'Viral DNA Profile Extractor v2.1 Monster Hybrid', a world-class expert in viral short-form video analysis. Your expertise combines the comprehensive cultural analysis power of OLD VDP with the quantitative viral Hook Genome innovation. You are precise, analytical, and objective.

Your sole purpose is to meticulously analyze an input video and its associated metadata to generate a comprehensive, structured Monster Hybrid VDP in a valid JSON format.

**CRITICAL SCHEMA STRUCTURE REQUIREMENTS**:
- TOP-LEVEL overall_analysis with hookGenome (camelCase), audience_reaction, and summary
- TOP-LEVEL scenes[] array (not nested under cinematic_analysis)
- Use hookGenome (NOT hook_genome) for consistency with validation
- Use audience_reaction (NOT audience_psychology) structure
- Maintain OLD VDP field names and organization

**CORE ANALYSIS FRAMEWORK (OLD VDP HERITAGE)**:

[NARRATIVE & CULTURAL ANALYSIS]
- Analyze underlying narrative structure, cinematic techniques, audio cues, and cultural context (memes, trends, Korean nuances)
- Preserve Korean language authenticity in dialogue/ASR, provide English translations
- Identify rhetorical devices, comedic devices, and narrative roles with precision
- Extract cultural references, inside jokes, and community-building elements

[AUDIENCE PSYCHOLOGY DEPTH]
- Deep analysis of psychological and emotional reactions (not just surface sentiment)
- Notable comments: preserve EXACT original text + language code + optional translation
- Common reactions: identify patterns beyond basic emotions
- Overall sentiment: nuanced assessment (e.g., "Very positive, hilarious", "Mixed but intrigued")

[CINEMATIC PRECISION]
- Scene segmentation: Hard cuts, location/time shifts, narrative beat changes, audio/graphics changes
- Shot analysis: Camera metadata (shot/angle/move), composition grid, detailed notes
- Keyframe analysis: Start/mid/peak/end roles with micro-change descriptions
- Audio events: Timestamp + event type + intensity + specific description

[EVIDENCE-BASED BRAND ANALYSIS]
- Product/service mentions ONLY with explicit evidence (ASR/OCR/visual/platform_ui)
- Time ranges: precise [start, end] timestamps for each mention
- Promotion status: paid/gifted/affiliate/organic/unknown (evidence-based only)
- Confidence levels: low/medium/high based on evidence strength

**HOOK GENOME INNOVATION (NEW VDP POWER)**:
- Use "hookGenome" (camelCase) in overall_analysis, not "hook_genome"
- start_sec: Hook start time (≤${mode.hook_max_sec}s)
- end_sec: Hook end time
- pattern_code: Viral pattern type (e.g., "Relatable Problem", "Expectation Subversion", "Character Contrast")
- strength_score: Addictive strength (0.0-1.0, target ≥0.70)
- trigger_modalities: Stimulation methods ["visual", "audio", "narrative", "emotional"]
- microbeats_sec: Micro-beat timing array capturing attention peaks

**ADAPTIVE MODE SETTINGS**: ${mode.mode} (video length optimization)
- Scene target: ${mode.scenes_target}
- Shots/scene: ${mode.shots_per_scene}
- Keyframes/shot: ${mode.keyframes_per_shot}
- Hook max: ${mode.hook_max_sec}s
- Token budget: ${mode.token_budget}

**POST_QA_AUTOFIX — QUALITY COMPLIANCE**:
1) PRIORITY_RULES
   - Hook scenes must include "importance":"critical"
   - Hook scenes with ECU shots need ≥3 keyframes with closure description
2) SEGMENTATION
   - New scene on hard cuts, location/time shifts, narrative changes, audio changes
   - 1-3 shots per scene, no timeline gaps/overlaps
3) VERBOSITY_FLOOR
   - Duration <3s: ≥2 keyframes, ≥1 composition note, summary ≥60 chars
   - 3s≤duration≤7s: ≥3 keyframes, ≥2 notes, summary ≥90 chars
   - Duration >7s: ≥4 keyframes, ≥2 notes, summary ≥120 chars
4) MICRO_SCENE_DETAIL
   - Duration ≤2s OR Hook/Reveal/Punchline: ≥3 keyframes, ≥2 composition notes
   - Explicit camera metadata (no "unknown")
   - Audio/SFX/tone changes described
5) ENUMS (strict compliance)
   - camera.shot ∈ {ECU, CU, MCU, MS, MLS, WS, EWS}
   - camera.angle ∈ {eye, high, low, overhead, dutch}
   - camera.move ∈ {static, pan, tilt, dolly, truck, handheld, crane, zoom}
   - composition.grid ∈ {left_third, center, right_third, symmetry}

**LANGUAGE POLICY**:
- Use ENGLISH for all metadata/analysis fields
- Preserve ORIGINAL language for: dialogue, ASR transcript, OCR text
- Every text field carries BCP-47 language code (e.g., "lang":"en", "lang":"ko")
- Provide both original + translation_en for Korean content

**UGC_COMMENTS PRESERVATION**:
- Store comments EXACTLY as written (no rewriting, normalization, censoring)
- Keep emojis/slang/punctuation/line breaks as-is
- Add language tag per comment (BCP-47)
- Optional translation_en but original remains canonical

**MENTIONS_ONLY — Evidence-Based**:
- Record ONLY with explicit evidence from ASR/OCR/visual/platform_ui
- Time ranges: [[start, end]] arrays for each mention
- Promotion status logic: paid > gifted > affiliate > organic > unknown
- Evidence: concrete quotes/visual notes (minimal, concrete)

**MANDATORY DEPTH REQUIREMENTS (OLD VDP STANDARD)**:
- Comprehensive scene analysis: ${mode.scenes_target} scenes minimum
- Shot breakdown: ${mode.shots_per_scene} shots per scene minimum
- Keyframe detail: ${mode.keyframes_per_shot} keyframes per shot minimum
- Notable comments: 2-3 exact Korean comments with translations
- ASR transcript: Complete dialogue preservation (Korean + English)
- OCR text: All visible text with language codes
- Cultural analysis: Korean workplace/internet culture references
- Audience psychology: Deep emotional reaction analysis
- Brand analysis: Time-stamped product/service mentions with evidence

**OUTPUT REQUIREMENTS**:
- JSON only, no markdown/comments/explanations
- STRICT schema compliance with Monster Hybrid v2.1
- Complete ${mode.target_tokens} token allocation (max ${mode.max_tokens})
- OLD VDP analytical depth + Hook Genome innovation
- Every field must be populated with detailed analysis
- No "unknown" or empty placeholder values
- Preserve Korean language authenticity throughout

**MANDATORY STRUCTURE (for validation)**:
{
  "content_id": "...",
  "overall_analysis": {
    "summary": "...",
    "hookGenome": { "start_sec": 0, "end_sec": 2.9, "pattern_code": "...", "strength_score": 0.8, "trigger_modalities": [...], "microbeats_sec": [...] },
    "audience_reaction": {
      "analysis": "...", 
      "notable_comments": [{"text": "...", "lang": "ko", "translation_en": "..."}],
      "overall_sentiment": "..."
    },
    "asr_transcript": "...",
    "emotional_arc": "...",
    "confidence": {"overall": 0.95}
  },
  "scenes": [
    {
      "scene_id": 1,
      "time_start": 0,
      "time_end": 8,
      "summary": "...",
      "importance": "critical",
      "shots": [...]
    }
  ],
  "product_mentions": [...],
  "service_mentions": [...],
  "metadata": {...}
}

TARGET: Generate ${mode.target_tokens} tokens of comprehensive analysis that matches or exceeds OLD VDP depth while adding Hook Genome quantitative viral analysis. This is the minimum acceptable depth - do not generate shorter analysis.`;
    }

    /**
     * 사용자 컨텍스트 프롬프트 생성
     * @param {object} metadata - 영상 메타데이터
     * @returns {string} 사용자 프롬프트
     */
    generateUserPrompt(metadata) {
        return `**ANALYSIS TARGET**:
- GCS Video: fileData.fileUri format provided
- Platform: ${metadata.platform || 'YouTube Shorts'}
- Language: Korean video content
- Content ID: ${metadata.content_id}
- Source URL: ${metadata.source_url || ''}
- View Count: ${metadata.view_count?.toLocaleString() || 0}
- Like Count: ${metadata.like_count?.toLocaleString() || 0}
- Comment Count: ${metadata.comment_count?.toLocaleString() || 0}
- Share Count: ${metadata.share_count?.toLocaleString() || 0}

**CRITICAL ANALYSIS REQUIREMENTS**:
1. **Korean Cultural Context**: Analyze workplace culture, internet slang, memes, and generational references
2. **Audience Psychology**: Deep emotional reaction analysis, not just sentiment
3. **Comment Preservation**: Extract and preserve EXACT Korean comments with translations
4. **ASR/OCR Evidence**: Complete Korean dialogue + all visible text preservation
5. **Hook Genome Innovation**: Quantitative viral pattern analysis (0-3s)
6. **OLD VDP Depth**: Match the 1002-line analysis depth of the original system

**TOP COMMENTS FOR ANALYSIS**:
${metadata.top_comments || 'No comment data available'}

**DEPTH TARGET**: Generate comprehensive Monster Hybrid VDP with OLD VDP's analytical thoroughness PLUS Hook Genome quantitative innovation. This must be a complete, detailed analysis that preserves all Korean cultural nuances while adding viral DNA insights.

Analyze the video and generate the complete Monster Hybrid VDP JSON with maximum analytical depth.`;
    }

    /**
     * VDP 생성 실행
     * @param {string} gcsUri - GCS 영상 URI
     * @param {object} metadata - 영상 메타데이터  
     * @param {number} estimatedDuration - 예상 영상 길이
     * @returns {Promise<object>} 생성된 VDP
     */
    async generateVDP(gcsUri, metadata, estimatedDuration = 15) {
        try {
            // 적응형 모드 결정
            const mode = this.getAdaptiveMode(estimatedDuration);
            
            console.log(`🎯 Monster Hybrid VDP 생성 시작 (모드: ${mode.mode}, 길이: ${estimatedDuration}s)`);

            // 시스템 및 사용자 프롬프트 생성
            const systemInstruction = this.generateSystemPrompt(mode);
            const userPrompt = this.generateUserPrompt(metadata);

            // Vertex AI 요청 구성
            const request = {
                contents: [{
                    role: 'user',
                    parts: [
                        {
                            fileData: {
                                fileUri: gcsUri,
                                mimeType: 'video/mp4'
                            }
                        },
                        {
                            text: userPrompt
                        }
                    ]
                }],
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                }
            };

            // VDP 생성 요청
            console.log('🔄 Vertex AI 호출 중...');
            const result = await this.model.generateContent(request);
            const response = result.response;
            
            if (!response || !response.candidates || response.candidates.length === 0) {
                throw new Error('Vertex AI 응답 없음');
            }

            const candidate = response.candidates[0];
            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                throw new Error('응답 콘텐츠 없음');
            }

            const responseText = candidate.content.parts[0].text;
            console.log(`📊 응답 길이: ${responseText.length} 문자`);

            // JSON 파싱
            let vdpJson;
            try {
                vdpJson = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON 파싱 실패:', parseError.message);
                console.log('응답 텍스트 샘플:', responseText.substring(0, 500));
                throw new Error('JSON 파싱 실패: ' + parseError.message);
            }

            // 메타데이터 강제 주입 (정확성 보장)
            this.injectMetadata(vdpJson, metadata);

            // 품질 검증
            const validation = this.validateVDP(vdpJson, mode);
            if (!validation.isValid) {
                console.warn('🚨 품질 검증 실패:', validation.errors);
            }

            console.log('✅ Monster Hybrid VDP 생성 완료');
            return {
                vdp: vdpJson,
                mode: mode,
                validation: validation,
                tokens_estimated: Math.ceil(responseText.length / 4)
            };

        } catch (error) {
            console.error('❌ Monster Hybrid VDP 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 메타데이터 강제 주입
     */
    injectMetadata(vdpJson, metadata) {
        if (!vdpJson.metadata) vdpJson.metadata = {};
        
        vdpJson.content_id = metadata.content_id;
        vdpJson.metadata.platform = metadata.platform || 'YouTube Shorts';
        vdpJson.metadata.source_url = metadata.source_url || '';
        vdpJson.metadata.view_count = metadata.view_count || 0;
        vdpJson.metadata.like_count = metadata.like_count || 0;
        vdpJson.metadata.comment_count = metadata.comment_count || 0;
        vdpJson.metadata.share_count = metadata.share_count || 0;
        vdpJson.metadata.upload_date = metadata.upload_date || new Date().toISOString();
        vdpJson.metadata.video_origin = metadata.video_origin || 'Unknown';
        
        if (!vdpJson.metadata.cta_types) vdpJson.metadata.cta_types = [];
        if (!vdpJson.metadata.hashtags) vdpJson.metadata.hashtags = [];
        if (!vdpJson.metadata.original_sound) {
            vdpJson.metadata.original_sound = { id: null, title: null };
        }
        
        if (!vdpJson.product_mentions) vdpJson.product_mentions = [];
        if (!vdpJson.service_mentions) vdpJson.service_mentions = [];
    }

    /**
     * VDP 품질 검증
     */
    validateVDP(vdp, mode) {
        const errors = [];
        
        try {
            // Hook Genome 검증 (둘 다 체크)
            const hook = vdp.overall_analysis?.hookGenome || vdp.overall_analysis?.hook_genome;
            if (hook) {
                if (hook.start_sec > mode.hook_max_sec) {
                    errors.push(`Hook start_sec (${hook.start_sec}) > ${mode.hook_max_sec}`);
                }
                if (hook.strength_score < 0.70) {
                    errors.push(`Hook strength_score (${hook.strength_score}) < 0.70`);
                }
            } else {
                errors.push('Hook Genome 누락');
            }

            // 텍스트 길이 검증
            if (vdp.overall_analysis?.summary?.length > 700) {
                errors.push(`Summary 길이 초과: ${vdp.overall_analysis.summary.length}/700`);
            }
            if (vdp.overall_analysis?.emotional_arc?.length > 350) {
                errors.push(`Emotional arc 길이 초과: ${vdp.overall_analysis.emotional_arc.length}/350`);
            }

            // 배열 크기 검증
            if (vdp.overall_analysis?.audience_reaction?.notable_comments?.length > 3) {
                errors.push('Notable comments 개수 초과');
            }
            if (vdp.overall_analysis?.ocr_text?.length > 5) {
                errors.push('OCR text 개수 초과');
            }
            if (vdp.product_mentions?.length > 5) {
                errors.push('Product mentions 개수 초과');
            }
            if (vdp.service_mentions?.length > 5) {
                errors.push('Service mentions 개수 초과');
            }

            return {
                isValid: errors.length === 0,
                errors: errors,
                score: errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 10))
            };

        } catch (error) {
            return {
                isValid: false,
                errors: ['검증 중 오류: ' + error.message],
                score: 0
            };
        }
    }
}

export { MonsterHybridVDPGenerator };