#!/usr/bin/env node
/**
 * TRUE Hybrid VDP v5.0 UNIVERSAL 테스트
 * 범용 버전 품질 검증: 모든 영상에 적용 가능한 범용성 + 98/100 품질 유지
 */

import { TrueHybridUniversalVDPGenerator } from './src/true-hybrid-vdp-v5-universal.js';
import fs from 'fs';

// 테스트용 메타데이터 (실제 프로덕션에서는 외부에서 주입받음)
const TEST_METADATA = {
    content_id: "55e6ScXfiZc",
    platform: "YouTube Shorts",
    source_url: "https://www.youtube.com/shorts/55e6ScXfiZc",
    view_count: 0, // 실제로는 YouTube API에서 수집된 데이터
    like_count: 0,
    comment_count: 0,
    share_count: 0,
    upload_date: "2025-01-01T00:00:00.000Z",
    video_origin: "Real-Footage",
    hashtags: [], // 실제로는 YouTube API에서 추출된 해시태그
    cta_types: [],
    top_comments: [], // 실제로는 YouTube API에서 수집된 댓글
    original_sound: {
        id: null,
        title: null
    },
    youtube_api_data: {
        collected_at: new Date().toISOString(),
        api_source: "test_fallback" // 테스트용 표시
    }
};

class UniversalTester {
    constructor() {
        this.generator = new TrueHybridUniversalVDPGenerator();
    }

    /**
     * TRUE Hybrid VDP v5.0 UNIVERSAL 생성 테스트
     */
    async testUniversalGeneration() {
        console.log('🌐 TRUE Hybrid VDP v5.0 UNIVERSAL 생성 테스트 시작...\n');
        
        const gcsUri = "gs://tough-variety-raw/raw/ingest/55e6ScXfiZc.mp4";
        const estimatedDuration = 29;
        
        try {
            console.log(`🔄 GCS URI: ${gcsUri}`);
            console.log(`⏱️ 영상 길이: ${estimatedDuration}초\n`);
            
            const result = await this.generator.generateVDP(
                gcsUri, 
                TEST_METADATA, 
                estimatedDuration
            );
            
            console.log('✅ TRUE Hybrid VDP v5.0 UNIVERSAL 생성 성공!');
            console.log(`📊 모드: ${result.mode.mode}`);
            console.log(`🎯 목표 토큰: ${result.mode.target_tokens}`);
            console.log(`📈 실제 토큰: ${result.tokens_estimated}`);
            console.log(`🎬 장면 개수: ${result.validation.scene_count}`);
            console.log(`📝 OCR 개수: ${result.validation.ocr_count}`);
            console.log(`🔗 데이터 통합: ${result.validation.data_integration}`);
            console.log(`🏆 품질 수준: ${result.validation.quality_level}`);
            console.log(`💯 최종 점수: ${result.validation.score}/100\n`);
            
            // VDP 저장
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputPath = `./out/true-hybrid-v5-universal-${timestamp}.json`;
            fs.writeFileSync(outputPath, JSON.stringify(result.vdp, null, 2));
            console.log(`💾 VDP 저장: ${outputPath}\n`);
            
            return result.vdp;
            
        } catch (error) {
            console.error('❌ UNIVERSAL 테스트 실패:', error.message);
            throw error;
        }
    }

