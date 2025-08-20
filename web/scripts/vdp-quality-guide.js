/**
 * VDP Quality Guide - Interactive Field Priority System
 * 
 * Provides dynamic highlighting and guidance for form fields based on VDP analysis quality impact
 */

class VDPQualityGuide {
    constructor() {
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.setupFieldHighlighting();
        this.setupQualityTips();
        
        console.log('✅ VDP Quality Guide initialized');
    }

    /**
     * Attach event listeners for interactive elements
     */
    attachEventListeners() {
        // Highlight field priority groups on hover
        document.querySelectorAll('.priority-group').forEach(group => {
            group.addEventListener('mouseenter', (e) => {
                this.highlightRelatedFields(e.target);
            });

            group.addEventListener('mouseleave', () => {
                this.clearFieldHighlights();
            });
        });

        // Add focus/blur handlers for form fields with priorities
        document.querySelectorAll('.form-label[class*="form-label--"]').forEach(label => {
            const input = label.parentElement.querySelector('input, textarea, select');
            if (input) {
                input.addEventListener('focus', () => {
                    this.showFieldQualityTip(label, input);
                });

                input.addEventListener('blur', () => {
                    this.hideFieldQualityTip();
                });
            }
        });
    }

    /**
     * Setup field highlighting based on priority levels
     */
    setupFieldHighlighting() {
        // Add subtle animations to priority indicators
        document.querySelectorAll('.field-priority').forEach(indicator => {
            indicator.style.transition = 'all 0.2s ease';
        });

        // Add hover effects to priority groups
        document.querySelectorAll('.priority-group').forEach(group => {
            group.style.cursor = 'pointer';
            group.style.transition = 'all 0.2s ease';
        });
    }

    /**
     * Setup quality tips functionality
     */
    setupQualityTips() {
        // Create tooltip container if it doesn't exist
        if (!document.getElementById('quality-tooltip')) {
            const tooltip = document.createElement('div');
            tooltip.id = 'quality-tooltip';
            tooltip.className = 'quality-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.875rem;
                max-width: 280px;
                z-index: 1000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(tooltip);
        }
    }

    /**
     * Highlight fields related to a priority group
     * @param {Element} priorityGroup - The clicked priority group
     */
    highlightRelatedFields(priorityGroup) {
        const priorityType = this.getPriorityType(priorityGroup);
        if (!priorityType) return;

        // Clear existing highlights
        this.clearFieldHighlights();

        // Highlight all fields with matching priority
        document.querySelectorAll(`.form-label--${priorityType}`).forEach(label => {
            label.style.transform = 'translateX(4px)';
            label.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            label.style.transition = 'all 0.2s ease';
        });

        // Add glow effect to the priority group
        priorityGroup.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
    }

    /**
     * Clear all field highlights
     */
    clearFieldHighlights() {
        document.querySelectorAll('.form-label[class*="form-label--"]').forEach(label => {
            label.style.transform = '';
            label.style.boxShadow = '';
        });

        document.querySelectorAll('.priority-group').forEach(group => {
            group.style.boxShadow = '';
        });
    }

    /**
     * Show quality tip for a focused field
     * @param {Element} label - The field label
     * @param {Element} input - The input element
     */
    showFieldQualityTip(label, input) {
        const tooltip = document.getElementById('quality-tooltip');
        if (!tooltip) return;

        const priorityType = this.getPriorityTypeFromLabel(label);
        const tip = this.getQualityTipForField(input.name, priorityType);

        if (tip) {
            tooltip.innerHTML = tip;
            this.positionTooltip(tooltip, input);
            tooltip.style.opacity = '1';
        }
    }

    /**
     * Hide the quality tip
     */
    hideFieldQualityTip() {
        const tooltip = document.getElementById('quality-tooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
        }
    }

    /**
     * Get priority type from priority group element
     * @param {Element} element - Priority group element
     * @returns {string|null} Priority type (required, recommended, optional)
     */
    getPriorityType(element) {
        if (element.classList.contains('priority-group--required')) return 'required';
        if (element.classList.contains('priority-group--recommended')) return 'recommended';
        if (element.classList.contains('priority-group--optional')) return 'optional';
        return null;
    }

    /**
     * Get priority type from label element
     * @param {Element} label - Label element
     * @returns {string|null} Priority type
     */
    getPriorityTypeFromLabel(label) {
        if (label.classList.contains('form-label--required')) return 'required';
        if (label.classList.contains('form-label--recommended')) return 'recommended';
        if (label.classList.contains('form-label--optional')) return 'optional';
        return null;
    }

