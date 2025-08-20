#!/usr/bin/env node
/**
 * TRUE Hybrid VDP v3.0 실제 테스트
 * OLD VDP 완전 복원 + Hook Genome 혁신 검증
 */

import { TrueHybridVDPGenerator } from './src/true-hybrid-vdp-v3.js';
import fs from 'fs';

// 실제 테스트 메타데이터
const REAL_TEST_METADATA = {
    content_id: "6_I2FmT1mbY",
    platform: "YouTube Shorts",
    source_url: "https://www.youtube.com/shorts/6_I2FmT1mbY",
    view_count: 6530000,
    like_count: 110000,
    comment_count: 3354,
    share_count: 2000,
    upload_date: "2025-07-13T13:36:00.000Z",
    video_origin: "AI-Generated",
    hashtags: ["#hamster", "#office", "#relatable"],
    top_comments: `지랄하지마는 진짜 쏘울 담긴 더빙인데욬ㅋㅋㅋㅋㅋㅋ
지랄하지마가 진짜 웃겨욬ㅋㅋㅋㅋㅋㅋㄱㅋ
fucken해ㅋㅋㅋㅋㅋ는 뭐야ㅋㅋㅋ
햄스터 목소리가 너무 귀여워요
야근 상황이 너무 현실적이에요`
};

// OLD VDP 기준점 (사용자가 제공한 구조)
const OLD_VDP_STRUCTURAL_REQUIREMENTS = {
    scenes_with_complete_hierarchy: true,
    shots_with_keyframes: true,
    narrative_unit_depth: true,
    visual_style_analysis: true,
    audio_style_analysis: true,
    camera_metadata_complete: true,
    composition_notes_minimum: 2,
    keyframes_minimum: 2,
    comedic_device_analysis: true,
    rhetoric_analysis: true
};

class TrueHybridTester {
    constructor() {
        this.generator = new TrueHybridVDPGenerator();
    }

    /**
     * TRUE Hybrid VDP v3.0 생성 테스트
     */
    async testTrueHybridGeneration() {
        console.log('🔥 TRUE Hybrid VDP v3.0 실제 영상 테스트 시작...\\n');
        
        const gcsUri = "gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4";
        const estimatedDuration = 52; // 실제 영상 길이
        
        try {
            console.log(`🔄 GCS URI: ${gcsUri}`);
            console.log(`⏱️ 영상 길이: ${estimatedDuration}초\\n`);
            
            // TRUE Hybrid VDP 생성
            const result = await this.generator.generateVDP(
                gcsUri, 
                REAL_TEST_METADATA, 
                estimatedDuration
            );
            
            console.log('✅ TRUE Hybrid VDP v3.0 생성 성공!');
            console.log(`📊 모드: ${result.mode.mode}`);
            console.log(`🎯 목표 토큰: ${result.mode.target_tokens}`);
            console.log(`📈 실제 토큰: ${result.tokens_estimated}`);
            console.log(`🔍 깊이 평가: ${result.validation.depth_assessment}`);
            console.log(`💯 검증 점수: ${result.validation.score}/100\\n`);
            
            // VDP 저장
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputPath = `./out/true-hybrid-v3-${timestamp}.json`;
            fs.writeFileSync(outputPath, JSON.stringify(result.vdp, null, 2));
            console.log(`💾 VDP 저장: ${outputPath}\\n`);
            
            return result.vdp;
            
        } catch (error) {
            console.error('❌ TRUE Hybrid v3.0 테스트 실패:', error.message);
            throw error;
        }
    }