    /**
     * 범용성 검증: 특정 영상 내용 가이드 제거 확인
     */
    validateUniversality(vdp) {
        console.log('🌍 범용성 검증 (특정 영상 내용 제거):');
        
        let score = 100;
        const universalityIssues = [];
        
        // 1. 특정 영상 전용 장면 ID 체크 (이전 v5.0 FINAL에서 문제였던 부분)
        const specificSceneIds = [
            'S01_TheAssignment',
            'S02_OvertimeVow', 
            'S03_WorkCompletion',
            'S04_TheRally',
            'S05_TheTwist'
        ];
        
        let hasSpecificIds = false;
        if (vdp.scenes) {
            vdp.scenes.forEach(scene => {
                if (specificSceneIds.includes(scene.scene_id)) {
                    hasSpecificIds = true;
                    universalityIssues.push(`특정 영상 전용 장면 ID: ${scene.scene_id}`);
                }
            });
        }
        
        if (hasSpecificIds) {
            score -= 50;
            console.log(`  ❌ 특정 영상 전용 장면 ID 발견 (-50점)`);
        } else {
            console.log(`  ✅ 범용 장면 ID 사용 (특정 영상 내용 제거됨)`);
        }
        
        // 2. 장면 분할 논리 확인 (범용 규칙 적용 여부)
        let sceneCount = vdp.scenes?.length || 0;
        if (sceneCount >= 3 && sceneCount <= 6) {
            console.log(`  ✅ 적절한 장면 분할: ${sceneCount}개 장면 (범용 규칙 적용)`);
        } else {
            score -= 20;
            console.log(`  ⚠️ 장면 분할 범위 벗어남: ${sceneCount}개 (권장: 3-6개)`);
        }
        
        // 3. OCR 텍스트 캡처 능력 확인
        const ocrTexts = vdp.overall_analysis?.ocr_text || [];
        if (ocrTexts.length > 0) {
            console.log(`  ✅ OCR 텍스트 캡처 기능: ${ocrTexts.length}개 텍스트 발견`);
            
            // 언어 태그 확인
            const hasLangTags = ocrTexts.every(item => item.lang);
            if (hasLangTags) {
                console.log(`  ✅ 다국어 지원: 모든 텍스트에 언어 태그 적용`);
            } else {
                score -= 10;
                console.log(`  ⚠️ 언어 태그 부족: 다국어 지원 미완성`);
            }
        } else {
            score -= 30;
            console.log(`  ❌ OCR 텍스트 캡처 실패`);
        }
        
        // 4. Hook Genome 연결 범용성 확인
        const hook = vdp.overall_analysis?.hookGenome;
        if (hook && hook.connected_scene_id) {
            // 첫 번째 장면과 연결되었는지 확인 (범용 로직)
            const firstSceneId = vdp.scenes?.[0]?.scene_id;
            if (hook.connected_scene_id === firstSceneId) {
                console.log(`  ✅ Hook-Scene 범용 연결: 첫 번째 장면 ${firstSceneId}와 연결`);
            } else {
                score -= 15;
                console.log(`  ⚠️ Hook-Scene 연결 오류: ${hook.connected_scene_id} vs ${firstSceneId}`);
            }
        } else {
            score -= 25;
            console.log(`  ❌ Hook Genome 연결 누락`);
        }
        
        console.log(`\n  📊 범용성 점수: ${score}/100`);
        
        if (universalityIssues.length > 0) {
            console.log(`  🚨 범용성 문제점:`);
            universalityIssues.forEach(issue => {
                console.log(`      - ${issue}`);
            });
        }
        
        console.log('');
        return { 
            score, 
            isUniversal: score >= 90, 
            issues: universalityIssues,
            sceneCount,
            ocrCount: ocrTexts.length
        };
    }

    /**
     * 품질 유지 검증: v5.0 FINAL 대비 품질 손실 없음 확인
     */
    validateQualityMaintenance(vdp) {
        console.log('🏆 품질 유지 검증 (v5.0 FINAL 수준 유지):');
        
        let score = 0;
        const maxScore = 100;
        
        // 1. 장면 분할 품질 (적응형 기준)
        const sceneCount = vdp.scenes?.length || 0;
        if (sceneCount >= 4 && sceneCount <= 6) {
            score += 25;
            console.log(`  ✅ 장면 분할 품질: ${sceneCount}개 장면 (+25점)`);
        } else if (sceneCount >= 3) {
            score += 15;
            console.log(`  ⚠️ 장면 분할 수용 범위: ${sceneCount}개 장면 (+15점)`);
        } else {
            console.log(`  ❌ 장면 분할 부족: ${sceneCount}개 장면`);
        }
        
        // 2. OCR 완전성
        const ocrTexts = vdp.overall_analysis?.ocr_text || [];
        if (ocrTexts.length >= 10) {
            score += 25;
            console.log(`  ✅ OCR 완전성 우수: ${ocrTexts.length}개 텍스트 (+25점)`);
        } else if (ocrTexts.length >= 5) {
            score += 15;
            console.log(`  ⚠️ OCR 기본 수준: ${ocrTexts.length}개 텍스트 (+15점)`);
        } else {
            console.log(`  ❌ OCR 부족: ${ocrTexts.length}개 텍스트`);
        }
        
        // 3. 데이터 통합
        const hook = vdp.overall_analysis?.hookGenome;
        if (hook && hook.connected_scene_id && hook.hook_integration_analysis) {
            if (hook.hook_integration_analysis.length >= 120) {
                score += 25;
                console.log(`  ✅ 데이터 통합 완전: Hook 분석 ${hook.hook_integration_analysis.length} chars (+25점)`);
            } else {
                score += 15;
                console.log(`  ⚠️ 데이터 통합 기본: Hook 분석 ${hook.hook_integration_analysis.length} chars (+15점)`);
            }
        } else {
            console.log(`  ❌ 데이터 통합 실패`);
        }
        
        // 4. 분석 깊이
        let depthScore = 0;
        if (vdp.scenes) {
            vdp.scenes.forEach((scene, index) => {
                let sceneDepth = 0;
                
                // cinematic_properties 깊이
                if (scene.setting?.visual_style?.cinematic_properties?.length >= 250) {
                    sceneDepth += 5;
                }
                
                // 서사 분석 깊이 (코미디 콘텐츠의 경우)
                if (scene.narrative_unit?.comedic_analysis?.length >= 120) {
                    sceneDepth += 3;
                }
                if (scene.narrative_unit?.rhetoric_analysis?.length >= 120) {
                    sceneDepth += 2;
                }
                
                depthScore += Math.min(sceneDepth, 5); // 장면당 최대 5점
            });
        }
        
        const maxDepthScore = Math.min(sceneCount * 5, 25);
        score += Math.min(depthScore, 25);
        console.log(`  📊 분석 깊이: ${depthScore}/${maxDepthScore} (+${Math.min(depthScore, 25)}점)`);
        
        console.log(`\n  📊 품질 유지 점수: ${score}/${maxScore}`);
        console.log('');
        
        return { 
            score, 
            maxScore, 
            isQualityMaintained: score >= 80,
            sceneQuality: sceneCount >= 4 ? 'excellent' : sceneCount >= 3 ? 'good' : 'poor',
            ocrQuality: ocrTexts.length >= 10 ? 'excellent' : ocrTexts.length >= 5 ? 'good' : 'poor',
            integrationQuality: hook?.hook_integration_analysis?.length >= 120 ? 'excellent' : 'basic'
        };
    }

