/**
 * TRUE Hybrid VDP v5.0 UNIVERSAL - 범용 버전 (VDP 서버 전용)
 * 모든 영상에 적용 가능한 범용 VDP 생성기
 * 1. 정확한 장면 분할 (OLD VDP 표준)
 * 2. 완전한 OCR 텍스트 캡처
 * 3. Hook Genome 데이터 통합
 * 
 * 📋 코드 컨벤션:
 * - generateVDP(gcsUri, metadata, ...) 시그니처 유지
 * - metadata는 외부 수집 결과를 주입받음 (YouTube API 호출하지 않음)
 * - 서버 환경변수/Vertex 설정 변경 없음 (us-central1 고정)
 */

import { VertexAI } from '@google-cloud/vertexai';

// 환경 변수 설정
const PROJECT_ID = process.env.PROJECT_ID || 'tough-variety-466003-c5';
const REGION = process.env.REGION || 'us-central1';
const MODEL_NAME = process.env.MODEL_NAME || 'gemini-2.5-pro';

class TrueHybridUniversalVDPGenerator {
    constructor() {
        this.vertexAI = new VertexAI({
            project: PROJECT_ID,
            location: REGION
        });
        this.model = this.vertexAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                maxOutputTokens: 16000,
                temperature: 0.1
                // responseMimeType 제거: 텍스트 응답 후 JSON 파싱이 더 안정적
            }
        });
    }

    /**
     * 영상 길이별 적응형 모드 결정
     */
    getAdaptiveMode(duration) {
        if (duration <= 9) {
            return {
                mode: 'S',
                scenes_target: '2-3',
                shots_per_scene: '2-3', 
                keyframes_per_shot: '2-4',
                hook_max_sec: Math.min(duration * 0.4, 3),
                token_budget: '12K-16K',
                target_tokens: Math.min(12000 + (duration * 800), 16000),
                max_tokens: 16000,
                analysis_depth: 'enhanced'
            };
        } else if (duration <= 20) {
            return {
                mode: 'M',
                scenes_target: '3-4',
                shots_per_scene: '2-4',
                keyframes_per_shot: '3-5',
                hook_max_sec: 3,
                token_budget: '14K-16K',
                target_tokens: Math.min(14000 + (duration * 600), 16000),
                max_tokens: 16000,
                analysis_depth: 'comprehensive'
            };
        } else {
            return {
                mode: 'L',
                scenes_target: '4-6',
                shots_per_scene: '3-5',
                keyframes_per_shot: '3-6',
                hook_max_sec: 3,
                token_budget: '16K',
                target_tokens: 16000,
                max_tokens: 16000,
                analysis_depth: 'detailed'
            };
        }
    }

    /**
     * 시스템 프롬프트 생성
     */
    generateSystemPrompt(mode) {
        return `You are a TRUE Hybrid VDP v5.0 UNIVERSAL analyzer combining OLD VDP structure with Hook Genome innovation.

TARGET MODE: ${mode.mode} (${mode.scenes_target} scenes, ${mode.shots_per_scene} shots/scene, ${mode.keyframes_per_shot} keyframes/shot)
TOKEN BUDGET: ${mode.token_budget} (Target: ${mode.target_tokens})
HOOK CONSTRAINT: ≤${mode.hook_max_sec}s

GENERATE complete VDP JSON with this EXACT structure:

{
  "content_id": "string",
  "default_lang": "en",
  "metadata": {
    "platform": "string",
    "source_url": "string", 
    "view_count": number,
    "like_count": number,
    "comment_count": number,
    "share_count": number,
    "upload_date": "ISO_date",
    "video_origin": "Real-Footage|AI-Generated",
    "hashtags": ["string"],
    "cta_types": ["string"],
    "original_sound": {
      "id": "string|null",
      "title": "string|null"
    }
  },
  "overall_analysis": {
    "summary": "string (comprehensive content summary)",
    "emotional_arc": "string (emotion progression)",
    "audience_reaction": {
      "analysis": "string (reaction analysis using provided comments)",
      "common_reactions": ["string"],
      "notable_comments": [],
      "overall_sentiment": "string"
    },
    "safety_flags": [],
    "confidence": {
      "overall": number,
      "scene_classification": number,
      "device_analysis": number
    },
    "hookGenome": {
      "start_sec": number,
      "pattern_code": "string",
      "strength_score": number,
      "trigger_modalities": ["visual", "auditory", "textual"],
      "microbeats_sec": [number],
      "connected_scene_id": "string",
      "hook_integration_analysis": "string (≥120 chars detailed analysis)"
    },
    "asr_transcript": "string",
    "asr_lang": "string",
    "asr_translation_en": "string",
    "ocr_text": [
      {
        "text": "string",
        "lang": "string", 
        "translation_en": "string"
      }
    ]
  },
  "scenes": [
    {
      "scene_id": "S01_Opening|S02_Development|S03_Climax|S04_Resolution",
      "time_start": number,
      "time_end": number,
      "duration_sec": number,
      "importance": "critical|high|medium",
      "hook_connection": {
        "is_hook_scene": "true|false",
        "hook_elements": ["string"],
        "viral_mechanics": "string"
      },
      "narrative_unit": {
        "narrative_role": "string",
        "summary": "string",
        "dialogue": "string",
        "dialogue_lang": "string",
        "dialogue_translation_en": "string",
        "rhetoric": ["string"],
        "rhetoric_analysis": "string (≥120 chars)",
        "comedic_device": ["string"],
        "comedic_analysis": "string (≥120 chars)"
      },
      "setting": {
        "location": "string",
        "visual_style": {
          "cinematic_properties": "string (≥250 chars detailed description)",
          "lighting_analysis": "string",
          "color_psychology": "string",
          "mood_palette": ["string"],
          "edit_grammar": {
            "cut_speed": "string",
            "camera_style": "string",
            "subtitle_style": "string"
          }
        },
        "audio_style": {
          "music": "string",
          "ambient_sound": "string",
          "tone": "string",
          "audio_emotional_impact": "string",
          "audio_events": [
            {
              "timestamp": number,
              "event": "string",
              "description": "string",
              "intensity": "High|Medium|Low"
            }
          ]
        }
      },
      "shots": [
        {
          "shot_id": "string",
          "start": number,
          "end": number,
          "camera": {
            "shot": "ECU|CU|MCU|MS|MLS|WS|EWS",
            "angle": "eye|high|low|overhead|dutch",
            "move": "static|pan|tilt|dolly|truck|handheld|crane|zoom"
          },
          "composition": {
            "grid": "string",
            "notes": ["string", "string"], 
            "visual_impact": "string"
          },
          "keyframes": [
            {
              "role": "start|mid|peak|end",
              "t_rel_shot": number,
              "desc": "string"
            }
          ],
          "confidence": "high|medium|low"
        }
      ]
    }
  ],
  "product_mentions": [
    {
      "name": "string",
      "type": "string",
      "category": "string",
      "time_start": number,
      "time_end": number,
      "confidence": number
    }
  ],
  "service_mentions": []
}

CRITICAL REQUIREMENTS:
1. UNIVERSAL STRUCTURE: Use generic scene IDs (S01_Opening, S02_Development, etc.)
2. COMPLETE OCR: Extract ALL visible text with proper lang/translation
3. HOOK GENOME: Connect to first scene with detailed integration analysis
4. ANALYSIS DEPTH: cinematic_properties ≥250 chars, analyses ≥120 chars
5. VALID JSON: Must be parseable JSON without syntax errors`;
    }

    /**
     * 사용자 컨텍스트 프롬프트 - 범용 버전 (외부 메타데이터 활용)
     */
    generateUserPrompt(metadata) {
        // 댓글 포맷팅
        const commentsText = this.formatCommentsForPrompt(metadata.top_comments);
        
        // 해시태그 텍스트
        const hashtagsText = metadata.hashtags && metadata.hashtags.length > 0 
            ? metadata.hashtags.join(' ') 
            : 'No hashtags';

        return `Analyze this video content and generate TRUE Hybrid VDP v5.0 UNIVERSAL with complete OLD VDP structure + Hook Genome integration.

**VIDEO**: ${metadata.content_id} (${metadata.platform})
📊 Stats: ${metadata.view_count?.toLocaleString() || 0} views, ${metadata.like_count?.toLocaleString() || 0} likes, ${metadata.comment_count?.toLocaleString() || 0} comments
🏷️ Tags: ${hashtagsText}
🎵 Sound: ${metadata.original_sound?.title || 'Unknown'}

**UNIVERSAL REQUIREMENTS**:
1. **PRECISE SCENE SEGMENTATION**: Create scenes based on hard cuts, location changes, narrative beats
2. **COMPLETE OCR CAPTURE**: Extract ALL visible text with proper lang codes and translations
3. **HOOK GENOME INTEGRATION**: Connect hookGenome to first scene with detailed integration analysis ≥120 chars
4. **ANALYSIS DEPTH**: cinematic_properties ≥250 chars, rhetoric_analysis + comedic_analysis ≥120 chars each
5. **LANGUAGE HANDLING**: Preserve original language + provide English translations for all text
6. **UNIVERSAL STRUCTURE**: Use generic scene IDs like S01_Opening, S02_Development, etc.
7. **REAL DATA INTEGRATION**: Use provided view counts, comments, and hashtags in audience_reaction analysis

**TOP COMMENTS** (for audience_reaction analysis):
${commentsText}

Generate complete JSON following the exact structure provided in system prompt.`;
    }

    /**
     * 댓글을 프롬프트용으로 포맷팅
     */
    formatCommentsForPrompt(topComments) {
        if (!topComments || topComments.length === 0) {
            return 'No comments available';
        }

        if (typeof topComments === 'string') {
            return topComments;
        }

        if (Array.isArray(topComments)) {
            return topComments.map((comment, index) => {
                if (typeof comment === 'string') {
                    return `${index + 1}. ${comment}`;
                }
                return `${index + 1}. ${comment.author}: ${comment.text} (${comment.engagement?.likes || 0} likes)`;
            }).join('\n');
        }

        return 'No comments available';
    }

    /**
     * TRUE Hybrid UNIVERSAL VDP 생성 (외부 메타데이터 주입 방식)
     */
    async generateVDP(gcsUri, metadata, estimatedDuration = 15) {
        try {
            const mode = this.getAdaptiveMode(estimatedDuration);
            
            console.log(`🔥 TRUE Hybrid VDP v5.0 UNIVERSAL 생성 시작 (범용 VDP 서버)`);
            console.log(`📝 메타데이터 소스: ${metadata.youtube_api_data?.api_source || 'external'}`);

            const systemInstruction = this.generateSystemPrompt(mode);
            const userPrompt = this.generateUserPrompt(metadata);

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
                    role: 'system',
                    parts: [{ text: systemInstruction }]
                }
            };

            console.log(`🤖 Vertex AI 호출 시작 (${REGION}/${MODEL_NAME})`);
            const response = await this.model.generateContent(request);
            
            const responseText = response.response.candidates[0].content.parts[0].text;
            console.log(`📄 응답 길이: ${responseText.length} chars`);

            // JSON 추출 및 파싱
            const vdp = this.parseVDPFromResponse(responseText);
            
            // 품질 검증
            const validation = this.validateVDP(vdp, mode);
            
            console.log(`✅ TRUE Hybrid VDP v5.0 UNIVERSAL 생성 완료`);
            console.log(`📊 품질 점수: ${validation.score}/100`);

            return {
                vdp,
                validation,
                mode,
                tokens_estimated: Math.round(responseText.length / 4),
                generation_metadata: {
                    model: MODEL_NAME,
                    region: REGION,
                    mode: mode.mode,
                    metadata_source: metadata.youtube_api_data?.api_source || 'external'
                }
            };

        } catch (error) {
            console.error('❌ TRUE Hybrid VDP 생성 실패:', error.message);
            throw error;
        }
    }

    /**
     * 응답에서 JSON 추출
     */
    parseVDPFromResponse(responseText) {
        try {
            // JSON 블록 추출
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                             responseText.match(/\{[\s\S]*\}/);
            
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const jsonText = jsonMatch[1] || jsonMatch[0];
            return JSON.parse(jsonText);
            
        } catch (error) {
            console.error('JSON 파싱 실패:', error.message);
            console.log('응답 미리보기:', responseText.substring(0, 500));
            throw new Error(`VDP JSON 파싱 실패: ${error.message}`);
        }
    }

    /**
     * VDP 품질 검증
     */
    validateVDP(vdp, mode) {
        let score = 0;
        const issues = [];
        const enhancements = [];

        // 기본 구조 (20점)
        if (vdp.content_id && vdp.metadata && vdp.overall_analysis && vdp.scenes) {
            score += 20;
            enhancements.push('Complete VDP structure');
        } else {
            issues.push('Incomplete VDP structure');
        }

        // 장면 분할 (25점)
        const sceneCount = vdp.scenes?.length || 0;
        const targetScenes = parseInt(mode.scenes_target.split('-')[1]);
        if (sceneCount >= targetScenes - 1) {
            score += 25;
            enhancements.push(`Good scene segmentation: ${sceneCount} scenes`);
        } else {
            score += Math.round((sceneCount / targetScenes) * 25);
            issues.push(`Scene count below target: ${sceneCount}/${targetScenes}`);
        }

        // OCR 완전성 (20점)
        const ocrCount = vdp.overall_analysis?.ocr_text?.length || 0;
        if (ocrCount >= 5) {
            score += 20;
            enhancements.push(`Excellent OCR extraction: ${ocrCount} texts`);
        } else if (ocrCount >= 2) {
            score += 15;
            enhancements.push(`Good OCR extraction: ${ocrCount} texts`);
        } else {
            issues.push(`Low OCR extraction: ${ocrCount} texts`);
        }

        // Hook Genome 통합 (20점)
        const hook = vdp.overall_analysis?.hookGenome;
        if (hook?.connected_scene_id && hook?.hook_integration_analysis?.length >= 120) {
            score += 20;
            enhancements.push('Complete Hook Genome integration');
        } else if (hook?.connected_scene_id) {
            score += 10;
            issues.push('Hook integration analysis too short');
        } else {
            issues.push('Missing Hook Genome integration');
        }

        // 분석 깊이 (15점)
        let depthScore = 0;
        if (vdp.scenes) {
            vdp.scenes.forEach(scene => {
                if (scene.setting?.visual_style?.cinematic_properties?.length >= 250) {
                    depthScore += 3;
                }
                if (scene.narrative_unit?.rhetoric_analysis?.length >= 120) {
                    depthScore += 2;
                }
            });
        }
        score += Math.min(depthScore, 15);
        if (depthScore >= 15) {
            enhancements.push('Excellent analysis depth');
        }

        return {
            score: Math.min(score, 100),
            scene_count: sceneCount,
            ocr_count: ocrCount,
            data_integration: hook?.connected_scene_id ? 'complete' : 'partial',
            quality_level: score >= 90 ? 'excellent' : score >= 75 ? 'good' : 'basic',
            issues,
            enhancements
        };
    }
}

export { TrueHybridUniversalVDPGenerator };