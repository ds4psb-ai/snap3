/**
 * TRUE Hybrid VDP v4.0 ULTIMATE - 완전한 데이터 통합 + OLD VDP 깊이
 * 사용자 피드백 완전 반영: 연출 분석 강화, 서사 분석 심화, 데이터 통합
 */

import { VertexAI } from '@google-cloud/vertexai';

// 환경 변수 설정
const PROJECT_ID = process.env.PROJECT_ID || 'tough-variety-466003-c5';
const REGION = process.env.REGION || 'us-central1';
const MODEL_NAME = process.env.MODEL_NAME || 'gemini-2.5-pro';

class TrueHybridUltimateVDPGenerator {
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
                max_tokens: 16000,
                analysis_depth: 'enhanced'
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
                max_tokens: 16000,
                analysis_depth: 'professional'
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
                max_tokens: 16000,
                analysis_depth: 'expert'
            };
        }
    }

    /**
     * TRUE Hybrid ULTIMATE 시스템 프롬프트 (효율적 최적화)
     */
    generateSystemPrompt(mode) {
        return `You are TRUE Hybrid VDP v4.0 ULTIMATE. Generate complete OLD VDP structure with Hook Genome integration and deep analysis.

**STRUCTURE (EXACT JSON):**
{
  "content_id": "string", "default_lang": "en",
  "metadata": {platform, source_url, view_count, like_count, comment_count, share_count, upload_date, video_origin, hashtags[], cta_types: [], original_sound: {id, title}},
  "overall_analysis": {
    "summary": "comprehensive summary ≥200 chars",
    "emotional_arc": "emotional journey ≥150 chars",
    "audience_reaction": {
      "analysis": "psychological analysis ≥200 chars",
      "common_reactions": ["reaction1", "reaction2"],
      "notable_comments": [{"text": "Korean", "lang": "ko", "translation_en": "English"}],
      "overall_sentiment": "sentiment"
    },
    "safety_flags": [], "confidence": {"overall": 0.95, "scene_classification": 0.93, "device_analysis": 0.97},
    "hookGenome": {
      "start_sec": 0, "pattern_code": "pattern", "strength_score": 0.85,
      "trigger_modalities": ["visual", "auditory"], "microbeats_sec": [1.0],
      "connected_scene_id": "S01_Name",
      "hook_integration_analysis": "how hook connects to scene ≥120 chars"
    },
    "asr_transcript": "Korean", "asr_lang": "ko", "asr_translation_en": "English",
    "ocr_text": [{"text": "Korean", "lang": "ko", "translation_en": "English"}]
  },
  "scenes": [
    {
      "scene_id": "S01_Name", "time_start": 0, "time_end": 8, "duration_sec": 8, "importance": "critical",
      "hook_connection": {"is_hook_scene": true, "hook_elements": ["element1"], "viral_mechanics": "viral appeal reason ≥80 chars"},
      "narrative_unit": {
        "narrative_role": "Hook Setup", "summary": "scene summary ≥150 chars",
        "dialogue": "Korean", "dialogue_lang": "ko", "dialogue_translation_en": "English",
        "rhetoric": ["technique1", "technique2"],
        "rhetoric_analysis": "how rhetorical devices work ≥120 chars",
        "comedic_device": ["device1", "device2"],
        "comedic_analysis": "how comedy works ≥120 chars"
      },
      "setting": {
        "location": "location",
        "visual_style": {
          "cinematic_properties": "comprehensive cinematography: camera, framing, composition, emotional impact ≥250 chars",
          "lighting_analysis": "lighting effects ≥80 chars",
          "color_psychology": "color impact ≥60 chars",
          "mood_palette": ["mood1", "mood2"],
          "edit_grammar": {"cut_speed": "fast", "camera_style": "static_shot", "subtitle_style": "broadcast_entertainment"}
        },
        "audio_style": {
          "music": "music impact ≥60 chars", "ambient_sound": "ambient ≥40 chars", "tone": "tone ≥60 chars",
          "audio_emotional_impact": "how audio enhances emotion ≥80 chars",
          "audio_events": [{"timestamp": 1.5, "event": "critical_sfx", "description": "description ≥40 chars", "intensity": "High"}]
        }
      },
      "shots": [
        {
          "shot_id": "S01_Shot01", "start": 0, "end": 4,
          "camera": {"shot": "MS", "angle": "eye", "move": "static"},
          "composition": {"grid": "center", "notes": ["note1 ≥15 chars", "note2 ≥15 chars"], "visual_impact": "narrative impact ≥50 chars"},
          "keyframes": [
            {"role": "start", "t_rel_shot": 0.5, "desc": "keyframe description ≥30 chars"},
            {"role": "peak", "t_rel_shot": 2.0, "desc": "keyframe description ≥30 chars"}
          ],
          "confidence": "high"
        }
      ]
    }
  ],
  "product_mentions": [], "service_mentions": []
}

**REQUIREMENTS:**
1. hookGenome connects to scene via connected_scene_id + hook_integration_analysis
2. cinematic_properties ≥250 chars professional film analysis
3. comedic_analysis + rhetoric_analysis ≥120 chars each
4. Korean dialogue preserved + translated
5. Hook scene has hook_connection object

Target ${mode.target_tokens} tokens. JSON only.`;
    }

    /**
     * 사용자 컨텍스트 프롬프트 (효율적 최적화)
     */
    generateUserPrompt(metadata) {
        return `Analyze Korean workplace comedy video. Generate TRUE Hybrid VDP v4.0 ULTIMATE with complete OLD VDP depth + Hook Genome integration.

**VIDEO**: ${metadata.content_id} - ${metadata.view_count?.toLocaleString() || 0} views, ${metadata.like_count?.toLocaleString() || 0} likes

**COMMENTS**: 
${metadata.top_comments || 'No comments'}

**REQUIREMENTS**:
1. hookGenome connects to scene via connected_scene_id + integration analysis
2. cinematic_properties ≥250 chars professional analysis  
3. comedic_analysis + rhetoric_analysis ≥120 chars each
4. Korean dialogue preserved + translated
5. Hook scene has hook_connection object
6. Cultural context: 직장문화, 야근 스트레스

Generate complete JSON following exact structure with professional depth.`;
    }

    /**
     * TRUE Hybrid ULTIMATE VDP 생성
     */
    async generateVDP(gcsUri, metadata, estimatedDuration = 15) {
        try {
            const mode = this.getAdaptiveMode(estimatedDuration);
            
            console.log(`🔥 TRUE Hybrid VDP v4.0 ULTIMATE 생성 시작 (모드: ${mode.mode}, 깊이: ${mode.analysis_depth})`);

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
                let jsonText = responseText.trim();
                
                const jsonStart = jsonText.indexOf('{');
                if (jsonStart > 0) {
                    jsonText = jsonText.substring(jsonStart);
                }
                
                if (!jsonText.endsWith('}')) {
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
                throw new Error('TRUE Hybrid ULTIMATE JSON 파싱 실패: ' + parseError.message);
            }

            // 메타데이터 강제 주입
            this.injectMetadata(vdpJson, metadata);

            // ULTIMATE 품질 검증
            const validation = this.validateUltimate(vdpJson, mode);

            console.log('✅ TRUE Hybrid VDP v4.0 ULTIMATE 생성 완료');
            return {
                vdp: vdpJson,
                mode: mode,
                validation: validation,
                tokens_estimated: Math.ceil(responseText.length / 4)
            };

        } catch (error) {
            console.error('❌ TRUE Hybrid VDP v4.0 ULTIMATE 생성 실패:', error);
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
     * ULTIMATE 품질 검증 (최고 수준 기준)
     */
    validateUltimate(vdp, mode) {
        const errors = [];
        let score = 100;
        
        try {
            // 1. 데이터 통합 검증
            const hook = vdp.overall_analysis?.hookGenome;
            if (!hook) {
                errors.push('Hook Genome 누락');
                score -= 30;
            } else {
                if (!hook.connected_scene_id) {
                    errors.push('Hook-Scene 연결 누락 (connected_scene_id)');
                    score -= 15;
                }
                if (!hook.hook_integration_analysis || hook.hook_integration_analysis.length < 150) {
                    errors.push('Hook 통합 분석 부족 (<150 chars)');
                    score -= 15;
                }
            }

            // 2. Scene 분석 깊이 검증
            if (!vdp.scenes || vdp.scenes.length === 0) {
                errors.push('Scenes 배열 누락');
                score -= 30;
            } else {
                vdp.scenes.forEach((scene, index) => {
                    // 연출 분석 깊이
                    if (!scene.setting?.visual_style?.cinematic_properties || 
                        scene.setting.visual_style.cinematic_properties.length < 300) {
                        errors.push(`Scene ${index}: cinematic_properties 부족 (<300 chars)`);
                        score -= 10;
                    }
                    
                    // 서사 분석 깊이
                    if (!scene.narrative_unit?.comedic_analysis || 
                        scene.narrative_unit.comedic_analysis.length < 150) {
                        errors.push(`Scene ${index}: comedic_analysis 부족 (<150 chars)`);
                        score -= 10;
                    }
                    
                    if (!scene.narrative_unit?.rhetoric_analysis || 
                        scene.narrative_unit.rhetoric_analysis.length < 150) {
                        errors.push(`Scene ${index}: rhetoric_analysis 부족 (<150 chars)`);
                        score -= 10;
                    }
                    
                    // 오디오 분석 깊이
                    if (!scene.setting?.audio_style?.audio_emotional_impact ||
                        scene.setting.audio_style.audio_emotional_impact.length < 100) {
                        errors.push(`Scene ${index}: audio_emotional_impact 부족 (<100 chars)`);
                        score -= 8;
                    }
                });
            }

            // 3. Hook 품질 검증
            if (hook && hook.strength_score < 0.70) {
                errors.push(`Hook strength_score (${hook.strength_score}) < 0.70`);
                score -= 15;
            }

            return {
                isValid: errors.length === 0,
                errors: errors,
                score: Math.max(0, score),
                depth_assessment: this.assessUltimateDepth(vdp),
                data_integration: hook?.connected_scene_id ? 'integrated' : 'separated'
            };

        } catch (error) {
            return {
                isValid: false,
                errors: ['ULTIMATE 검증 중 오류: ' + error.message],
                score: 0,
                depth_assessment: 'failed',
                data_integration: 'failed'
            };
        }
    }

    /**
     * ULTIMATE 분석 깊이 평가
     */
    assessUltimateDepth(vdp) {
        let depth = 0;
        
        // 데이터 통합 점수
        if (vdp.overall_analysis?.hookGenome?.connected_scene_id) depth += 20;
        if (vdp.overall_analysis?.hookGenome?.hook_integration_analysis?.length >= 150) depth += 15;
        
        // Scene 분석 깊이
        if (vdp.scenes) {
            vdp.scenes.forEach(scene => {
                if (scene.setting?.visual_style?.cinematic_properties?.length >= 300) depth += 15;
                if (scene.narrative_unit?.comedic_analysis?.length >= 150) depth += 10;
                if (scene.narrative_unit?.rhetoric_analysis?.length >= 150) depth += 10;
                if (scene.setting?.audio_style?.audio_emotional_impact?.length >= 100) depth += 10;
            });
        }

        if (depth >= 95) return 'ultimate';
        if (depth >= 80) return 'exceptional';
        if (depth >= 65) return 'high';
        return 'insufficient';
    }
}

export { TrueHybridUltimateVDPGenerator };