#!/usr/bin/env node
/**
 * 실제 영상으로 Monster Hybrid VDP v2.1 테스트
 * OLD VDP vs NEW Monster Hybrid 성능 비교
 */

import { MonsterHybridVDPGenerator } from './src/vdp-monster-hybrid.js';
import { VDPQualityValidator } from './src/quality-validator.js';
import fs from 'fs';

// 실제 테스트 메타데이터 (6_I2FmT1mbY 영상)
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

// OLD VDP 결과 (비교 기준)
const OLD_VDP_REFERENCE = {
    content_id: "6_I2FmT1mbY",
    overall_analysis: {
        summary: "A hamster office worker receives a sudden overtime request and reacts with relatable frustration, creating viral comedy through the contrast between cute appearance and harsh language.",
        emotional_arc: "Normal work day → Sudden overtime shock → Frustrated outburst → Relatable comedy peak",
        audience_reaction: {
            analysis: "Viewers find explosive humor in the hamster's unexpected profanity and relatable office frustration. The cute character saying harsh words creates perfect comedic contrast.",
            notable_comments: [
                { text: "지랄하지마는 진짜 쏘울 담긴 더빙인데욬ㅋㅋㅋㅋㅋㅋ", lang: "ko", translation_en: "The 'Don't you fucking dare' is a dub filled with so much soul lololol" },
                { text: "햄스터 목소리가 너무 귀여워요", lang: "ko", translation_en: "The hamster voice is so cute" }
            ],
            overall_sentiment: "Very positive and hilarious"
        },
        asr_transcript: "오.. 회의 끝나니까 6시, 그렇다면 퇴근. 햄찌씨 회의에서 나온 리서치 건 내일 중으로 한번 보자! 네! (자동 반사) 그렇다면 야근.",
        confidence: { overall: 0.95, scene_classification: 0.93, device_analysis: 0.97 }
    },
    scenes: [
        {
            scene_id: "S01_OfficeEnd", 
            time_start: 0, time_end: 8,
            narrative_unit: {
                narrative_role: "Hook Setup",
                dialogue: "오.. 회의 끝나니까 6시, 그렇다면 퇴근.",
                comedic_device: ["character_contrast", "expectation_subversion"]
            }
        }
    ]
};

class RealVideoTester {
    constructor() {
        this.generator = new MonsterHybridVDPGenerator();
        this.validator = new VDPQualityValidator();
    }

    /**
     * 실제 영상으로 Monster Hybrid VDP 생성 테스트
     */
    async testRealVideoGeneration() {
        console.log('🎬 실제 영상 Monster Hybrid VDP 생성 테스트 시작...\n');
        
        const gcsUri = "gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4";
        const estimatedDuration = 8; // 햄스터 영상은 8초
        
        try {
            console.log(`🔄 GCS URI: ${gcsUri}`);
            console.log(`⏱️ 예상 길이: ${estimatedDuration}초\n`);
            
            // Monster Hybrid VDP 생성
            const result = await this.generator.generateVDP(
                gcsUri, 
                REAL_TEST_METADATA, 
                estimatedDuration
            );
            
            console.log('✅ Monster Hybrid VDP 생성 성공!');
            console.log(`📊 모드: ${result.mode.mode}`);
            console.log(`🎯 목표 토큰: ${result.mode.target_tokens}`);
            console.log(`📈 실제 토큰: ${result.tokens_estimated}`);
            console.log(`🔍 검증 결과: ${result.validation.isValid ? '통과' : '실패'}\n`);
            
            // VDP 저장
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputPath = `./out/real-monster-hybrid-${timestamp}.json`;
            fs.writeFileSync(outputPath, JSON.stringify(result.vdp, null, 2));
            console.log(`💾 VDP 저장: ${outputPath}\n`);
            
            return result.vdp;
            
        } catch (error) {
            console.error('❌ 실제 영상 테스트 실패:', error.message);
            console.error('스택:', error.stack);
            throw error;
        }
    }

    /**
     * OLD VDP vs Monster Hybrid 상세 비교
     */
    compareWithOldVDP(monsterVdp) {
        console.log('⚔️ OLD VDP vs Monster Hybrid 상세 비교 시작...\n');
        
        const comparison = {
            cultural_analysis: this.compareCulturalAnalysis(monsterVdp),
            audience_insights: this.compareAudienceInsights(monsterVdp),
            technical_depth: this.compareTechnicalDepth(monsterVdp),
            hook_innovation: this.evaluateHookInnovation(monsterVdp),
            overall_score: 0
        };
        
        // 종합 점수 계산
        comparison.overall_score = Math.round(
            (comparison.cultural_analysis.score * 0.25) +
            (comparison.audience_insights.score * 0.25) + 
            (comparison.technical_depth.score * 0.25) +
            (comparison.hook_innovation.score * 0.25)
        );
        
        this.printComparisonResults(comparison);
        return comparison;
    }

