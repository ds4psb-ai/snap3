#!/usr/bin/env node
/**
 * TRUE Hybrid VDP v5.0 FINAL 최종 테스트
 * 사용자 피드백 완전 해결: 5개 장면 정확 분할 + 완전한 OCR 텍스트 캡처
 */

import { TrueHybridFinalVDPGenerator } from './src/true-hybrid-vdp-v5-final.js';
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

class FinalTester {
    constructor() {
        this.generator = new TrueHybridFinalVDPGenerator();
    }

    /**
     * TRUE Hybrid VDP v5.0 FINAL 생성 테스트
     */
    async testFinalGeneration() {
        console.log('🏆 TRUE Hybrid VDP v5.0 FINAL 생성 테스트 시작...\\n');
        
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
            
            console.log('✅ TRUE Hybrid VDP v5.0 FINAL 생성 성공!');
            console.log(`📊 모드: ${result.mode.mode}`);
            console.log(`🎯 목표 토큰: ${result.mode.target_tokens}`);
            console.log(`📈 실제 토큰: ${result.tokens_estimated}`);
            console.log(`🎬 장면 개수: ${result.validation.scene_count}/5`);
            console.log(`🎯 장면 정확도: ${result.validation.scene_accuracy}`);
            console.log(`📝 OCR 완전성: ${result.validation.ocr_completeness}`);
            console.log(`🔗 데이터 통합: ${result.validation.data_integration}`);
            console.log(`💯 최종 점수: ${result.validation.score}/100\\n`);
            
            // VDP 저장
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputPath = `./out/true-hybrid-v5-final-${timestamp}.json`;
            fs.writeFileSync(outputPath, JSON.stringify(result.vdp, null, 2));
            console.log(`💾 VDP 저장: ${outputPath}\\n`);
            
            return result.vdp;
            
        } catch (error) {
            console.error('❌ FINAL 테스트 실패:', error.message);
            throw error;
        }
    }

    /**
     * 5개 장면 정확성 검증 (사용자 피드백 1 해결)
     */
    validateSceneAccuracy(vdp) {
        console.log('🎬 5개 장면 정확성 검증 (사용자 피드백 해결):');
        
        const expectedScenes = [
            { id: 'S01_TheAssignment', description: 'Meeting ends → assignment → overtime realization' },
            { id: 'S02_OvertimeVow', description: 'Eye strain → vow to leave at 9PM → working dedication' },
            { id: 'S03_WorkCompletion', description: 'Work finished → save attempt → computer crash' },
            { id: 'S04_TheRally', description: 'Despair → motivation → energy drink → recovery' },
            { id: 'S05_TheTwist', description: 'Next morning → colleague → manager vacation reveal' }
        ];
        
        let score = 0;
        const maxScore = 100;
        
        console.log(`\\n  📊 실제 장면 개수: ${vdp.scenes?.length || 0}개`);
        console.log(`  🎯 예상 장면 개수: ${expectedScenes.length}개\\n`);
        
        if (vdp.scenes && vdp.scenes.length === expectedScenes.length) {
            score += 40;
            console.log(`  ✅ 장면 개수 정확 (+40점)`);
            
            expectedScenes.forEach((expected, index) => {
                const actualScene = vdp.scenes[index];
                if (actualScene && actualScene.scene_id === expected.id) {
                    score += 12;
                    console.log(`  ✅ ${expected.id} 정확 (+12점): ${expected.description}`);
                } else {
                    console.log(`  ❌ ${expected.id} 누락 또는 순서 오류`);
                    if (actualScene) {
                        console.log(`      실제: ${actualScene.scene_id} (${actualScene.time_start}-${actualScene.time_end}s)`);
                    }
                }
            });
            
        } else {
            console.log(`  ❌ 장면 개수 불일치: ${vdp.scenes?.length || 0}개 (예상: ${expectedScenes.length}개)`);
            if (vdp.scenes) {
                vdp.scenes.forEach((scene, index) => {
                    console.log(`      Scene ${index+1}: ${scene.scene_id} (${scene.time_start}-${scene.time_end}s)`);
                });
            }
        }
        
        console.log(`\\n  📊 장면 정확도: ${score}/${maxScore}\\n`);
        return { score, maxScore, isPerfect: score === maxScore };
    }

    /**
     * OCR 텍스트 완전성 검증 (사용자 피드백 2 해결)
     */
    validateOcrCompleteness(vdp) {
        console.log('📝 OCR 텍스트 완전성 검증 (OLD VDP 표준):');
        
        const requiredOcrTexts = [
            { text: '회의 끝나니까', description: 'Opening dialogue subtitle' },
            { text: '그렇다면 퇴근', description: 'Hope for leaving work' },
            { text: '직장인의 흔한 야근 시발점', description: 'Video title overlay' },
            { text: '정서불안 김햄찌', description: 'Character name caption' },
            { text: 'FUCKEN 해', description: 'Energy drink motivation text' },
            { text: '10:50 PM', description: 'Clock time display' },
            { text: '(허언이 있는편)', description: 'Parenthetical comment 1' },
            { text: '(기절 일보 직전)', description: 'Parenthetical comment 2' },
            { text: 'Corp Research', description: 'Document title on screen' },
            { text: 'Error. An error occurred.', description: 'Computer error message' },
            { text: '(저장할 수 없지롱)', description: 'Taunting error message' },
            { text: '(에너지 UP)', description: 'Power-up effect text' }
        ];
        
        let score = 0;
        const maxScore = 100;
        const pointsPerText = Math.floor(maxScore / requiredOcrTexts.length);
        
        const ocrTexts = vdp.overall_analysis?.ocr_text || [];
        const capturedTexts = ocrTexts.map(item => item.text);
        
        console.log(`\\n  📊 캡처된 OCR 텍스트: ${capturedTexts.length}개`);
        console.log(`  🎯 필수 OCR 텍스트: ${requiredOcrTexts.length}개\\n`);
        
        let foundCount = 0;
        let missingTexts = [];
        
        requiredOcrTexts.forEach((required, index) => {
            const isFound = capturedTexts.some(captured => 
                captured.includes(required.text) || required.text.includes(captured)
            );
            
            if (isFound) {
                score += pointsPerText;
                foundCount++;
                console.log(`  ✅ "${required.text}" 발견 (+${pointsPerText}점): ${required.description}`);
            } else {
                missingTexts.push(required.text);
                console.log(`  ❌ "${required.text}" 누락: ${required.description}`);
            }
        });
        
        // 추가로 발견된 텍스트 확인
        console.log(`\\n  🔍 추가 캡처된 텍스트:`);
        capturedTexts.forEach(captured => {
            const isRequired = requiredOcrTexts.some(req => 
                req.text.includes(captured) || captured.includes(req.text)
            );
            if (!isRequired) {
                console.log(`      + "${captured}" (추가 발견)`);
            }
        });
        
        const completeness = foundCount / requiredOcrTexts.length;
        console.log(`\\n  📊 OCR 완전성: ${score}/${maxScore} (${Math.round(completeness * 100)}% 완료)`);
        console.log(`  📝 발견/전체: ${foundCount}/${requiredOcrTexts.length}`);
        
        if (missingTexts.length > 0) {
            console.log(`  ❌ 누락 텍스트: ${missingTexts.join(', ')}`);
        }
        
        console.log('');
        return { 
            score, 
            maxScore, 
            foundCount, 
            totalRequired: requiredOcrTexts.length,
            completeness: completeness,
            isComplete: missingTexts.length === 0,
            missingTexts 
        };
    }

    /**
     * 데이터 통합 검증 (기존 요구사항 유지)
     */
    validateDataIntegration(vdp) {
        console.log('🔗 데이터 통합 검증 (기존 품질 유지):');
        
        let score = 0;
        const maxScore = 100;
        
        const hook = vdp.overall_analysis?.hookGenome;
        if (hook) {
            if (hook.connected_scene_id === 'S01_TheAssignment') {
                score += 30;
                console.log(`  ✅ Hook-Scene 연결: ${hook.connected_scene_id} (+30점)`);
                
                const connectedScene = vdp.scenes?.find(s => s.scene_id === hook.connected_scene_id);
                if (connectedScene && connectedScene.hook_connection) {
                    score += 25;
                    console.log(`  ✅ Scene에 hook_connection 객체 존재 (+25점)`);
                }
            } else {
                console.log(`  ❌ Hook-Scene 연결 오류: ${hook.connected_scene_id} (예상: S01_TheAssignment)`);
            }
            
            if (hook.hook_integration_analysis && hook.hook_integration_analysis.length >= 120) {
                score += 25;
                console.log(`  ✅ Hook 통합 분석 충분 (${hook.hook_integration_analysis.length} chars) (+25점)`);
            } else {
                console.log(`  ⚠️ Hook 통합 분석 부족`);
            }
            
            if (hook.strength_score >= 0.7) {
                score += 20;
                console.log(`  ✅ Hook 강도 우수 (${hook.strength_score}) (+20점)`);
            }
        } else {
            console.log(`  ❌ Hook Genome 없음`);
        }
        
        console.log(`\\n  📊 데이터 통합 점수: ${score}/${maxScore}\\n`);
        return { score, maxScore, isIntegrated: score >= 80 };
    }

    /**
     * 전체 FINAL 테스트 실행
     */
    async runFinalTest() {
        console.log('🏆 TRUE Hybrid VDP v5.0 FINAL 최종 검증');
        console.log('=' .repeat(80));
        console.log(`📹 테스트 영상: ${REAL_TEST_METADATA.content_id} (햄스터 야근)`);
        console.log(`👀 조회수: ${REAL_TEST_METADATA.view_count.toLocaleString()}`);
        console.log(`❤️ 좋아요: ${REAL_TEST_METADATA.like_count.toLocaleString()}`);
        console.log('\\n🎯 사용자 피드백 완전 해결 검증:');
        console.log('  1. 장면 분할 정확도 하락 → 정확한 5개 장면 복원');
        console.log('  2. OCR 텍스트 정보 누락 → 완전한 텍스트 캡처');
        console.log('  3. 기존 데이터 통합 품질 유지');
        console.log('');

        try {
            // 1. FINAL VDP 생성
            const finalVdp = await this.testFinalGeneration();
            
            // 2. 5개 장면 정확성 검증
            const sceneAccuracy = this.validateSceneAccuracy(finalVdp);
            
            // 3. OCR 완전성 검증
            const ocrCompleteness = this.validateOcrCompleteness(finalVdp);
            
            // 4. 데이터 통합 검증
            const dataIntegration = this.validateDataIntegration(finalVdp);
            
            // 5. 최종 평가
            const finalScore = Math.round(
                (sceneAccuracy.score * 0.4) + 
                (ocrCompleteness.score * 0.4) + 
                (dataIntegration.score * 0.2)
            );
            
            const allIssuesResolved = sceneAccuracy.isPerfect && 
                                    ocrCompleteness.isComplete && 
                                    dataIntegration.isIntegrated;
            
            console.log('🏆 TRUE Hybrid VDP v5.0 FINAL 최종 평가');
            console.log('=' .repeat(70));
            console.log(`🎬 5개 장면 정확성: ${sceneAccuracy.score}/100 ${sceneAccuracy.isPerfect ? '✅' : '❌'}`);
            console.log(`📝 OCR 텍스트 완전성: ${ocrCompleteness.score}/100 ${ocrCompleteness.isComplete ? '✅' : '❌'}`);
            console.log(`🔗 데이터 통합 품질: ${dataIntegration.score}/100 ${dataIntegration.isIntegrated ? '✅' : '❌'}`);
            console.log('-' .repeat(50));
            console.log(`🎯 최종 점수: ${finalScore}/100`);
            console.log('');
            
            if (finalScore >= 95 && allIssuesResolved) {
                console.log('🎉🎉🎉 TRUE Hybrid FINAL 완전 성공! 사용자 피드백 100% 해결! 🎉🎉🎉');
                console.log('✅ 5개 장면 정확 분할 ✅ 완전한 OCR 캡처 ✅ 모든 문제점 완벽 해결');
            } else if (finalScore >= 85) {
                console.log('✅ TRUE Hybrid FINAL 성공! 대부분의 요구사항 충족');
                if (!sceneAccuracy.isPerfect) {
                    console.log('⚠️ 장면 분할 추가 조정 필요');
                }
                if (!ocrCompleteness.isComplete) {
                    console.log(`⚠️ OCR 텍스트 ${ocrCompleteness.missingTexts?.length || 0}개 누락`);
                }
            } else {
                console.log('⚠️ 추가 개선 필요. 사용자 피드백 해결 미완료');
            }
            
            // 결과 저장
            const testResult = {
                timestamp: new Date().toISOString(),
                metadata: REAL_TEST_METADATA,
                final_vdp: finalVdp,
                validations: {
                    scene_accuracy: sceneAccuracy,
                    ocr_completeness: ocrCompleteness,
                    data_integration: dataIntegration
                },
                final_score: finalScore,
                all_issues_resolved: allIssuesResolved,
                conclusion: allIssuesResolved ? 'PERFECT_SUCCESS' : finalScore >= 85 ? 'GOOD_SUCCESS' : 'NEEDS_IMPROVEMENT',
                user_feedback_resolution: {
                    scene_segmentation_fixed: sceneAccuracy.isPerfect,
                    ocr_completeness_restored: ocrCompleteness.isComplete,
                    data_integration_maintained: dataIntegration.isIntegrated
                }
            };
            
            fs.writeFileSync('./out/true-hybrid-v5-final-test-results.json', JSON.stringify(testResult, null, 2));
            console.log('\\n💾 FINAL 테스트 결과 저장: ./out/true-hybrid-v5-final-test-results.json');
            
            return testResult;
            
        } catch (error) {
            console.error('❌ FINAL 테스트 실행 실패:', error);
            throw error;
        }
    }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new FinalTester();
    tester.runFinalTest().catch(console.error);
}

export { FinalTester };