    /**
     * Get quality tip for a specific field
     * @param {string} fieldName - Name of the field
     * @param {string} priorityType - Priority level
     * @returns {string} Quality tip text
     */
    getQualityTipForField(fieldName, priorityType) {
        const tips = {
            'title': {
                'recommended': '💡 제목은 감정 분석과 Hook Genome 패턴 인식에 핵심적인 역할을 합니다. 구체적이고 감정이 담긴 제목일수록 VDP 품질이 향상됩니다.'
            },
            'view_count': {
                'recommended': '📊 조회수는 콘텐츠 인기도를 나타내며, Hook 강도와 viral potential 분석에 사용됩니다.'
            },
            'like_count': {
                'recommended': '👍 좋아요는 사용자 참여도를 측정하며, 감정적 반응 분석에 중요한 지표입니다.'
            },
            'comment_count': {
                'recommended': '💬 댓글 수는 사용자 참여도와 콘텐츠 토론성을 나타내는 중요한 품질 지표입니다.'
            },
            'top_comment_1_text': {
                'recommended': '🔥 인기 댓글은 시청자의 실제 반응을 보여주며, Hook Genome의 효과성을 측정하는 데 매우 중요합니다.'
            },
            'share_count': {
                'optional': '🔄 공유수는 viral potential을 나타내지만 플랫폼별로 제공 여부가 다릅니다. 없어도 VDP 생성에는 문제없습니다.'
            },
            'hashtags': {
                'optional': '🏷️ 해시태그는 콘텐츠 카테고리 분류에 도움이 되지만 핵심 분석에는 선택사항입니다.'
            },
            'upload_date': {
                'optional': '📅 업로드 날짜는 트렌드 분석에 도움이 되지만 VDP 핵심 품질에는 큰 영향을 주지 않습니다.'
            },
            'duration': {
                'recommended': '⏱️ 영상 길이는 pacing 분석과 Hook timing 계산에 중요합니다. 정확한 초 단위로 입력해주세요.'
            }
        };

        return tips[fieldName]?.[priorityType] || null;
    }

    /**
     * Position tooltip near the input element
     * @param {Element} tooltip - Tooltip element
     * @param {Element} input - Input element to position near
     */
    positionTooltip(tooltip, input) {
        const rect = input.getBoundingClientRect();
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + scrollY + 8}px`;

        // Adjust if tooltip goes off screen
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = `${window.innerWidth - tooltipRect.width - 16}px`;
        }
        if (tooltipRect.bottom > window.innerHeight + scrollY) {
            tooltip.style.top = `${rect.top + scrollY - tooltipRect.height - 8}px`;
        }
    }

    /**
     * Update quality score based on filled fields
     * @param {string} platform - Current platform (instagram, tiktok)
     */
    updateQualityScore(platform) {
        const platformForm = document.getElementById(`${platform}-form`);
        if (!platformForm) return;

        let requiredFilled = 0;
        let recommendedFilled = 0;
        let optionalFilled = 0;
        let totalRequired = 0;
        let totalRecommended = 0;
        let totalOptional = 0;

        // Count filled fields by priority
        platformForm.querySelectorAll('.form-label').forEach(label => {
            const input = label.parentElement.querySelector('input, textarea, select');
            const isRequired = label.classList.contains('form-label--required');
            const isRecommended = label.classList.contains('form-label--recommended');
            const isOptional = label.classList.contains('form-label--optional');

            if (isRequired) {
                totalRequired++;
                if (input && input.value.trim()) requiredFilled++;
            } else if (isRecommended) {
                totalRecommended++;
                if (input && input.value.trim()) recommendedFilled++;
            } else if (isOptional) {
                totalOptional++;
                if (input && input.value.trim()) optionalFilled++;
            }
        });

        // Calculate quality score (weighted: required=50%, recommended=35%, optional=15%)
        const requiredScore = totalRequired > 0 ? (requiredFilled / totalRequired) * 0.5 : 0;
        const recommendedScore = totalRecommended > 0 ? (recommendedFilled / totalRecommended) * 0.35 : 0;
        const optionalScore = totalOptional > 0 ? (optionalFilled / totalOptional) * 0.15 : 0;
        
        const totalScore = Math.round((requiredScore + recommendedScore + optionalScore) * 100);

        // Update quality indicator (if exists)
        this.updateQualityIndicator(platform, totalScore, {
            required: `${requiredFilled}/${totalRequired}`,
            recommended: `${recommendedFilled}/${totalRecommended}`,
            optional: `${optionalFilled}/${totalOptional}`
        });

        return totalScore;
    }

    /**
     * Update visual quality indicator
     * @param {string} platform - Platform name
     * @param {number} score - Quality score (0-100)
     * @param {Object} breakdown - Score breakdown by category
     */
    updateQualityIndicator(platform, score, breakdown) {
        // This could update a visual indicator showing VDP quality score
        // For now, just log to console
        console.log(`📊 ${platform.toUpperCase()} VDP Quality Score: ${score}%`, breakdown);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.vdpQualityGuide = new VDPQualityGuide();
});

// Export for use in other scripts
window.VDPQualityGuide = VDPQualityGuide;