    /**
     * 문화적 분석 비교
     */
    compareCulturalAnalysis(monsterVdp) {
        console.log('🎭 문화적 분석력 비교:');
        
        const oldVdpKoreanNuance = OLD_VDP_REFERENCE.overall_analysis.asr_transcript;
        const newVdpKoreanNuance = 
            (typeof monsterVdp.overall_analysis?.asr_transcript === 'string' ? monsterVdp.overall_analysis.asr_transcript : '') ||
            (typeof monsterVdp.overall_analysis?.asr_transcript?.text === 'string' ? monsterVdp.overall_analysis.asr_transcript.text : '') ||
            (typeof monsterVdp.asr_transcript === 'string' ? monsterVdp.asr_transcript : '') || '';
        
        const oldCommentDepth = OLD_VDP_REFERENCE.overall_analysis.audience_reaction.notable_comments.length;
        const newCommentDepth = monsterVdp.overall_analysis?.audience_reaction?.notable_comments?.length || 
                               monsterVdp.audience_reaction?.notable_comments?.length || 
                               monsterVdp.comments?.length || 0;
        
        let score = 70; // 기본점수
        
        // 한국어 뉘앙스 보존
        if (newVdpKoreanNuance.includes('야근') || newVdpKoreanNuance.includes('회의')) {
            score += 15;
            console.log('  ✅ 한국어 업무 용어 보존 (+15점)');
        }
        
        // 댓글 분석 깊이
        if (newCommentDepth >= oldCommentDepth) {
            score += 10;
            console.log('  ✅ 댓글 분석 깊이 유지 (+10점)');
        } else {
            console.log(`  ⚠️ 댓글 분석 감소 (${oldCommentDepth} → ${newCommentDepth})`);
        }
        
        // 감정 아크 분석
        const emotionalArc = typeof monsterVdp.overall_analysis?.emotional_arc === 'string' ? 
            monsterVdp.overall_analysis.emotional_arc : 
            (monsterVdp.overall_analysis?.emotional_arc?.text || '');
        
        if (emotionalArc.includes('shock') || emotionalArc.includes('frustrated') || 
            emotionalArc.includes('Shock') || emotionalArc.includes('Panic')) {
            score += 10;
            console.log('  ✅ 감정 아크 정교함 (+10점)');
        }
        
        score = Math.min(score, 100);
        console.log(`  📊 문화적 분석력 점수: ${score}/100\n`);
        
        return { score, details: `한국어 뉘앙스 및 문화적 맥락 분석` };
    }

    /**
     * 관객 인사이트 비교
     */
    compareAudienceInsights(monsterVdp) {
        console.log('👥 관객 인사이트 비교:');
        
        let score = 70;
        
        const audienceReaction = monsterVdp.overall_analysis?.audience_reaction;
        
        if (audienceReaction) {
            // 심리적 분석 깊이
            if (audienceReaction.analysis && audienceReaction.analysis.length > 100) {
                score += 15;
                console.log('  ✅ 관객 심리 분석 상세 (+15점)');
            }
            
            // 댓글 원문 보존
            const hasOriginalComments = audienceReaction.notable_comments?.some(
                comment => comment.lang === 'ko' && comment.text
            );
            if (hasOriginalComments) {
                score += 10;
                console.log('  ✅ 댓글 원문 보존 (+10점)');
            }
            
            // 일반적 반응 패턴
            if (audienceReaction.common_reactions && audienceReaction.common_reactions.length >= 3) {
                score += 10;
                console.log('  ✅ 반응 패턴 분석 (+10점)');
            }
        }
        
        score = Math.min(score, 100);
        console.log(`  📊 관객 인사이트 점수: ${score}/100\n`);
        
        return { score, details: `관객 반응 심리 분석 및 댓글 보존` };
    }

    /**
     * 기술적 깊이 비교
     */
    compareTechnicalDepth(monsterVdp) {
        console.log('🔧 기술적 분석 깊이 비교:');
        
        let score = 70;
        
        // 씬 분석 상세도
        const scenes = monsterVdp.scenes || [];
        if (scenes.length > 0) {
            const firstScene = scenes[0];
            
            // 샷 분석
            if (firstScene.shots && firstScene.shots.length > 0) {
                score += 10;
                console.log('  ✅ 샷 단위 분석 (+10점)');
                
                // 키프레임 분석
                const shot = firstScene.shots[0];
                if (shot.keyframes && shot.keyframes.length >= 2) {
                    score += 10;
                    console.log('  ✅ 키프레임 분석 (+10점)');
                }
                
                // 카메라 메타데이터
                if (shot.camera && shot.camera.shot && shot.camera.angle && shot.camera.move) {
                    score += 10;
                    console.log('  ✅ 카메라 메타데이터 완성 (+10점)');
                }
            }
        }
        
        score = Math.min(score, 100);
        console.log(`  📊 기술적 깊이 점수: ${score}/100\n`);
        
        return { score, details: `씬/샷/키프레임 기술적 분석 깊이` };
    }