    /**
     * OLD VDP 구조 완전성 검증
     */
    validateOldVdpStructure(vdp) {
        console.log('🏗️ OLD VDP 구조 완전성 검증:');
        
        let score = 0;
        const maxScore = 100;
        
        // 1. Scenes 계층 구조 (25점)
        if (vdp.scenes && vdp.scenes.length > 0) {
            score += 10;
            console.log('  ✅ Scenes 배열 존재 (+10점)');
            
            let scenesWithNarrative = 0;
            let scenesWithSetting = 0;
            
            vdp.scenes.forEach((scene, index) => {
                if (scene.narrative_unit && 
                    scene.narrative_unit.comedic_device && 
                    scene.narrative_unit.rhetoric) {
                    scenesWithNarrative++;
                }
                
                if (scene.setting && 
                    scene.setting.visual_style && 
                    scene.setting.audio_style) {
                    scenesWithSetting++;
                }
            });
            
            if (scenesWithNarrative === vdp.scenes.length) {
                score += 8;
                console.log('  ✅ 모든 scene에 narrative_unit 완성 (+8점)');
            }
            
            if (scenesWithSetting === vdp.scenes.length) {
                score += 7;
                console.log('  ✅ 모든 scene에 setting 완성 (+7점)');
            }
        } else {
            console.log('  ❌ Scenes 배열 없음');
        }

        // 2. Shots 계층 구조 (25점)
        let totalShots = 0;
        let shotsWithKeyframes = 0;
        let shotsWithCamera = 0;
        let shotsWithComposition = 0;
        
        if (vdp.scenes) {
            vdp.scenes.forEach(scene => {
                if (scene.shots) {
                    scene.shots.forEach(shot => {
                        totalShots++;
                        
                        if (shot.keyframes && shot.keyframes.length >= 2) {
                            shotsWithKeyframes++;
                        }
                        
                        if (shot.camera && shot.camera.shot && shot.camera.angle && shot.camera.move) {
                            shotsWithCamera++;
                        }
                        
                        if (shot.composition && shot.composition.notes && shot.composition.notes.length >= 2) {
                            shotsWithComposition++;
                        }
                    });
                }
            });
        }
        
        if (totalShots > 0) {
            if (shotsWithKeyframes === totalShots) {
                score += 10;
                console.log(`  ✅ 모든 shot에 keyframes 완성 (${totalShots}개) (+10점)`);
            } else {
                console.log(`  ⚠️ Keyframes 부족한 shot: ${totalShots - shotsWithKeyframes}개`);
            }
            
            if (shotsWithCamera === totalShots) {
                score += 8;
                console.log(`  ✅ 모든 shot에 camera 메타데이터 완성 (+8점)`);
            }
            
            if (shotsWithComposition === totalShots) {
                score += 7;
                console.log(`  ✅ 모든 shot에 composition notes 완성 (+7점)`);
            }
        }

        // 3. 시네마틱 분석 깊이 (25점)
        let visualStyleDepth = 0;
        let audioStyleDepth = 0;
        
        if (vdp.scenes) {
            vdp.scenes.forEach(scene => {
                if (scene.setting?.visual_style) {
                    const vs = scene.setting.visual_style;
                    if (vs.cinematic_properties && vs.lighting && vs.mood_palette && vs.edit_grammar) {
                        visualStyleDepth++;
                    }
                }
                
                if (scene.setting?.audio_style) {
                    const as = scene.setting.audio_style;
                    if (as.music && as.ambient_sound && as.tone && as.audio_events) {
                        audioStyleDepth++;
                    }
                }
            });
        }
        
        if (visualStyleDepth > 0) {
            score += 13;
            console.log(`  ✅ Visual style 분석 깊이 (${visualStyleDepth}개 scene) (+13점)`);
        }
        
        if (audioStyleDepth > 0) {
            score += 12;
            console.log(`  ✅ Audio style 분석 깊이 (${audioStyleDepth}개 scene) (+12점)`);
        }

        // 4. Hook Genome 혁신 (25점)
        const hook = vdp.overall_analysis?.hookGenome;
        if (hook) {
            score += 10;
            console.log('  ✅ Hook Genome 존재 (+10점)');
            
            if (hook.strength_score >= 0.80) {
                score += 8;
                console.log(`  ✅ Hook 강도 우수 (${hook.strength_score}) (+8점)`);
            }
            
            if (hook.pattern_code && hook.trigger_modalities && hook.microbeats_sec) {
                score += 7;
                console.log('  ✅ Hook Genome 완전 구조 (+7점)');
            }
        } else {
            console.log('  ❌ Hook Genome 없음');
        }

        console.log(`\\n  📊 OLD VDP 구조 완전성: ${score}/${maxScore}\\n`);
        
        return {
            score: score,
            maxScore: maxScore,
            isComplete: score >= 90,
            exceedsOld: score >= 85
        };
    }

