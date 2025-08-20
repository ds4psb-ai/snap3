/**
 * 괴물 하이브리드 VDP v2.1 품질 검증 시스템
 * OLD VDP를 "넘어섰는지" 자동 판정 (로컬 QA)
 */

import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VDPQualityValidator {
    constructor() {
        this.ajv = new Ajv({ allErrors: true, verbose: true });
        this.schema = null;
        this.loadSchema();
    }

    /**
     * Monster Hybrid 스키마 로드
     */
    loadSchema() {
        try {
            const schemaPath = path.join(__dirname, '../schemas/vdp-monster-hybrid-v2.1.schema.json');
            this.schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
            this.validate = this.ajv.compile(this.schema);
            console.log('✅ Monster Hybrid 스키마 로드 완료');
        } catch (error) {
            console.error('❌ 스키마 로드 실패:', error.message);
            throw error;
        }
    }

    /**
     * 종합 품질 검증
     * @param {object} vdp - 검증할 VDP 객체
     * @param {object} oldVdp - 비교 대상 OLD VDP (선택적)
     * @returns {object} 검증 결과
     */
    validateComprehensive(vdp, oldVdp = null) {
        const results = {
            timestamp: new Date().toISOString(),
            overall_score: 0,
            is_valid: false,
            exceeds_old_vdp: false,
            validations: {}
        };

        try {
            // 1. JSON 스키마 검증
            results.validations.schema = this.validateSchema(vdp);

            // 2. Hook Genome 품질 검증
            results.validations.hook_quality = this.validateHookQuality(vdp);

            // 3. 관객 인사이트 품질 검증
            results.validations.audience_insights = this.validateAudienceInsights(vdp);

            // 4. ASR/OCR 증거 품질 검증
            results.validations.evidence_quality = this.validateEvidenceQuality(vdp);

            // 5. 브랜드/제품 분석 품질 검증
            results.validations.brand_analysis = this.validateBrandAnalysis(vdp);

            // 6. 씬 분석 상세도 검증
            results.validations.scene_analysis = this.validateSceneAnalysis(vdp);

            // 7. OLD VDP 대비 비교 (선택적)
            if (oldVdp) {
                results.validations.old_vdp_comparison = this.compareWithOldVDP(vdp, oldVdp);
            }

            // 종합 점수 계산
            results.overall_score = this.calculateOverallScore(results.validations);
            results.is_valid = results.overall_score >= 70;
            results.exceeds_old_vdp = results.overall_score >= 85;

            return results;

        } catch (error) {
            console.error('❌ 품질 검증 중 오류:', error);
            results.validations.error = {
                score: 0,
                passed: false,
                message: error.message
            };
            return results;
        }
    }

    /**
     * JSON 스키마 검증
     */
    validateSchema(vdp) {
        const isValid = this.validate(vdp);
        return {
            score: isValid ? 100 : 0,
            passed: isValid,
            errors: isValid ? [] : this.validate.errors || [],
            message: isValid ? '스키마 검증 통과' : '스키마 검증 실패'
        };
    }

    /**
     * Hook Genome 품질 검증
     */
    validateHookQuality(vdp) {
        const errors = [];
        let score = 100;

        const hook = vdp.overall_analysis?.hookGenome;
        if (!hook) {
            return { score: 0, passed: false, errors: ['Hook Genome 누락'], message: 'Hook Genome 필수' };
        }

        // Hook 타이밍 검증 (≤3s)
        if (hook.start_sec > 3.0) {
            errors.push(`Hook start_sec (${hook.start_sec}) > 3.0s`);
            score -= 30;
        }

        // Hook 강도 검증 (≥0.70)
        if (hook.strength_score < 0.70) {
            errors.push(`Hook strength_score (${hook.strength_score}) < 0.70`);
            score -= 40;
        }

        // 필수 필드 검증
        if (!hook.pattern_code) {
            errors.push('pattern_code 누락');
            score -= 15;
        }
        if (!hook.end_sec) {
            errors.push('end_sec 누락');
            score -= 15;
        }

        return {
            score: Math.max(0, score),
            passed: errors.length === 0,
            errors: errors,
            message: errors.length === 0 ? 'Hook 품질 우수' : `Hook 품질 이슈 ${errors.length}개`
        };
    }

    /**
     * 관객 인사이트 품질 검증
     */
    validateAudienceInsights(vdp) {
        const errors = [];
        let score = 100;

        const reaction = vdp.overall_analysis?.audience_reaction;
        if (!reaction) {
            return { score: 0, passed: false, errors: ['audience_reaction 누락'], message: '관객 반응 분석 필수' };
        }

        // 분석 깊이 검증
        if (!reaction.analysis || reaction.analysis.length < 100) {
            errors.push('관객 반응 분석이 너무 짧음 (<100자)');
            score -= 25;
        }

        // 댓글 품질 검증 (≤3개, 원문 + 언어코드)
        if (!reaction.notable_comments || reaction.notable_comments.length === 0) {
            errors.push('주목할 만한 댓글 없음');
            score -= 20;
        } else if (reaction.notable_comments.length > 3) {
            errors.push(`댓글 개수 초과: ${reaction.notable_comments.length}/3`);
            score -= 15;
        } else {
            // 댓글 구조 검증
            reaction.notable_comments.forEach((comment, i) => {
                if (!comment.text || !comment.lang) {
                    errors.push(`댓글 ${i+1}: text 또는 lang 누락`);
                    score -= 10;
                }
            });
        }

        // 일반적 반응 검증
        if (!reaction.common_reactions || reaction.common_reactions.length === 0) {
            errors.push('일반적 반응 분석 없음');
            score -= 15;
        } else if (reaction.common_reactions.length > 5) {
            errors.push(`일반적 반응 개수 초과: ${reaction.common_reactions.length}/5`);
            score -= 10;
        }

        return {
            score: Math.max(0, score),
            passed: errors.length === 0,
            errors: errors,
            message: errors.length === 0 ? '관객 인사이트 우수' : `관객 인사이트 이슈 ${errors.length}개`
        };
    }

    /**
     * ASR/OCR 증거 품질 검증
     */
    validateEvidenceQuality(vdp) {
        const errors = [];
        let score = 100;

        const analysis = vdp.overall_analysis;
        if (!analysis) {
            return { score: 0, passed: false, errors: ['overall_analysis 누락'], message: '전체 분석 필수' };
        }

        // ASR 증거 검증
        if (analysis.asr_excerpt) {
            const sentences = analysis.asr_excerpt.split(/[.!?]/).filter(s => s.trim().length > 0);
            if (sentences.length < 2 || sentences.length > 4) {
                errors.push(`ASR excerpt 문장수 부적절: ${sentences.length} (목표: 2-4문장)`);
                score -= 15;
            }
        } else {
            console.log('⚠️ ASR excerpt 없음 (영상에 음성이 없을 수 있음)');
        }

        // OCR 증거 검증
        if (analysis.ocr_text) {
            if (analysis.ocr_text.length > 5) {
                errors.push(`OCR 텍스트 개수 초과: ${analysis.ocr_text.length}/5`);
                score -= 15;
            }
            
            // OCR 구조 검증
            analysis.ocr_text.forEach((ocr, i) => {
                if (!ocr.text || !ocr.lang) {
                    errors.push(`OCR ${i+1}: text 또는 lang 누락`);
                    score -= 10;
                }
            });
        }

        return {
            score: Math.max(0, score),
            passed: errors.length === 0,
            errors: errors,
            message: errors.length === 0 ? 'ASR/OCR 증거 우수' : `증거 품질 이슈 ${errors.length}개`
        };
    }

    /**
     * 브랜드/제품 분석 품질 검증
     */
    validateBrandAnalysis(vdp) {
        const errors = [];
        let score = 100;

        const productMentions = vdp.product_mentions || [];
        const serviceMentions = vdp.service_mentions || [];
        const totalMentions = productMentions.length + serviceMentions.length;

        if (totalMentions > 5) {
            errors.push(`브랜드 언급 총 개수 초과: ${totalMentions}/5`);
            score -= 20;
        }

        // 각 언급의 품질 검증
        [...productMentions, ...serviceMentions].forEach((mention, i) => {
            if (!mention.evidence || mention.evidence.length === 0) {
                errors.push(`브랜드 언급 ${i+1}: 증거 없음`);
                score -= 15;
            }
            if (!mention.time_ranges || mention.time_ranges.length === 0) {
                errors.push(`브랜드 언급 ${i+1}: 시간 범위 없음`);
                score -= 10;
            }
        });

        return {
            score: Math.max(0, score),
            passed: errors.length === 0,
            errors: errors,
            message: errors.length === 0 ? '브랜드 분석 우수' : `브랜드 분석 이슈 ${errors.length}개`
        };
    }

    /**
     * 씬 분석 상세도 검증
     */
    validateSceneAnalysis(vdp) {
        const errors = [];
        let score = 100;

        const scenes = vdp.scenes || [];
        if (scenes.length === 0) {
            return { score: 0, passed: false, errors: ['씬 분석 없음'], message: '씬 분석 필수' };
        }

        scenes.forEach((scene, i) => {
            // 샷 개수 검증
            if (!scene.shots || scene.shots.length === 0) {
                errors.push(`씬 ${i+1}: 샷 없음`);
                score -= 20;
            } else if (scene.shots.length > 3) {
                errors.push(`씬 ${i+1}: 샷 개수 초과 (${scene.shots.length}/3)`);
                score -= 10;
            }

            // 키프레임 검증
            scene.shots?.forEach((shot, j) => {
                if (!shot.keyframes || shot.keyframes.length < 2) {
                    errors.push(`씬 ${i+1} 샷 ${j+1}: 키프레임 부족 (<2개)`);
                    score -= 10;
                } else if (shot.keyframes.length > 4) {
                    errors.push(`씬 ${i+1} 샷 ${j+1}: 키프레임 초과 (${shot.keyframes.length}/4)`);
                    score -= 5;
                }

                // 카메라 메타데이터 검증
                if (!shot.camera || !shot.camera.shot || !shot.camera.angle || !shot.camera.move) {
                    errors.push(`씬 ${i+1} 샷 ${j+1}: 카메라 메타데이터 불완전`);
                    score -= 15;
                }
            });
        });

        return {
            score: Math.max(0, score),
            passed: errors.length === 0,
            errors: errors,
            message: errors.length === 0 ? '씬 분석 상세도 우수' : `씬 분석 이슈 ${errors.length}개`
        };
    }

    /**
     * OLD VDP와 비교
     */
    compareWithOldVDP(newVdp, oldVdp) {
        const improvements = [];
        const regressions = [];
        let score = 100;

        try {
            // Hook Genome 혁신 점수 (NEW VDP만의 강점)
            if (newVdp.overall_analysis?.hookGenome && newVdp.overall_analysis.hookGenome.strength_score >= 0.70) {
                improvements.push('Hook Genome 정량 분석 추가 (+30점)');
                score += 30;
            }

            // 관객 댓글 비교
            const oldComments = oldVdp.overall_analysis?.audience_reaction?.notable_comments?.length || 0;
            const newComments = newVdp.overall_analysis?.audience_reaction?.notable_comments?.length || 0;
            if (newComments >= oldComments && newComments > 0) {
                improvements.push(`관객 댓글 분석 유지/향상 (${newComments}개)`);
            } else if (newComments < oldComments) {
                regressions.push(`관객 댓글 분석 감소 (${oldComments} → ${newComments})`);
                score -= 15;
            }

            // 브랜드 분석 비교
            const oldBrands = (oldVdp.product_mentions?.length || 0) + (oldVdp.service_mentions?.length || 0);
            const newBrands = (newVdp.product_mentions?.length || 0) + (newVdp.service_mentions?.length || 0);
            if (newBrands >= oldBrands) {
                improvements.push(`브랜드 분석 유지/향상 (${newBrands}개)`);
            } else {
                regressions.push(`브랜드 분석 감소 (${oldBrands} → ${newBrands})`);
                score -= 10;
            }

            // ASR/OCR 비교
            if (newVdp.overall_analysis?.asr_excerpt && oldVdp.overall_analysis?.asr_transcript) {
                improvements.push('ASR 분석 압축 효율성 향상');
            }

            return {
                score: Math.max(0, Math.min(150, score)), // 최대 150점 (혁신 보너스 포함)
                passed: score >= 100,
                improvements: improvements,
                regressions: regressions,
                message: score >= 120 ? 'OLD VDP 대폭 개선' : score >= 100 ? 'OLD VDP 개선' : 'OLD VDP 대비 퇴보'
            };

        } catch (error) {
            return {
                score: 50,
                passed: false,
                improvements: [],
                regressions: [`비교 중 오류: ${error.message}`],
                message: '비교 분석 실패'
            };
        }
    }

    /**
     * 종합 점수 계산
     */
    calculateOverallScore(validations) {
        const weights = {
            schema: 0.15,           // 15% - 기본 스키마 준수
            hook_quality: 0.25,     // 25% - Hook Genome 품질
            audience_insights: 0.20, // 20% - 관객 인사이트
            evidence_quality: 0.15, // 15% - ASR/OCR 증거
            brand_analysis: 0.15,   // 15% - 브랜드 분석
            scene_analysis: 0.10,   // 10% - 씬 분석
            old_vdp_comparison: 0.0 // 0% - 기본 점수에는 미포함 (보너스)
        };

        let totalScore = 0;
        let totalWeight = 0;

        Object.entries(weights).forEach(([key, weight]) => {
            if (validations[key] && weight > 0) {
                totalScore += validations[key].score * weight;
                totalWeight += weight;
            }
        });

        // OLD VDP 비교 보너스 (최대 +20점)
        if (validations.old_vdp_comparison && validations.old_vdp_comparison.score > 100) {
            const bonus = Math.min(20, validations.old_vdp_comparison.score - 100);
            totalScore += bonus;
        }

        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }

    /**
     * 품질 리포트 생성
     */
    generateReport(validationResult) {
        const report = {
            summary: {
                score: validationResult.overall_score,
                grade: this.getGrade(validationResult.overall_score),
                is_valid: validationResult.is_valid,
                exceeds_old_vdp: validationResult.exceeds_old_vdp
            },
            details: validationResult.validations,
            timestamp: validationResult.timestamp
        };

        return report;
    }

    /**
     * 점수별 등급 부여
     */
    getGrade(score) {
        if (score >= 95) return 'S (Monster)';
        if (score >= 85) return 'A (Excellent)';
        if (score >= 75) return 'B (Good)';
        if (score >= 65) return 'C (Fair)';
        return 'D (Poor)';
    }
}

export { VDPQualityValidator };