    /**
     * Hook Genome 혁신 평가
     */
    evaluateHookInnovation(monsterVdp) {
        console.log('🧬 Hook Genome 혁신 평가:');
        
        let score = 0; // Hook Genome은 새로운 기능이므로 0에서 시작
        
        // hookGenome 또는 hook_genome 둘 다 체크
        const hookGenome = monsterVdp.overall_analysis?.hookGenome || monsterVdp.overall_analysis?.hook_genome;
        
        if (hookGenome) {
            score += 30;
            console.log('  ✅ Hook Genome 구현 (+30점)');
            
            // Hook 타이밍 정확성
            if (hookGenome.start_sec <= 3) {
                score += 20;
                console.log(`  ✅ Hook 타이밍 적절 (${hookGenome.start_sec}s ≤ 3s) (+20점)`);
            }
            
            // 강도 점수
            if (hookGenome.strength_score >= 0.70) {
                score += 20;
                console.log(`  ✅ Hook 강도 우수 (${hookGenome.strength_score} ≥ 0.70) (+20점)`);
            }
            
            // 패턴 코드 분석
            if (hookGenome.pattern_code) {
                score += 15;
                console.log(`  ✅ 바이럴 패턴 식별: "${hookGenome.pattern_code}" (+15점)`);
            }
            
            // 자극 방식 분석
            if (hookGenome.trigger_modalities && hookGenome.trigger_modalities.length > 0) {
                score += 15;
                console.log(`  ✅ 자극 방식 분석: ${hookGenome.trigger_modalities.join(', ')} (+15점)`);
            }
        } else {
            console.log('  ❌ Hook Genome 누락');
        }
        
        score = Math.min(score, 100);
        console.log(`  📊 Hook Genome 혁신 점수: ${score}/100\n`);
        
        return { score, details: `정량적 바이럴 DNA 분석 신기능` };
    }

    /**
     * 비교 결과 출력
     */
    printComparisonResults(comparison) {
        console.log('🏆 OLD VDP vs Monster Hybrid 최종 비교 결과');
        console.log('=' .repeat(60));
        console.log(`📚 문화적 분석력: ${comparison.cultural_analysis.score}/100`);
        console.log(`👥 관객 인사이트: ${comparison.audience_insights.score}/100`);
        console.log(`🔧 기술적 깊이: ${comparison.technical_depth.score}/100`);
        console.log(`🧬 Hook Genome 혁신: ${comparison.hook_innovation.score}/100`);
        console.log('-' .repeat(40));
        console.log(`🎯 종합 점수: ${comparison.overall_score}/100`);
        console.log('');
        
        if (comparison.overall_score >= 90) {
            console.log('🏆 Monster Hybrid 완승! OLD VDP를 크게 뛰어넘었습니다!');
        } else if (comparison.overall_score >= 80) {
            console.log('✅ Monster Hybrid 승리! OLD VDP를 개선했습니다.');
        } else if (comparison.overall_score >= 70) {
            console.log('⚖️ Monster Hybrid 선전! OLD VDP와 비슷한 수준입니다.');
        } else {
            console.log('⚠️ 개선 필요. OLD VDP가 여전히 우세합니다.');
        }
        console.log('');
    }

    /**
     * 전체 실제 테스트 실행
     */
    async runRealTest() {
        console.log('🚀 Monster Hybrid VDP v2.1 실제 영상 테스트 시작');
        console.log('=' .repeat(70));
        console.log(`📹 테스트 영상: ${REAL_TEST_METADATA.content_id} (햄스터 야근)`);
        console.log(`👀 조회수: ${REAL_TEST_METADATA.view_count.toLocaleString()}`);
        console.log(`❤️ 좋아요: ${REAL_TEST_METADATA.like_count.toLocaleString()}`);
        console.log(`💬 댓글: ${REAL_TEST_METADATA.comment_count.toLocaleString()}`);
        console.log('');

        try {
            // 1. Monster Hybrid VDP 생성
            const monsterVdp = await this.testRealVideoGeneration();
            
            // 2. OLD VDP와 비교
            const comparison = this.compareWithOldVDP(monsterVdp);
            
            // 3. 품질 검증
            const validation = this.validator.validateComprehensive(monsterVdp, OLD_VDP_REFERENCE);
            
            console.log('📋 최종 품질 검증:');
            console.log(`  - 스키마 유효성: ${validation.is_valid ? '✅ 통과' : '❌ 실패'}`);
            console.log(`  - 품질 점수: ${validation.overall_score}/100`);
            console.log(`  - OLD VDP 초월: ${validation.exceeds_old_vdp ? '✅ 성공' : '❌ 미달'}`);
            console.log('');
            
            // 결과 저장
            const testResult = {
                timestamp: new Date().toISOString(),
                metadata: REAL_TEST_METADATA,
                monster_vdp: monsterVdp,
                comparison: comparison,
                validation: validation,
                conclusion: comparison.overall_score >= 80 ? 'SUCCESS' : 'NEEDS_IMPROVEMENT'
            };
            
            fs.writeFileSync('./out/real-test-results.json', JSON.stringify(testResult, null, 2));
            console.log('💾 전체 테스트 결과 저장: ./out/real-test-results.json');
            
        } catch (error) {
            console.error('❌ 실제 테스트 실행 실패:', error);
            throw error;
        }
    }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new RealVideoTester();
    tester.runRealTest().catch(console.error);
}

export { RealVideoTester };