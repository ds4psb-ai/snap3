#!/usr/bin/env node
/**
 * TRUE Hybrid VDP v4.0 ULTIMATE 최종 테스트
 * 완전한 데이터 통합 + OLD VDP 깊이 + 사용자 피드백 완전 반영
 */

import { TrueHybridUltimateVDPGenerator } from './src/true-hybrid-vdp-v4-ultimate.js';
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

class UltimateTester {
    constructor() {
        this.generator = new TrueHybridUltimateVDPGenerator();
    }

    /**
     * TRUE Hybrid VDP v4.0 ULTIMATE 생성 테스트
     */
    async testUltimateGeneration() {
        console.log('🔥 TRUE Hybrid VDP v4.0 ULTIMATE 생성 테스트 시작...\\n');
        
        const gcsUri = "gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4";
        const estimatedDuration = 52;
        
        try {
            console.log(`🔄 GCS URI: ${gcsUri}`);
            console.log(`⏱️ 영상 길이: ${estimatedDuration}초\\n`);
            
            const result = await this.generator.generateVDP(
                gcsUri, 
                REAL_TEST_METADATA, 
                estimatedDuration
            );
            
            console.log('✅ TRUE Hybrid VDP v4.0 ULTIMATE 생성 성공!');
            console.log(`📊 모드: ${result.mode.mode}`);
            console.log(`🎯 목표 토큰: ${result.mode.target_tokens}`);
            console.log(`📈 실제 토큰: ${result.tokens_estimated}`);
            console.log(`🔍 깊이 평가: ${result.validation.depth_assessment}`);
            console.log(`🔗 데이터 통합: ${result.validation.data_integration}`);
            console.log(`💯 검증 점수: ${result.validation.score}/100\\n`);
            
            // VDP 저장
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputPath = `./out/true-hybrid-v4-ultimate-${timestamp}.json`;
            fs.writeFileSync(outputPath, JSON.stringify(result.vdp, null, 2));
            console.log(`💾 VDP 저장: ${outputPath}\\n`);
            
            return result.vdp;
            
        } catch (error) {
            console.error('❌ ULTIMATE 테스트 실패:', error.message);
            throw error;
        }
    }

    /**
     * 데이터 통합 검증 (사용자 피드백 1번 해결)
     */
    validateDataIntegration(vdp) {
        console.log('🔗 데이터 통합 검증 (사용자 피드백 반영):');
        
        let score = 0;
        const maxScore = 100;
        
        // Hook Genome과 Scene 연결
        const hook = vdp.overall_analysis?.hookGenome;
        if (hook) {
            if (hook.connected_scene_id) {
                score += 25;
                console.log(`  ✅ Hook-Scene 연결: ${hook.connected_scene_id} (+25점)`);
                
                // 연결된 scene 존재 확인
                const connectedScene = vdp.scenes?.find(s => s.scene_id === hook.connected_scene_id);
                if (connectedScene) {
                    score += 15;
                    console.log(`  ✅ 연결된 Scene 존재 확인 (+15점)`);
                    
                    // Hook connection 객체 확인
                    if (connectedScene.hook_connection) {
                        score += 20;
                        console.log(`  ✅ Scene에 hook_connection 객체 존재 (+20점)`);
                    }
                }
            } else {
                console.log(`  ❌ Hook-Scene 연결 없음`);
            }
            
            // Hook 통합 분석
            if (hook.hook_integration_analysis && hook.hook_integration_analysis.length >= 150) {
                score += 25;
                console.log(`  ✅ Hook 통합 분석 충분 (${hook.hook_integration_analysis.length} chars) (+25점)`);
            } else {
                console.log(`  ⚠️ Hook 통합 분석 부족`);
            }
            
            // 타임라인 일치 확인
            const hookStart = hook.start_sec;
            const connectedScene = vdp.scenes?.find(s => s.scene_id === hook.connected_scene_id);
            if (connectedScene && hookStart >= connectedScene.time_start && hookStart <= connectedScene.time_end) {
                score += 15;
                console.log(`  ✅ Hook 타임라인-Scene 일치 (${hookStart}s in ${connectedScene.time_start}-${connectedScene.time_end}s) (+15점)`);
            }
        } else {
            console.log(`  ❌ Hook Genome 없음`);
        }
        
        console.log(`\\n  📊 데이터 통합 점수: ${score}/${maxScore}\\n`);
        return { score, maxScore, isIntegrated: score >= 80 };
    }