    /**
     * 전체 UNIVERSAL 테스트 실행
     */
    async runUniversalTest() {
        console.log('🌐 TRUE Hybrid VDP v5.0 UNIVERSAL 최종 검증');
        console.log('='.repeat(80));
        console.log(`📹 테스트 영상: ${TEST_METADATA.content_id} (외부 메타데이터 주입 방식)`);
        console.log(`👀 조회수: ${TEST_METADATA.view_count.toLocaleString()}`);
        console.log(`❤️ 좋아요: ${TEST_METADATA.like_count.toLocaleString()}`);
        console.log('\n🎯 범용성 + 품질 유지 검증:');
        console.log('  1. 특정 영상 전용 가이드 완전 제거 (범용성)');
        console.log('  2. v5.0 FINAL 수준 품질 유지 (98/100)');
        console.log('  3. 모든 영상에 적용 가능한 범용 로직');
        console.log('');

        try {
            // 1. UNIVERSAL VDP 생성
            const universalVdp = await this.testUniversalGeneration();
            
            // 2. 범용성 검증
            const universality = this.validateUniversality(universalVdp);
            
            // 3. 품질 유지 검증
            const qualityMaintenance = this.validateQualityMaintenance(universalVdp);
            
            // 4. 최종 평가
            const finalScore = Math.round(
                (universality.score * 0.6) + 
                (qualityMaintenance.score * 0.4)
            );
            
            const isSuccess = universality.isUniversal && qualityMaintenance.isQualityMaintained;
            
            console.log('🌐 TRUE Hybrid VDP v5.0 UNIVERSAL 최종 평가');
            console.log('='.repeat(70));
            console.log(`🌍 범용성 (특정 영상 제거): ${universality.score}/100 ${universality.isUniversal ? '✅' : '❌'}`);
            console.log(`🏆 품질 유지 (v5.0 FINAL 수준): ${qualityMaintenance.score}/100 ${qualityMaintenance.isQualityMaintained ? '✅' : '❌'}`);
            console.log('-'.repeat(50));
            console.log(`🎯 최종 점수: ${finalScore}/100`);
            console.log('');
            
            if (finalScore >= 95 && isSuccess) {
                console.log('🎉🎉🎉 TRUE Hybrid UNIVERSAL 완전 성공! 범용성 + 품질 100% 달성! 🎉🎉🎉');
                console.log('✅ 특정 영상 가이드 완전 제거 ✅ 98/100 품질 유지 ✅ 모든 영상 적용 가능');
            } else if (finalScore >= 85) {
                console.log('✅ TRUE Hybrid UNIVERSAL 성공! 범용성과 품질 대부분 달성');
                if (!universality.isUniversal) {
                    console.log('⚠️ 범용성 추가 개선 필요');
                    if (universality.issues.length > 0) {
                        console.log(`   문제점: ${universality.issues.join(', ')}`);
                    }
                }
                if (!qualityMaintenance.isQualityMaintained) {
                    console.log('⚠️ 품질 수준 추가 조정 필요');
                }
            } else {
                console.log('⚠️ 추가 개선 필요. 범용성 또는 품질 기준 미달');
            }
            
            // 결과 저장
            const testResult = {
                timestamp: new Date().toISOString(),
                metadata: TEST_METADATA,
                universal_vdp: universalVdp,
                validations: {
                    universality: universality,
                    quality_maintenance: qualityMaintenance
                },
                final_score: finalScore,
                is_success: isSuccess,
                conclusion: isSuccess ? 'UNIVERSAL_SUCCESS' : finalScore >= 85 ? 'PARTIAL_SUCCESS' : 'NEEDS_IMPROVEMENT',
                user_requirement_fulfillment: {
                    universality_achieved: universality.isUniversal,
                    quality_maintained: qualityMaintenance.isQualityMaintained,
                    no_video_specific_guides: universality.issues.length === 0
                }
            };
            
            fs.writeFileSync('./out/true-hybrid-v5-universal-test-results.json', JSON.stringify(testResult, null, 2));
            console.log('\n💾 UNIVERSAL 테스트 결과 저장: ./out/true-hybrid-v5-universal-test-results.json');
            
            return testResult;
            
        } catch (error) {
            console.error('❌ UNIVERSAL 테스트 실행 실패:', error);
            throw error;
        }
    }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new UniversalTester();
    tester.runUniversalTest().catch(console.error);
}

export { UniversalTester };