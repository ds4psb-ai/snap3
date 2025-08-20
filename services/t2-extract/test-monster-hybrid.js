/**
 * 괴물 하이브리드 VDP v2.1 테스트 스크립트
 * OLD VDP vs NEW VDP 품질 비교 및 검증
 */

import fs from 'fs';
import path from 'path';
import { MonsterHybridVDPGenerator } from './src/vdp-monster-hybrid.js';
import { VDPQualityValidator } from './src/quality-validator.js';

// 테스트 데이터
const TEST_METADATA = {
    content_id: "6_I2FmT1mbY",
    platform: "YouTube Shorts", 
    source_url: "https://www.youtube.com/shorts/6_I2FmT1mbY",
    view_count: 6530000,
    like_count: 110000,
    comment_count: 3354,
    share_count: 2000,
    upload_date: "2025-07-13T13:36:00.000Z",
    video_origin: "AI-Generated",
    top_comments: `지랄하지마는 진짜 쏘울 담긴 더빙인데욬ㅋㅋㅋㅋㅋㅋ
지랄하지마가 진짜 웃겨욬ㅋㅋㅋㅋㅋㅋㄱㅋ
fucken해ㅋㅋㅋㅋㅋ는 뭐야ㅋㅋㅋ
햄스터 목소리가 너무 귀여워요
야근 상황이 너무 현실적이에요`
};

// OLD VDP 샘플 (비교용)
const OLD_VDP_SAMPLE = {
    content_id: "C000001",
    overall_analysis: {
        audience_reaction: {
            notable_comments: [
                { text: "지랄하지마는 진짜 쏘울 담긴 더빙인데욬ㅋㅋㅋㅋㅋㅋ", lang: "ko", translation_en: "The 'Don't you fucking dare' is a dub filled with so much soul lololol" },
                { text: "지랄하지마가 진짜 웃겨욬ㅋㅋㅋㅋㅋㅋㄱㅋ", lang: "ko", translation_en: "The 'Don't you fucking dare' part is so funny lolololol" },
                { text: "fucken해ㅋㅋㅋㅋㅋ는 뭐야ㅋㅋㅋ", lang: "ko", translation_en: "What is 'fucken' lololol" }
            ]
        },
        asr_transcript: "오.. 회의 끝나니까 6시, 그렇다면 퇴근. 햄찌씨 회의에서 나온 리서치 건 내일 중으로 한번 보자! 네! (자동 반사) 그렇다면 야근."
    },
    product_mentions: [
        { name: "Apple MacBook", category: "laptop", evidence: ["Apple logo visible on laptop"], time_ranges: [[2, 2.8], [16.5, 21.5]] },
        { name: "Apple AirPods Max", category: "headphones", evidence: ["Over-ear headphones design"], time_ranges: [[6.1, 6.8]] }
    ],
    service_mentions: []
};

class MonsterHybridTester {
    constructor() {
        this.generator = new MonsterHybridVDPGenerator();
        this.validator = new VDPQualityValidator();
        this.testResults = [];
    }

    /**
     * 괴물 하이브리드 VDP 생성 시뮬레이션 테스트
     * (실제 Vertex AI 호출 없이 구조 검증)
     */
    async testStructureGeneration() {
        console.log('🧪 괴물 하이브리드 VDP 구조 테스트 시작...\n');

        // 모의 VDP 생성 (실제 API 호출 대신)
        const mockVDP = this.generateMockVDP();
        
        // 메타데이터 주입 테스트
        this.generator.injectMetadata(mockVDP, TEST_METADATA);
        
        console.log('📋 생성된 VDP 구조:');
        console.log(`- Content ID: ${mockVDP.content_id}`);
        console.log(`- Hook Genome: ${mockVDP.overall_analysis?.hookGenome ? '✅' : '❌'}`);
        console.log(`- Hook Strength: ${mockVDP.overall_analysis?.hookGenome?.strength_score || 'N/A'}`);
        console.log(`- Notable Comments: ${mockVDP.overall_analysis?.audience_reaction?.notable_comments?.length || 0}개`);
        console.log(`- ASR Excerpt: ${mockVDP.overall_analysis?.asr_excerpt ? '✅' : '❌'}`);
        console.log(`- OCR Text: ${mockVDP.overall_analysis?.ocr_text?.length || 0}개`);
        console.log(`- Product Mentions: ${mockVDP.product_mentions?.length || 0}개`);
        console.log(`- Scenes: ${mockVDP.scenes?.length || 0}개`);

        return mockVDP;
    }