    /**
     * 연출 분석 깊이 검증 (사용자 피드백 2번 해결)
     */
    validateCinematicDepth(vdp) {
        console.log('🎬 연출 분석 깊이 검증 (OLD VDP 수준):');
        
        let score = 0;
        const maxScore = 100;
        let totalScenes = 0;
        let scenesWithDepth = 0;
        
        if (vdp.scenes) {
            vdp.scenes.forEach((scene, index) => {
                totalScenes++;
                let sceneScore = 0;
                
                // Cinematic properties 깊이
                if (scene.setting?.visual_style?.cinematic_properties) {
                    const cinematicLength = scene.setting.visual_style.cinematic_properties.length;
                    if (cinematicLength >= 300) {
                        sceneScore += 25;
                        console.log(`  ✅ Scene ${index+1} cinematic analysis: ${cinematicLength} chars (+25점)`);
                    } else if (cinematicLength >= 200) {
                        sceneScore += 15;
                        console.log(`  ⚠️ Scene ${index+1} cinematic analysis: ${cinematicLength} chars (+15점)`);
                    } else {
                        console.log(`  ❌ Scene ${index+1} cinematic analysis 부족: ${cinematicLength} chars`);
                    }
                }
                
                // Lighting analysis
                if (scene.setting?.visual_style?.lighting_analysis && 
                    scene.setting.visual_style.lighting_analysis.length >= 100) {
                    sceneScore += 15;
                    console.log(`  ✅ Scene ${index+1} lighting analysis (+15점)`);
                }
                
                // Color psychology
                if (scene.setting?.visual_style?.color_psychology && 
                    scene.setting.visual_style.color_psychology.length >= 80) {
                    sceneScore += 10;
                    console.log(`  ✅ Scene ${index+1} color psychology (+10점)`);
                }
                
                if (sceneScore >= 40) scenesWithDepth++;
                score += sceneScore;
            });
        }
        
        // 평균화
        if (totalScenes > 0) {
            score = Math.round(score / totalScenes);
        }
        
        console.log(`\\n  📊 연출 분석 깊이: ${score}/${maxScore} (${scenesWithDepth}/${totalScenes} scenes with depth)\\n`);
        return { score, maxScore, hasOldVdpDepth: score >= 80 };
    }

    /**
     * 서사 분석 깊이 검증 (사용자 피드백 3번 해결)
     */
    validateNarrativeDepth(vdp) {
        console.log('📖 서사 분석 깊이 검증 (OLD VDP 수준):');
        
        let score = 0;
        const maxScore = 100;
        let totalScenes = 0;
        let scenesWithNarrativeDepth = 0;
        
        if (vdp.scenes) {
            vdp.scenes.forEach((scene, index) => {
                totalScenes++;
                let sceneScore = 0;
                
                // Comedic analysis 깊이
                if (scene.narrative_unit?.comedic_analysis) {
                    const comedicLength = scene.narrative_unit.comedic_analysis.length;
                    if (comedicLength >= 150) {
                        sceneScore += 25;
                        console.log(`  ✅ Scene ${index+1} comedic analysis: ${comedicLength} chars (+25점)`);
                    } else {
                        console.log(`  ❌ Scene ${index+1} comedic analysis 부족: ${comedicLength} chars`);
                    }
                }
                
                // Rhetoric analysis 깊이
                if (scene.narrative_unit?.rhetoric_analysis) {
                    const rhetoricLength = scene.narrative_unit.rhetoric_analysis.length;
                    if (rhetoricLength >= 150) {
                        sceneScore += 25;
                        console.log(`  ✅ Scene ${index+1} rhetoric analysis: ${rhetoricLength} chars (+25점)`);
                    } else {
                        console.log(`  ❌ Scene ${index+1} rhetoric analysis 부족: ${rhetoricLength} chars`);
                    }
                }
                
                // Comedic device 구체성
                if (scene.narrative_unit?.comedic_device && 
                    Array.isArray(scene.narrative_unit.comedic_device) &&
                    scene.narrative_unit.comedic_device.length > 0) {
                    sceneScore += 15;
                    console.log(`  ✅ Scene ${index+1} comedic devices: ${scene.narrative_unit.comedic_device.join(', ')} (+15점)`);
                }
                
                // Rhetoric 구체성
                if (scene.narrative_unit?.rhetoric && 
                    Array.isArray(scene.narrative_unit.rhetoric) &&
                    scene.narrative_unit.rhetoric.length > 0) {
                    sceneScore += 15;
                    console.log(`  ✅ Scene ${index+1} rhetoric techniques: ${scene.narrative_unit.rhetoric.join(', ')} (+15점)`);
                }
                
                if (sceneScore >= 60) scenesWithNarrativeDepth++;
                score += sceneScore;
            });
        }
        
        // 평균화
        if (totalScenes > 0) {
            score = Math.round(score / totalScenes);
        }
        
        console.log(`\\n  📊 서사 분석 깊이: ${score}/${maxScore} (${scenesWithNarrativeDepth}/${totalScenes} scenes with depth)\\n`);
        return { score, maxScore, hasNarrativeDepth: score >= 80 };
    }

