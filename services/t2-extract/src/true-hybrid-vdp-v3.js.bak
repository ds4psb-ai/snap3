/**
 * TRUE Hybrid VDP v3.0 - OLD VDP 완전 복원 + Hook Genome 혁신
 * 사용자 피드백 기반 완전 재설계: OLD VDP의 모든 강점 보존 + NEW VDP 혁신
 */

import { VertexAI } from '@google-cloud/vertexai';

// 환경 변수 설정
const PROJECT_ID = process.env.PROJECT_ID || 'tough-variety-466003-c5';
const REGION = process.env.REGION || 'us-central1';
const MODEL_NAME = process.env.MODEL_NAME || 'gemini-2.5-pro';

class TrueHybridVDPGenerator {
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
                max_tokens: 16000
            };
        } else if (duration <= 20) {
            return {
                mode: 'M', 
                scenes_target: '3-5',
                shots_per_scene: '2-4',
                keyframes_per_shot: '2-4',
                hook_max_sec: 3,
                token_budget: '14K-16K',
                target_tokens: Math.min(14000 + ((duration - 9) * 600), 16000),
                max_tokens: 16000
            };
        } else {
            return {
                mode: 'L',
                scenes_target: '4-6', 
                shots_per_scene: '2-4',
                keyframes_per_shot: '2-4',
                hook_max_sec: 3,
                token_budget: '16K',
                target_tokens: 16000,
                max_tokens: 16000
            };
        }
    }

    /**
     * TRUE Hybrid 시스템 프롬프트 (OLD VDP 완전 복원)
     */
    generateSystemPrompt(mode) {
        return `You are 'TRUE Hybrid VDP v3.0', the complete fusion of OLD VDP excellence with Hook Genome innovation.

**MANDATORY OLD VDP STRUCTURE - EXACTLY AS SPECIFIED**

You MUST generate this exact JSON schema structure:

{
  "content_id": "string",
  "default_lang": "en",
  "metadata": { platform, source_url, view_count, like_count, comment_count, share_count, upload_date, video_origin, hashtags[], cta_types: [], original_sound: {id, title} },
  "overall_analysis": {
    "summary": "comprehensive English summary",
    "emotional_arc": "start→climax→end emotional flow",
    "audience_reaction": {
      "analysis": "psychological analysis of viewer reactions",
      "common_reactions": ["reaction1", "reaction2", "reaction3"],
      "notable_comments": [{"text": "original Korean", "lang": "ko", "translation_en": "English"}],
      "overall_sentiment": "sentiment description"
    },
    "safety_flags": [],
    "confidence": {
      "overall": 0.95,
      "scene_classification": 0.93,
      "device_analysis": 0.97
    },
    "hookGenome": {
      "start_sec": 0,
      "pattern_code": "viral pattern code",
      "strength_score": 0.85,
      "trigger_modalities": ["visual", "auditory"],
      "microbeats_sec": [1.0, 2.5]
    },
    "asr_transcript": "Korean dialogue",
    "asr_lang": "ko", 
    "asr_translation_en": "English translation",
    "ocr_text": [{"text": "Korean", "lang": "ko", "translation_en": "English"}]
  },
  "scenes": [
    {
      "scene_id": "S01_SceneName",
      "time_start": 0.0,
      "time_end": 8.0,
      "duration_sec": 8.0,
      "importance": "critical",
      "narrative_unit": {
        "narrative_role": "Hook Setup",
        "summary": "detailed scene summary ≥120 chars",
        "dialogue": "Korean dialogue",
        "dialogue_lang": "ko",
        "dialogue_translation_en": "English translation",
        "rhetoric": ["storytelling", "curiosity_gap", "pathos"],
        "comedic_device": ["character_contrast", "expectation_subversion"]
      },
      "setting": {
        "location": "location name",
        "visual_style": {
          "cinematic_properties": "detailed camera/composition analysis ≥50 chars",
          "lighting": "lighting description",
          "mood_palette": ["mood1", "mood2"],
          "edit_grammar": {
            "cut_speed": "fast",
            "camera_style": "static_shot",
            "subtitle_style": "broadcast_entertainment"
          }
        },
        "audio_style": {
          "music": "music description",
          "ambient_sound": "ambient description", 
          "tone": "tone description",
          "audio_events": [
            {
              "timestamp": 1.5,
              "event": "critical_sfx",
              "description": "sound description",
              "intensity": "High"
            }
          ]
        }
      },
      "shots": [
        {
          "shot_id": "S01_Shot01",
          "start": 0.0,
          "end": 4.0,
          "camera": {
            "shot": "MS",
            "angle": "eye", 
            "move": "static"
          },
          "composition": {
            "grid": "center",
            "notes": ["note1 ≥10 chars", "note2 ≥10 chars"]
          },
          "keyframes": [
            {
              "role": "start",
              "t_rel_shot": 0.5,
              "desc": "keyframe description ≥20 chars"
            },
            {
              "role": "peak", 
              "t_rel_shot": 2.0,
              "desc": "keyframe description ≥20 chars"
            }
          ],
          "confidence": "high"
        }
      ]
    }
  ],
  "product_mentions": [],
  "service_mentions": []
}

**CRITICAL REQUIREMENTS:**
1. Hook Genome in overall_analysis.hookGenome (NOT separate object)
2. Scenes with complete narrative_unit (rhetoric[], comedic_device[])
3. Visual_style with cinematic_properties (≥50 chars)
4. Audio_style with structured audio_events[]
5. Shots with camera enums: shot∈{ECU,CU,MCU,MS,MLS,WS,EWS}, angle∈{eye,high,low,overhead,dutch}, move∈{static,pan,tilt,dolly,truck,handheld,crane,zoom}
6. Composition with notes[] (≥2 notes, ≥10 chars each)
7. Keyframes with role∈{start,mid,peak,end}, desc≥20 chars
8. Korean dialogue preserved with translations

Target ${mode.target_tokens} tokens. Return ONLY the JSON object.`;
    }

    /**
     * 사용자 컨텍스트 프롬프트
     */
    generateUserPrompt(metadata) {
        return `Analyze this Korean workplace comedy video and generate a TRUE Hybrid VDP v3.0 with COMPLETE OLD VDP structure.

**VIDEO METADATA**:
- Content ID: ${metadata.content_id}
- Platform: ${metadata.platform || 'YouTube Shorts'}
- Views: ${metadata.view_count?.toLocaleString() || 0}, Likes: ${metadata.like_count?.toLocaleString() || 0}

**TOP COMMENTS (preserve Korean originals)**: 
${metadata.top_comments || 'No comments available'}

**MANDATORY STRUCTURE COMPLIANCE**:
1. **scenes[]**: MUST include narrative_unit.rhetoric[], narrative_unit.comedic_device[], setting.visual_style.cinematic_properties, setting.audio_style.audio_events[]
2. **shots[]**: MUST include camera.shot/angle/move enums, composition.notes[] (≥2), keyframes[] (≥2)
3. **overall_analysis.hookGenome**: start_sec, pattern_code, strength_score≥0.70, trigger_modalities[]
4. **Korean preservation**: dialogue, asr_transcript in Korean + English translations
5. **Professional depth**: cinematic_properties≥50 chars, composition notes≥10 chars each, keyframe desc≥20 chars

**CULTURAL CONTEXT**: 직장 문화, 야근 스트레스, 햄스터 캐릭터의 귀여움과 거친 말투 대비

Generate the complete JSON structure following the exact schema provided in the system prompt.`;
    }

    /**
     * TRUE Hybrid VDP 생성
     */
    async generateVDP(gcsUri, metadata, estimatedDuration = 15) {
        try {
            const mode = this.getAdaptiveMode(estimatedDuration);
            
            console.log(`🔥 TRUE Hybrid VDP v3.0 생성 시작 (모드: ${mode.mode}, 길이: ${estimatedDuration}s)`);

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
                    parts: [{ text: systemInstruction }]
                }
            };

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

            // JSON 파싱 (견고한 방식)
            let vdpJson;
            try {
                // 응답 텍스트에서 JSON 부분만 추출
                let jsonText = responseText.trim();
                
                // JSON 시작 부분 찾기
                const jsonStart = jsonText.indexOf('{');
                if (jsonStart > 0) {
                    jsonText = jsonText.substring(jsonStart);
                }
                
                // 불완전한 JSON 감지 및 수정 시도
                if (!jsonText.endsWith('}')) {
                    // 마지막 완전한 객체 찾기
                    let braceCount = 0;
                    let lastValidPos = -1;
                    
                    for (let i = 0; i < jsonText.length; i++) {
                        if (jsonText[i] === '{') braceCount++;
                        if (jsonText[i] === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                lastValidPos = i;
                            }
                        }
                    }
                    
                    if (lastValidPos > 0) {
                        jsonText = jsonText.substring(0, lastValidPos + 1);
                    }
                }
                
                vdpJson = JSON.parse(jsonText);
            } catch (parseError) {
                console.error('JSON 파싱 실패:', parseError.message);
                console.log('응답 텍스트 샘플:', responseText.substring(0, 1000));
                
                // 단순화된 JSON으로 재시도
                try {
                    const simpleJson = `{
                        "content_id": "${metadata.content_id}",
                        "default_lang": "en",
                        "metadata": {},
                        "overall_analysis": {
                            "summary": "TRUE Hybrid VDP v3.0 파싱 오류로 인한 기본 구조",
                            "hookGenome": {
                                "start_sec": 0,
                                "end_sec": 3,
                                "pattern_code": "Parsing Error",
                                "strength_score": 0.5,
                                "trigger_modalities": ["visual"],
                                "microbeats_sec": [1.0]
                            }
                        },
                        "scenes": [],
                        "product_mentions": [],
                        "service_mentions": []
                    }`;
                    vdpJson = JSON.parse(simpleJson);
                    console.log('⚠️ 기본 구조로 폴백');
                } catch (fallbackError) {
                    throw new Error('JSON 파싱 완전 실패: ' + parseError.message);
                }
            }

            // 메타데이터 강제 주입
            this.injectMetadata(vdpJson, metadata);

            // 품질 검증
            const validation = this.validateTrueHybrid(vdpJson, mode);

            console.log('✅ TRUE Hybrid VDP v3.0 생성 완료');
            return {
                vdp: vdpJson,
                mode: mode,
                validation: validation,
                tokens_estimated: Math.ceil(responseText.length / 4)
            };

        } catch (error) {
            console.error('❌ TRUE Hybrid VDP v3.0 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 메타데이터 강제 주입
     */
    injectMetadata(vdpJson, metadata) {
        if (!vdpJson.metadata) vdpJson.metadata = {};
        
        vdpJson.content_id = metadata.content_id;
        vdpJson.default_lang = "en";
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
     * TRUE Hybrid 품질 검증
     */
    validateTrueHybrid(vdp, mode) {
        const errors = [];
        let score = 100;
        
        try {
            // 1. OLD VDP 구조 검증
            if (!vdp.scenes || vdp.scenes.length === 0) {
                errors.push('Scenes 배열 누락');
                score -= 30;
            } else {
                // 각 scene의 OLD VDP 구조 검증
                vdp.scenes.forEach((scene, index) => {
                    // Narrative unit 완전성 검증
                    if (!scene.narrative_unit) {
                        errors.push(`Scene ${index}: narrative_unit 누락`);
                        score -= 20;
                    } else {
                        if (!scene.narrative_unit.rhetoric || !Array.isArray(scene.narrative_unit.rhetoric) || scene.narrative_unit.rhetoric.length === 0) {
                            errors.push(`Scene ${index}: narrative_unit.rhetoric[] 누락`);
                            score -= 10;
                        }
                        if (!scene.narrative_unit.comedic_device || !Array.isArray(scene.narrative_unit.comedic_device) || scene.narrative_unit.comedic_device.length === 0) {
                            errors.push(`Scene ${index}: narrative_unit.comedic_device[] 누락`);
                            score -= 10;
                        }
                        if (!scene.narrative_unit.summary || scene.narrative_unit.summary.length < 120) {
                            errors.push(`Scene ${index}: narrative_unit.summary 부족 (<120 chars)`);
                            score -= 5;
                        }
                    }
                    
                    // Setting 구조 완전성 검증
                    if (!scene.setting) {
                        errors.push(`Scene ${index}: setting 누락`);
                        score -= 15;
                    } else {
                        if (!scene.setting.visual_style || !scene.setting.visual_style.cinematic_properties || scene.setting.visual_style.cinematic_properties.length < 50) {
                            errors.push(`Scene ${index}: visual_style.cinematic_properties 부족 (<50 chars)`);
                            score -= 10;
                        }
                        if (!scene.setting.audio_style || !scene.setting.audio_style.audio_events || !Array.isArray(scene.setting.audio_style.audio_events)) {
                            errors.push(`Scene ${index}: audio_style.audio_events[] 누락`);
                            score -= 10;
                        }
                    }
                    
                    // Shots 구조 검증
                    if (!scene.shots || scene.shots.length === 0) {
                        errors.push(`Scene ${index}: shots 배열 누락`);
                        score -= 15;
                    } else {
                        // 각 shot의 OLD VDP 구조 검증
                        scene.shots.forEach((shot, shotIndex) => {
                            if (!shot.keyframes || shot.keyframes.length < 2) {
                                errors.push(`Scene ${index} Shot ${shotIndex}: keyframes 부족 (<2)`);
                                score -= 5;
                            }
                            if (!shot.camera || !shot.camera.shot || !shot.camera.angle || !shot.camera.move) {
                                errors.push(`Scene ${index} Shot ${shotIndex}: camera 메타데이터 불완전`);
                                score -= 5;
                            }
                            if (!shot.composition || !shot.composition.notes || !Array.isArray(shot.composition.notes) || shot.composition.notes.length < 2) {
                                errors.push(`Scene ${index} Shot ${shotIndex}: composition.notes 부족 (<2)`);
                                score -= 5;
                            }
                        });
                    }
                });
            }

            // 2. Hook Genome 검증
            const hook = vdp.overall_analysis?.hookGenome;
            if (!hook) {
                errors.push('Hook Genome 누락');
                score -= 20;
            } else {
                if (hook.start_sec > mode.hook_max_sec) {
                    errors.push(`Hook start_sec (${hook.start_sec}) > ${mode.hook_max_sec}`);
                    score -= 15;
                }
                if (hook.strength_score < 0.70) {
                    errors.push(`Hook strength_score (${hook.strength_score}) < 0.70`);
                    score -= 15;
                }
            }

            // 3. OLD VDP 필수 필드 검증
            if (!vdp.overall_analysis?.audience_reaction) {
                errors.push('audience_reaction 누락');
                score -= 15;
            }
            if (!vdp.overall_analysis?.confidence) {
                errors.push('confidence 점수 누락');
                score -= 10;
            }

            return {
                isValid: errors.length === 0,
                errors: errors,
                score: Math.max(0, score),
                depth_assessment: this.assessDepth(vdp)
            };

        } catch (error) {
            return {
                isValid: false,
                errors: ['검증 중 오류: ' + error.message],
                score: 0,
                depth_assessment: 'failed'
            };
        }
    }

    /**
     * 분석 깊이 평가
     */
    assessDepth(vdp) {
        let depth = 0;
        
        // Scene 계층 구조 깊이
        if (vdp.scenes && vdp.scenes.length > 0) {
            depth += 20;
            vdp.scenes.forEach(scene => {
                if (scene.narrative_unit?.comedic_device?.length > 0) depth += 5;
                if (scene.setting?.visual_style?.cinematic_properties) depth += 5;
                if (scene.setting?.audio_style?.audio_events?.length > 0) depth += 5;
                if (scene.shots?.length > 0) {
                    depth += 10;
                    scene.shots.forEach(shot => {
                        if (shot.keyframes?.length >= 3) depth += 3;
                        if (shot.composition?.notes?.length >= 2) depth += 2;
                    });
                }
            });
        }

        // Hook Genome 혁신
        if (vdp.overall_analysis?.hookGenome) {
            depth += 25;
            if (vdp.overall_analysis.hookGenome.strength_score >= 0.80) depth += 10;
        }

        if (depth >= 90) return 'exceptional';
        if (depth >= 70) return 'high';
        if (depth >= 50) return 'medium';
        return 'low';
    }
}

export { TrueHybridVDPGenerator };