    /**
     * 분석 깊이 vs OLD VDP 비교
     */
    compareAnalysisDepth(vdp) {
        console.log('🔬 분석 깊이 비교 (TRUE Hybrid vs OLD VDP):');
        
        let depthScore = 0;
        
        // 1. 서사 구조 분석 깊이
        let narrativeDepth = 0;
        if (vdp.scenes) {
            vdp.scenes.forEach(scene => {
                if (scene.narrative_unit?.comedic_device?.length > 0) narrativeDepth += 5;
                if (scene.narrative_unit?.rhetoric?.length > 0) narrativeDepth += 5;
                if (scene.narrative_unit?.summary?.length > 120) narrativeDepth += 3;
            });
        }
        
        if (narrativeDepth >= 30) {
            depthScore += 25;
            console.log(`  ✅ 서사 구조 분석 깊이 우수 (${narrativeDepth}점) (+25점)`);
        } else {
            console.log(`  ⚠️ 서사 구조 분석 부족 (${narrativeDepth}점)`);
        }

        // 2. 연출 기법 분석 깊이  
        let cinematicDepth = 0;
        if (vdp.scenes) {
            vdp.scenes.forEach(scene => {
                if (scene.setting?.visual_style?.cinematic_properties?.length > 50) cinematicDepth += 5;
                if (scene.setting?.audio_style?.audio_events?.length > 0) cinematicDepth += 5;
            });
        }
        
        if (cinematicDepth >= 20) {
            depthScore += 25;
            console.log(`  ✅ 연출 기법 분석 깊이 우수 (${cinematicDepth}점) (+25점)`);
        }

        // 3. 키프레임 분석 상세도
        let keyframeDepth = 0;
        if (vdp.scenes) {
            vdp.scenes.forEach(scene => {
                if (scene.shots) {
                    scene.shots.forEach(shot => {
                        if (shot.keyframes) {
                            keyframeDepth += shot.keyframes.length * 2;
                        }
                    });
                }
            });
        }
        
        if (keyframeDepth >= 30) {
            depthScore += 25;
            console.log(`  ✅ 키프레임 분석 상세도 우수 (${keyframeDepth}점) (+25점)`);
        }

        // 4. Hook Genome + 전통 분석 통합
        if (vdp.overall_analysis?.hookGenome && depthScore >= 50) {
            depthScore += 25;
            console.log('  ✅ Hook Genome + OLD VDP 깊이 완벽 통합 (+25점)');
        }

        console.log(`\\n  📊 분석 깊이 점수: ${depthScore}/100\\n`);
        
        return {
            score: depthScore,
            exceedsOld: depthScore >= 80
        };
    }

    /**
     * 전체 TRUE Hybrid 테스트 실행
     */
    async runTrueHybridTest() {
        console.log('🔥 TRUE Hybrid VDP v3.0 최종 검증 테스트');
        console.log('=' .repeat(80));
        console.log(`📹 테스트 영상: ${REAL_TEST_METADATA.content_id} (햄스터 야근)`);
        console.log(`👀 조회수: ${REAL_TEST_METADATA.view_count.toLocaleString()}`);
        console.log(`❤️ 좋아요: ${REAL_TEST_METADATA.like_count.toLocaleString()}`);
        console.log('');

        try {
            // 1. TRUE Hybrid VDP 생성
            const hybridVdp = await this.testTrueHybridGeneration();
            
            // 2. OLD VDP 구조 완전성 검증
            const structureValidation = this.validateOldVdpStructure(hybridVdp);
            
            // 3. 분석 깊이 비교
            const depthComparison = this.compareAnalysisDepth(hybridVdp);
            
            // 4. 최종 평가
            const finalScore = Math.round((structureValidation.score + depthComparison.score) / 2);
            const exceedsOld = structureValidation.exceedsOld && depthComparison.exceedsOld;
            
            console.log('🏆 TRUE Hybrid VDP v3.0 최종 평가');
            console.log('=' .repeat(60));
            console.log(`🏗️ OLD VDP 구조 완전성: ${structureValidation.score}/100`);
            console.log(`🔬 분석 깊이 점수: ${depthComparison.score}/100`);
            console.log('-' .repeat(40));
            console.log(`🎯 최종 점수: ${finalScore}/100`);
            console.log('');
            
            if (finalScore >= 90) {
                console.log('🏆 TRUE Hybrid 완전 성공! OLD VDP를 완전히 뛰어넘었습니다!');
            } else if (finalScore >= 80) {
                console.log('✅ TRUE Hybrid 성공! OLD VDP 수준을 달성했습니다.');
            } else {
                console.log('⚠️ 개선 필요. OLD VDP 수준에 미달합니다.');
            }
            
            // 결과 저장
            const testResult = {
                timestamp: new Date().toISOString(),
                metadata: REAL_TEST_METADATA,
                true_hybrid_vdp: hybridVdp,
                structure_validation: structureValidation,
                depth_comparison: depthComparison,
                final_score: finalScore,
                exceeds_old_vdp: exceedsOld,
                conclusion: finalScore >= 85 ? 'SUCCESS' : 'NEEDS_IMPROVEMENT'
            };
            
            fs.writeFileSync('./out/true-hybrid-v3-test-results.json', JSON.stringify(testResult, null, 2));
            console.log('\\n💾 전체 테스트 결과 저장: ./out/true-hybrid-v3-test-results.json');
            
            return testResult;
            
        } catch (error) {
            console.error('❌ TRUE Hybrid 테스트 실행 실패:', error);
            throw error;
        }
    }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new TrueHybridTester();
    tester.runTrueHybridTest().catch(console.error);
}

export { TrueHybridTester };