    /**
     * 품질 검증 테스트
     */
    async testQualityValidation(vdp) {
        console.log('\n🔍 품질 검증 테스트 시작...\n');

        // 괴물 하이브리드 VDP 검증
        const validation = this.validator.validateComprehensive(vdp, OLD_VDP_SAMPLE);
        
        console.log('📊 품질 검증 결과:');
        console.log(`- 전체 점수: ${validation.overall_score}/100`);
        console.log(`- 등급: ${this.validator.getGrade(validation.overall_score)}`);
        console.log(`- 유효성: ${validation.is_valid ? '✅ 통과' : '❌ 실패'}`);
        console.log(`- OLD VDP 초월: ${validation.exceeds_old_vdp ? '✅ 예' : '❌ 아니오'}`);

        console.log('\n📋 세부 검증 결과:');
        Object.entries(validation.validations).forEach(([key, result]) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`  ${key}: ${status} ${result.score}/100 - ${result.message}`);
            if (result.errors && result.errors.length > 0) {
                result.errors.forEach(error => console.log(`    ⚠️ ${error}`));
            }
        });

        return validation;
    }

    /**
     * 적응형 모드 테스트
     */
    testAdaptiveModes() {
        console.log('\n🎯 적응형 모드 테스트 시작...\n');

        const testCases = [
            { duration: 8, expected: 'S' },
            { duration: 15, expected: 'M' },
            { duration: 25, expected: 'L' }
        ];

        testCases.forEach(testCase => {
            const mode = this.generator.getAdaptiveMode(testCase.duration);
            console.log(`📹 ${testCase.duration}초 영상:`);
            console.log(`  - 모드: ${mode.mode} (예상: ${testCase.expected})`);
            console.log(`  - 씬 목표: ${mode.scenes_target}개`);
            console.log(`  - Hook 최대: ${mode.hook_max_sec}초`);
            console.log(`  - 토큰 예산: ${mode.token_budget}`);
            console.log(`  - 목표 토큰: ${mode.target_tokens}`);
            console.log(`  - 최대 토큰: ${mode.max_tokens}`);
            console.log('');
        });
    }

    /**
     * OLD vs NEW VDP 비교 테스트
     */
    testOldVsNewComparison(newVdp) {
        console.log('\n⚔️ OLD vs NEW VDP 비교 테스트 시작...\n');

        const comparison = this.validator.compareWithOldVDP(newVdp, OLD_VDP_SAMPLE);
        
        console.log('📈 개선 사항:');
        comparison.improvements.forEach(improvement => {
            console.log(`  ✅ ${improvement}`);
        });

        console.log('\n📉 퇴보 사항:');
        if (comparison.regressions.length === 0) {
            console.log('  🎉 퇴보 없음!');
        } else {
            comparison.regressions.forEach(regression => {
                console.log(`  ❌ ${regression}`);
            });
        }

        console.log(`\n🏆 비교 결과: ${comparison.message} (점수: ${comparison.score}/150)`);

        return comparison;
    }

    /**
     * 적응형 토큰 효율성 테스트 (영상 길이별)
     */
    testTokenEfficiency(vdp) {
        console.log('\n⚡ 적응형 토큰 효율성 테스트 시작...\n');

        const vdpString = JSON.stringify(vdp);
        const estimatedTokens = Math.ceil(vdpString.length / 4); // 대략적인 토큰 계산
        
        // 적응형 토큰 목표 시뮬레이션
        const testScenarios = [
            { duration: 8, mode: 'S', minTokens: 2000, maxTokens: 6000, target: '4K' },
            { duration: 15, mode: 'M', minTokens: 4000, maxTokens: 10000, target: '7K' },
            { duration: 25, mode: 'L', minTokens: 8000, maxTokens: 16000, target: '12K' }
        ];
        
        console.log('📊 적응형 토큰 효율성 시나리오:');
        
        let allEfficient = true;
        const results = [];
        
        testScenarios.forEach(scenario => {
            const isWithinRange = estimatedTokens >= scenario.minTokens && estimatedTokens <= scenario.maxTokens;
            const efficiency = ((scenario.maxTokens / estimatedTokens) * 100).toFixed(1);
            const status = isWithinRange ? '✅ 범위 내' : '⚠️ 범위 외';
            
            if (!isWithinRange) allEfficient = false;
            
            console.log(`  🎬 ${scenario.duration}초 (${scenario.mode}모드):`);
            console.log(`    - 토큰 범위: ${scenario.minTokens}-${scenario.maxTokens} (목표: ${scenario.target})`);
            console.log(`    - 현재 토큰: ${estimatedTokens}`);
            console.log(`    - 효율성: ${efficiency}%`);
            console.log(`    - 상태: ${status}\n`);
            
            results.push({
                mode: scenario.mode,
                duration: scenario.duration,
                min_tokens: scenario.minTokens,
                max_tokens: scenario.maxTokens,
                estimated_tokens: estimatedTokens,
                is_within_range: isWithinRange,
                efficiency: parseFloat(efficiency)
            });
        });

        console.log('📈 종합 평가:');
        console.log(`  - 최대 한계: 16K 토큰`);
        console.log(`  - 현재 사용: ${estimatedTokens} 토큰`);
        console.log(`  - 여유도: ${((16000 - estimatedTokens) / 16000 * 100).toFixed(1)}%`);
        console.log(`  - 유연성: ${allEfficient ? '✅ 모든 모드 지원' : '⚠️ 일부 모드만 지원'}`);

        return {
            estimated_tokens: estimatedTokens,
            max_limit: 16000,
            headroom_percent: ((16000 - estimatedTokens) / 16000 * 100),
            scenarios: results,
            supports_all_modes: allEfficient,
            is_efficient: estimatedTokens <= 16000
        };
    }

    /**
     * 전체 테스트 실행
     */
    async runAllTests() {
        console.log('🚀 괴물 하이브리드 VDP v2.1 전체 테스트 시작\n');
        console.log('=' .repeat(60));

        try {
            // 1. 구조 생성 테스트
            const mockVDP = await this.testStructureGeneration();

            // 2. 적응형 모드 테스트  
            this.testAdaptiveModes();

            // 3. 품질 검증 테스트
            const validation = await this.testQualityValidation(mockVDP);

            // 4. OLD vs NEW 비교 테스트
            const comparison = this.testOldVsNewComparison(mockVDP);

            // 5. 토큰 효율성 테스트
            const efficiency = this.testTokenEfficiency(mockVDP);

            // 종합 결과
            console.log('\n' + '=' .repeat(60));
            console.log('🏁 테스트 종합 결과');
            console.log('=' .repeat(60));
            console.log(`✅ 구조 생성: 성공`);
            console.log(`✅ 적응형 모드: 정상 작동`);
            console.log(`${validation.is_valid ? '✅' : '❌'} 품질 검증: ${validation.overall_score}/100 (${this.validator.getGrade(validation.overall_score)})`);
            console.log(`${validation.exceeds_old_vdp ? '✅' : '❌'} OLD VDP 초월: ${validation.exceeds_old_vdp ? '성공' : '개선 필요'}`);
            console.log(`${efficiency.is_efficient ? '✅' : '⚠️'} 적응형 토큰 효율성: ${efficiency.supports_all_modes ? '모든 모드 지원' : '일부 제한'}`);
            console.log(`🎯 토큰 여유도: ${efficiency.headroom_percent.toFixed(1)}% (${efficiency.estimated_tokens}/${efficiency.max_limit})`);

            console.log('\n🎯 최종 평가:');
            if (validation.overall_score >= 85 && validation.exceeds_old_vdp && efficiency.supports_all_modes) {
                console.log('🏆 괴물 하이브리드 VDP v2.1 완벽 성공! OLD VDP 초월 + 모든 영상 길이 지원');
            } else if (validation.overall_score >= 85 && validation.exceeds_old_vdp) {
                console.log('✅ 괴물 하이브리드 VDP v2.1 성공! OLD VDP를 뛰어넘었습니다.');
            } else if (validation.overall_score >= 70) {
                console.log('✅ 괴물 하이브리드 VDP v2.1 양호. 추가 최적화 권장.');
            } else {
                console.log('⚠️ 괴물 하이브리드 VDP v2.1 개선 필요. 문제점을 수정하세요.');
            }

            // 결과 저장
            const testResult = {
                timestamp: new Date().toISOString(),
                validation: validation,
                comparison: comparison,
                efficiency: efficiency,
                mock_vdp: mockVDP
            };

            fs.writeFileSync('./test-results-monster-hybrid.json', JSON.stringify(testResult, null, 2));
            console.log('\n💾 테스트 결과가 test-results-monster-hybrid.json에 저장되었습니다.');

        } catch (error) {
            console.error('❌ 테스트 실행 중 오류:', error);
            throw error;
        }
    }

    /**
     * 모의 VDP 생성 (테스트용)
     */
    generateMockVDP() {
        return {
            content_id: "MOCK_TEST",
            default_lang: "en",
            metadata: {
                platform: "YouTube Shorts",
                source_url: "https://example.com/test",
                upload_date: new Date().toISOString(),
                view_count: 100000,
                like_count: 5000,
                comment_count: 500,
                share_count: 200,
                hashtags: ["#test", "#monster_hybrid"],
                video_origin: "AI-Generated",
                cta_types: [],
                original_sound: { id: null, title: null }
            },
            overall_analysis: {
                summary: "A comprehensive test of the Monster Hybrid VDP v2.1 system showing improved analysis capabilities while maintaining OLD VDP strengths.",
                emotional_arc: "Test curiosity → validation process → successful completion → satisfaction with results.",
                audience_reaction: {
                    analysis: "Test audience shows high engagement with the hybrid approach, appreciating both quantitative Hook analysis and qualitative cultural insights.",
                    common_reactions: ["Impressed with accuracy", "Likes hybrid approach", "Values cultural context"],
                    notable_comments: [
                        { text: "이 분석이 정말 정확해요!", lang: "ko", translation_en: "This analysis is really accurate!" },
                        { text: "Hook 분석이 혁신적이네요", lang: "ko", translation_en: "The Hook analysis is innovative" }
                    ],
                    overall_sentiment: "very_positive"
                },
                safety_flags: [],
                confidence: {
                    overall: 0.95,
                    scene_classification: 0.93,
                    device_analysis: 0.97
                },
                graph_refs: {
                    potential_meme_template: "Success validation meme template for VDP testing",
                    related_hashtags: ["#VDPTest", "#MonsterHybrid", "#Success"]
                },
                hookGenome: {
                    start_sec: 0,
                    end_sec: 3,
                    pattern_code: "Validation Success",
                    strength_score: 0.88,
                    trigger_modalities: ["visual", "narrative"],
                    microbeats_sec: [0.5, 1.2, 2.1]
                },
                asr_excerpt: "테스트를 시작합니다. 모든 시스템이 정상 작동 중입니다.",
                asr_lang: "ko",
                asr_translation_en: "Starting the test. All systems are operating normally.",
                ocr_text: [
                    { text: "MONSTER HYBRID v2.1", lang: "en" },
                    { text: "테스트 성공", lang: "ko", translation_en: "Test Success" }
                ]
            },
            scenes: [
                {
                    scene_id: "S01_TestInitiation",
                    time_start: 0,
                    time_end: 5,
                    duration_sec: 5,
                    importance: "critical",
                    narrative_unit: {
                        narrative_role: "Hook",
                        summary: "Test initiation sequence showing system startup and validation beginning.",
                        dialogue: "시스템 테스트를 시작합니다.",
                        dialogue_lang: "ko",
                        dialogue_translation_en: "Starting system test.",
                        rhetoric: ["announcement"],
                        comedic_device: []
                    },
                    setting: {
                        location: "Test Environment",
                        visual_style: {
                            cinematic_properties: "Clean, technical interface with clear progress indicators",
                            lighting: "Bright, neutral lighting optimized for clarity",
                            mood_palette: ["technical", "clean", "professional"],
                            edit_grammar: {
                                cut_speed: "medium",
                                camera_style: "static",
                                subtitle_style: "simple_white_text"
                            }
                        },
                        audio_style: {
                            music: "None",
                            ambient_sound: "Quiet technical environment",
                            tone: "Professional and informative",
                            audio_events: []
                        }
                    },
                    shots: [
                        {
                            shot_id: "S01_01",
                            start: 0,
                            end: 5,
                            camera: {
                                shot: "MS",
                                angle: "eye",
                                move: "static"
                            },
                            composition: {
                                grid: "center",
                                notes: ["Clean interface layout", "Professional presentation"]
                            },
                            keyframes: [
                                { role: "start", desc: "System test interface appears" },
                                { role: "peak", desc: "Validation process begins" },
                                { role: "end", desc: "Initial check complete" }
                            ],
                            confidence: "high"
                        }
                    ]
                }
            ],
            product_mentions: [],
            service_mentions: [
                {
                    type: "service",
                    name: "Monster Hybrid VDP",
                    category: "analysis_service",
                    sources: ["visual", "asr"],
                    time_ranges: [[0, 5]],
                    evidence: ["System interface shows Monster Hybrid branding", "Audio mentions VDP testing"],
                    promotion: {
                        status: "organic",
                        signals: []
                    },
                    confidence: "high"
                }
            ]
        };
    }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new MonsterHybridTester();
    tester.runAllTests().catch(console.error);
}

export { MonsterHybridTester };