    /**
     * 전체 ULTIMATE 테스트 실행
     */
    async runUltimateTest() {
        console.log('🏆 TRUE Hybrid VDP v4.0 ULTIMATE 최종 검증');
        console.log('=' .repeat(80));
        console.log(`📹 테스트 영상: ${REAL_TEST_METADATA.content_id} (햄스터 야근)`);
        console.log(`👀 조회수: ${REAL_TEST_METADATA.view_count.toLocaleString()}`);
        console.log(`❤️ 좋아요: ${REAL_TEST_METADATA.like_count.toLocaleString()}`);
        console.log('\\n🎯 사용자 피드백 완전 반영 검증:');
        console.log('  1. 데이터 분리 현상 해결');
        console.log('  2. 연출 분석 OLD VDP 수준 복원');
        console.log('  3. 서사 구조 분석 OLD VDP 수준 복원');
        console.log('');

        try {
            // 1. ULTIMATE VDP 생성
            const ultimateVdp = await this.testUltimateGeneration();
            
            // 2. 데이터 통합 검증
            const dataIntegration = this.validateDataIntegration(ultimateVdp);
            
            // 3. 연출 분석 깊이 검증
            const cinematicDepth = this.validateCinematicDepth(ultimateVdp);
            
            // 4. 서사 분석 깊이 검증
            const narrativeDepth = this.validateNarrativeDepth(ultimateVdp);
            
            // 5. 최종 평가
            const finalScore = Math.round(
                (dataIntegration.score * 0.4) + 
                (cinematicDepth.score * 0.3) + 
                (narrativeDepth.score * 0.3)
            );
            
            const allRequirementsMet = dataIntegration.isIntegrated && 
                                      cinematicDepth.hasOldVdpDepth && 
                                      narrativeDepth.hasNarrativeDepth;
            
            console.log('🏆 TRUE Hybrid VDP v4.0 ULTIMATE 최종 평가');
            console.log('=' .repeat(60));
            console.log(`🔗 데이터 통합: ${dataIntegration.score}/100 ${dataIntegration.isIntegrated ? '✅' : '❌'}`);
            console.log(`🎬 연출 분석 깊이: ${cinematicDepth.score}/100 ${cinematicDepth.hasOldVdpDepth ? '✅' : '❌'}`);
            console.log(`📖 서사 분석 깊이: ${narrativeDepth.score}/100 ${narrativeDepth.hasNarrativeDepth ? '✅' : '❌'}`);
            console.log('-' .repeat(40));
            console.log(`🎯 최종 점수: ${finalScore}/100`);
            console.log('');
            
            if (finalScore >= 95 && allRequirementsMet) {
                console.log('🏆🏆🏆 TRUE Hybrid ULTIMATE 완전 성공! 사용자 피드백 완전 반영! 🏆🏆🏆');
                console.log('✅ 데이터 완전 통합 ✅ OLD VDP 깊이 완전 복원 ✅ 모든 문제점 해결');
            } else if (finalScore >= 85) {
                console.log('✅ TRUE Hybrid ULTIMATE 성공! 대부분의 요구사항 충족');
            } else {
                console.log('⚠️ 추가 개선 필요. 사용자 피드백 완전 반영 미달');
            }
            
            // 결과 저장
            const testResult = {
                timestamp: new Date().toISOString(),
                metadata: REAL_TEST_METADATA,
                ultimate_vdp: ultimateVdp,
                validations: {
                    data_integration: dataIntegration,
                    cinematic_depth: cinematicDepth,
                    narrative_depth: narrativeDepth
                },
                final_score: finalScore,
                all_requirements_met: allRequirementsMet,
                conclusion: allRequirementsMet ? 'ULTIMATE_SUCCESS' : 'NEEDS_IMPROVEMENT',
                user_feedback_resolved: {
                    data_separation: dataIntegration.isIntegrated,
                    cinematic_analysis: cinematicDepth.hasOldVdpDepth,
                    narrative_analysis: narrativeDepth.hasNarrativeDepth
                }
            };
            
            fs.writeFileSync('./out/true-hybrid-v4-ultimate-test-results.json', JSON.stringify(testResult, null, 2));
            console.log('\\n💾 ULTIMATE 테스트 결과 저장: ./out/true-hybrid-v4-ultimate-test-results.json');
            
            return testResult;
            
        } catch (error) {
            console.error('❌ ULTIMATE 테스트 실행 실패:', error);
            throw error;
        }
    }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new UltimateTester();
    tester.runUltimateTest().catch(console.error);
}

export { UltimateTester };