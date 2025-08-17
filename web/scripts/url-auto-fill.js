/**
 * URL Auto-fill and Platform Detection System
 * 
 * Handles:
 * - URL input blur detection
 * - Automatic content_id and standard_url population
 * - Platform detection and selection
 * - Warning when user manually changes detected platform
 */

class URLAutoFillManager {
    constructor() {
        this.detectedPlatform = null;
        this.userModifiedPlatform = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createHelpText();
    }

    setupEventListeners() {
        // YouTube URL field
        const youtubeUrl = document.getElementById('youtube-url');
        if (youtubeUrl) {
            youtubeUrl.addEventListener('blur', (e) => {
                this.handleUrlBlur(e.target.value, 'youtube');
            });
        }

        // Instagram URL field
        const instagramUrl = document.getElementById('instagram-source-url');
        if (instagramUrl) {
            instagramUrl.addEventListener('blur', (e) => {
                this.handleUrlBlur(e.target.value, 'instagram');
            });
        }

        // TikTok URL field
        const tiktokUrl = document.getElementById('tiktok-source-url');
        if (tiktokUrl) {
            tiktokUrl.addEventListener('blur', (e) => {
                this.handleUrlBlur(e.target.value, 'tiktok');
            });
        }

        // Platform selection change detection
        const platformRadios = document.querySelectorAll('input[name="platform"]');
        platformRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handlePlatformChange(e.target.value);
            });
        });
    }

    createHelpText() {
        // Update help text for URL inputs
        const helpTexts = {
            'youtube-url-help': '모든 YouTube 링크 형태를 붙여넣어도 됩니다. 시스템이 자동으로 영상 ID와 표준 URL을 채웁니다.'
        };

        Object.entries(helpTexts).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = text;
            }
        });
    }

    async handleUrlBlur(url, currentPlatform) {
        if (!url || !url.trim()) return;

        try {
            // Show loading state
            this.showLoadingState(currentPlatform);

            // Call the normalize endpoint
            const response = await fetch('/api/normalize-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url.trim() })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'URL 정규화 실패');
            }

            const result = await response.json();
            window.logger.urlNormalization(url, result);

            // Auto-fill the fields
            this.populateFields(result, currentPlatform);

            // Auto-detect and select platform
            this.autoDetectPlatform(result.platform);

            // Hide loading state
            this.hideLoadingState(currentPlatform);

        } catch (error) {
            window.logger.reportError(error, 'URL auto-fill');
            this.showError(error.message, currentPlatform);
            this.hideLoadingState(currentPlatform);
        }
    }

    populateFields(result, currentPlatform) {
        // Map platform names
        const platformMapping = {
            'youtube': 'youtube',
            'instagram': 'instagram', 
            'tiktok': 'tiktok'
        };

        const detectedPlatform = platformMapping[result.platform];
        
        if (detectedPlatform === 'youtube') {
            // YouTube fields - store content_id and content_key for form submission (UI fields removed)
            const contentKey = `${result.platform.toLowerCase()}:${result.content_id}`;
            
            // Store both content_id and content_key for form submission
            this.storeContentId(result.content_id);
            this.storeContentKey(contentKey);
            
        } else if (detectedPlatform === 'instagram') {
            // Instagram fields - store content_id and content_key for form submission (UI fields removed)
            const contentKey = `${result.platform.toLowerCase()}:${result.content_id}`;
            this.storeContentId(result.content_id);
            this.storeContentKey(contentKey);
            
        } else if (detectedPlatform === 'tiktok') {
            // TikTok fields - store content_id and content_key for form submission (UI fields removed)
            const contentKey = `${result.platform.toLowerCase()}:${result.content_id}`;
            this.storeContentId(result.content_id);
            this.storeContentKey(contentKey);
        }
    }

    setFieldValue(fieldId, value, readonly = false) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
            if (readonly) {
                field.readOnly = true;
                field.classList.add('auto-filled');
            }
        }
    }

    autoDetectPlatform(detectedPlatform) {
        this.detectedPlatform = detectedPlatform;
        this.userModifiedPlatform = false;

        // Select the appropriate radio button
        const platformRadio = document.getElementById(detectedPlatform);
        if (platformRadio && !platformRadio.checked) {
            platformRadio.checked = true;
            
            // Trigger platform form switching
            if (window.vdpFormManager) {
                window.vdpFormManager.switchPlatform(detectedPlatform);
            }

            // Show detection notification
            this.showDetectionNotification(detectedPlatform);
        }
    }

    handlePlatformChange(selectedPlatform) {
        if (this.detectedPlatform && selectedPlatform !== this.detectedPlatform && !this.userModifiedPlatform) {
            this.userModifiedPlatform = true;
            this.showPlatformWarning(this.detectedPlatform, selectedPlatform);
        }
    }

    showDetectionNotification(platform) {
        const platformNames = {
            'youtube': 'YouTube',
            'instagram': 'Instagram',
            'tiktok': 'TikTok'
        };

        const notification = this.createNotification(
            `🎯 ${platformNames[platform]} 플랫폼이 자동으로 감지되었습니다`,
            'success'
        );
        
        this.showNotification(notification);
    }

    showPlatformWarning(detectedPlatform, selectedPlatform) {
        const platformNames = {
            'youtube': 'YouTube',
            'instagram': 'Instagram', 
            'tiktok': 'TikTok'
        };

        const notification = this.createNotification(
            `⚠️ 감지된 플랫폼은 ${platformNames[detectedPlatform]}이지만 ${platformNames[selectedPlatform]}을(를) 선택하셨습니다`,
            'warning'
        );

        this.showNotification(notification);
    }

    showLoadingState(platform) {
        let loadingText;
        
        if (platform === 'youtube') {
            loadingText = document.getElementById('youtube-url-help');
        } else if (platform === 'instagram') {
            // Find the help text next to the source URL field
            const sourceUrlField = document.getElementById('instagram-source-url');
            if (sourceUrlField) {
                loadingText = sourceUrlField.nextElementSibling;
            }
        } else if (platform === 'tiktok') {
            // Find the help text next to the source URL field
            const sourceUrlField = document.getElementById('tiktok-source-url');
            if (sourceUrlField) {
                loadingText = sourceUrlField.nextElementSibling;
            }
        }

        if (loadingText) {
            loadingText.innerHTML = '🔄 URL 분석 중...';
            loadingText.classList.add('loading');
        }
    }

    hideLoadingState(platform) {
        // Restore original help text
        this.createHelpText();
        
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.classList.remove('loading');
        }
    }

    showError(message, platform) {
        const errorNotification = this.createNotification(
            `❌ ${message}`,
            'error'
        );
        
        this.showNotification(errorNotification);
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `url-notification url-notification--${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'}</span>
            <span class="notification-text">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        return notification;
    }

    showNotification(notification) {
        // Remove existing notifications
        document.querySelectorAll('.url-notification').forEach(n => n.remove());

        // Add new notification to the top of the form
        const form = document.getElementById('vdp-form');
        if (form) {
            form.insertBefore(notification, form.firstChild);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);
        }
    }

    // Store content_key for form submission
    storeContentKey(contentKey) {
        // Store in a hidden field or data attribute for form submission
        let hiddenField = document.getElementById('hidden-content-key');
        if (!hiddenField) {
            hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.id = 'hidden-content-key';
            hiddenField.name = 'content_key';
            document.getElementById('vdp-form').appendChild(hiddenField);
        }
        hiddenField.value = contentKey;
        
        // Also store in URLAutoFillManager for access by main.js
        this.currentContentKey = contentKey;
    }

    // Store content_id for form submission
    storeContentId(contentId) {
        // Store in a hidden field for form submission
        let hiddenField = document.getElementById('hidden-content-id');
        if (!hiddenField) {
            hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.id = 'hidden-content-id';
            hiddenField.name = 'content_id';
            document.getElementById('vdp-form').appendChild(hiddenField);
        }
        hiddenField.value = contentId;
        
        // Also store in URLAutoFillManager for access by main.js
        this.currentContentId = contentId;
    }

    // Method to get current content_key
    getContentKey() {
        return this.currentContentKey || '';
    }

    // Method to get current content_id
    getContentId() {
        return this.currentContentId || '';
    }

    // Method to clear auto-filled fields when URL is cleared
    clearAutoFilledFields(platform) {
        // Clear content_key and content_id (UI fields were removed)
        this.storeContentKey('');
        this.storeContentId('');
    }

    clearField(fieldId) {
        const field = document.getElementById(fieldId);
        if (field && field.classList.contains('auto-filled')) {
            field.value = '';
            field.readOnly = false;
            field.classList.remove('auto-filled');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.urlAutoFillManager = new URLAutoFillManager();
});

// CSS for notifications and auto-filled fields
const style = document.createElement('style');
style.textContent = `
    .url-notification {
        padding: 12px;
        margin-bottom: 16px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
    }

    .url-notification--success {
        background-color: #dcfce7;
        border: 1px solid #bbf7d0;
        color: #166534;
    }

    .url-notification--warning {
        background-color: #fef3c7;
        border: 1px solid #fde68a;
        color: #92400e;
    }

    .url-notification--error {
        background-color: #fee2e2;
        border: 1px solid #fecaca;
        color: #991b1b;
    }

    .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        margin-left: auto;
        opacity: 0.7;
    }

    .notification-close:hover {
        opacity: 1;
    }

    .form-input.auto-filled {
        background-color: #f8fafc;
        border-color: #e2e8f0;
        color: #475569;
    }

    .form-input.auto-filled:focus {
        background-color: #ffffff;
    }

    .loading {
        color: #6366f1;
        font-style: italic;
    }
`;
document.head.appendChild(style);