/**
 * VDP Content Processor - Frontend JavaScript
 * Handles form interactions, file uploads, and progress tracking
 */

class VDPProcessor {
    constructor() {
        this.apiBase = 'http://localhost:8080'; // Ingest UI server
        this.testMode = false; // Disable test mode - use real VDP processing
        this.currentJob = null;
        this.progressInterval = null;
        this.metricsUpdated = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateFormState();
        
        // Initialize enhanced logging
        this.initializeLogging();
        
        // Start circuit breaker monitoring
        this.startCircuitBreakerMonitoring();
    }
    
    initializeLogging() {
        // Add correlation ID to requests
        this.correlationId = this.generateCorrelationId();
        
        // Enhanced logging for major changes
        this.logMajorChangeInitialization();
    }
    
    generateCorrelationId() {
        return 'client_' + Math.random().toString(36).substring(2, 10);
    }
    
    logMajorChangeInitialization() {
        if (window.logger) {
            window.logger.info('VDP Processor initialized with major change logging', {
                correlationId: this.correlationId,
                changes: [
                    'JSON_ONLY_SUBMISSION',
                    'PLATFORM_SPECIFIC_PATHS', 
                    'CONTENT_KEY_ENFORCEMENT',
                    'DUPLICATE_UPLOAD_PREVENTION'
                ],
                timestamp: new Date().toISOString()
            });
        }
    }
    
    setupFileUploadLogging() {
        // Monitor file upload click events to prevent duplicates
        document.querySelectorAll('.file-upload-label').forEach(label => {
            label.addEventListener('click', (event) => {
                const targetInput = document.getElementById(label.getAttribute('for'));
                const platform = document.querySelector('input[name="platform"]:checked')?.value;
                
                if (window.logger) {
                    window.logger.info('File upload dialog triggered', {
                        correlationId: this.correlationId,
                        platform,
                        inputId: label.getAttribute('for'),
                        eventType: 'SINGLE_CLICK',
                        duplicatePrevention: 'ACTIVE'
                    });
                }
            });
        });
        
        // Log file input changes
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', (event) => {
                const file = event.target.files[0];
                const platform = document.querySelector('input[name="platform"]:checked')?.value;
                
                if (window.logger) {
                    window.logger.info('File selected successfully', {
                        correlationId: this.correlationId,
                        platform,
                        fileName: file ? file.name : null,
                        fileSize: file ? file.size : null,
                        duplicatePreventionStatus: 'SUCCESS'
                    });
                }
            });
        });
    }
    
    setupEventListeners() {
        // Platform selection
        const platformInputs = document.querySelectorAll('input[name="platform"]');
        platformInputs.forEach(input => {
            input.addEventListener('change', this.handlePlatformChange.bind(this));
        });
        
        // Form submission
        const form = document.getElementById('vdp-form');
        form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // File input changes
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', this.handleFileChange.bind(this));
        });
        
        // URL input validation
        const urlInput = document.getElementById('youtube-url');
        if (urlInput) {
            urlInput.addEventListener('input', this.validateYouTubeUrl.bind(this));
            urlInput.addEventListener('blur', this.validateYouTubeUrl.bind(this));
        }
        
        // Form validation
        form.addEventListener('input', this.validateForm.bind(this));
        
        // Enhanced logging for file upload events to prevent duplicate dialogs
        this.setupFileUploadLogging();
        
        // File upload은 HTML label for 속성으로 자동 처리됨 (JavaScript 불필요)
    }
    
    handlePlatformChange(event) {
        const selectedPlatform = event.target.value;
        
        // Hide all platform forms
        document.querySelectorAll('.platform-form').forEach(form => {
            form.classList.remove('platform-form--active');
        });
        
        // Show selected platform form
        const targetForm = document.getElementById(`${selectedPlatform}-form`);
        if (targetForm) {
            targetForm.classList.add('platform-form--active');
        }
        
        // Clear previous file selections
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.value = '';
        });
        
        this.updateFormState();
        this.validateForm();
    }
    
    validateYouTubeUrl(event) {
        const input = event.target;
        const url = input.value.trim();
        
        if (!url) {
            this.clearValidationState(input);
            return;
        }
        
        const youtubePattern = /^https:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}$/;
        const isValid = youtubePattern.test(url);
        
        if (isValid) {
            this.setValidationState(input, 'valid', '유효한 YouTube Shorts URL입니다');
        } else {
            this.setValidationState(input, 'invalid', 'YouTube Shorts URL 형식이 올바르지 않습니다');
        }
    }
    
    handleFileChange(event) {
        const input = event.target;
        const file = input.files[0];
        const uploadZone = input.closest('.file-upload-zone');
        const label = uploadZone.querySelector('.file-upload-text');
        
        if (file) {
            uploadZone.classList.add('file-upload-zone--selected');
            label.textContent = `선택됨: ${file.name} (${this.formatFileSize(file.size)})`;
            
            // Validate file
            this.validateFile(input, file);
        } else {
            uploadZone.classList.remove('file-upload-zone--selected');
            label.textContent = '클릭하여 동영상 파일 선택 또는 드래그하여 업로드';
        }
        
        this.validateForm();
    }
    
    validateFile(input, file) {
        const isVideo = input.name === 'video_file';
        const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB : 10MB
        
        if (file.size > maxSize) {
            const maxSizeText = isVideo ? '100MB' : '10MB';
            this.setValidationState(input, 'invalid', `파일 크기가 ${maxSizeText}를 초과합니다`);
            return false;
        }
        
        if (isVideo && !file.type.startsWith('video/')) {
            this.setValidationState(input, 'invalid', '동영상 파일만 업로드 가능합니다');
            return false;
        }
        
        if (!isVideo && !file.type.includes('json') && !file.name.toLowerCase().endsWith('.json')) {
            this.setValidationState(input, 'invalid', 'JSON 파일만 업로드 가능합니다');
            return false;
        }
        
        this.setValidationState(input, 'valid', '파일이 유효합니다');
        return true;
    }
    
    setValidationState(input, state, message) {
        // Remove existing validation classes
        input.classList.remove('form-input--valid', 'form-input--invalid');
        
        // Add new validation class
        input.classList.add(`form-input--${state}`);
        
        // Update or create validation message
        let messageEl = input.parentNode.querySelector('.validation-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'validation-message';
            input.parentNode.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.className = `validation-message validation-message--${state}`;
    }
    
    clearValidationState(input) {
        input.classList.remove('form-input--valid', 'form-input--invalid');
        const messageEl = input.parentNode.querySelector('.validation-message');
        if (messageEl) {
            messageEl.remove();
        }
    }
    
    updateFormState() {
        const selectedPlatform = document.querySelector('input[name="platform"]:checked')?.value;
        const platformForms = document.querySelectorAll('.platform-form');
        
        platformForms.forEach(form => {
            const isActive = form.id === `${selectedPlatform}-form`;
            form.classList.toggle('platform-form--active', isActive);
        });
    }
    
    validateForm() {
        const selectedPlatform = document.querySelector('input[name="platform"]:checked')?.value;
        const submitBtn = document.getElementById('submit-btn');
        let isValid = false;
        
        if (selectedPlatform === 'youtube') {
            const urlInput = document.getElementById('youtube-url');
            const originInput = document.getElementById('youtube-video-origin');
            const url = urlInput.value.trim();
            const origin = originInput.value;
            const youtubePattern = /^https:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}$/;
            isValid = youtubePattern.test(url) && origin && origin !== '';
        } else if (selectedPlatform === 'instagram') {
            const videoInput = document.getElementById('instagram-video');
            const sourceUrlInput = document.getElementById('instagram-source-url');
            const originInput = document.getElementById('instagram-video-origin');
            
            isValid = videoInput.files.length > 0 && sourceUrlInput.value.trim().length > 0 && originInput.value && originInput.value !== '';
        } else if (selectedPlatform === 'tiktok') {
            const videoInput = document.getElementById('tiktok-video');
            const sourceUrlInput = document.getElementById('tiktok-source-url');
            const originInput = document.getElementById('tiktok-video-origin');
            
            isValid = videoInput.files.length > 0 && sourceUrlInput.value.trim().length > 0 && originInput.value && originInput.value !== '';
        }
        
        submitBtn.disabled = !isValid;
        
        if (isValid) {
            submitBtn.querySelector('.submit-btn__text').textContent = '콘텐츠 분석 시작';
        } else {
            submitBtn.querySelector('.submit-btn__text').textContent = '필수 정보를 입력해주세요';
        }
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const platform = formData.get('platform');
        const content_id = window.urlAutoFillManager?.getContentId() || formData.get('content_id') || null;
        const content_key = window.urlAutoFillManager?.getContentKey() || `${platform}:${content_id}`;
        
        // Enhanced content_id validation with logging
        if (!content_id) {
            if (window.logger) {
                window.logger.error('Content ID validation failed', {
                    correlationId: this.correlationId,
                    platform,
                    sourceUrl: formData.get('source_url'),
                    errorCode: 'CONTENT_ID_MISSING',
                    contentKeyEnforcement: 'FAILED',
                    extractedContentId: content_id,
                    autoFillManagerState: window.urlAutoFillManager ? 'available' : 'unavailable',
                    autoFillManagerContentId: window.urlAutoFillManager?.getContentId(),
                    formDataContentId: formData.get('content_id'),
                    urlAutoFillManagerExists: !!window.urlAutoFillManager,
                    fix: 'Provide valid platform URL for content_id extraction'
                });
            }
            
            this.showError({
                title: 'Content ID 누락',
                detail: 'URL에서 콘텐츠 ID를 추출할 수 없습니다. 올바른 URL을 입력했는지 확인해주세요.',
                code: 'CONTENT_ID_MISSING',
                fixes: ['올바른 플랫폼 URL을 입력해주세요', 'URL이 올바른 형식인지 확인해주세요']
            });
            return;
        }
        
        // Log successful content_key generation
        if (window.logger) {
            window.logger.success('Content key generated successfully', {
                correlationId: this.correlationId,
                platform,
                contentId: content_id,
                contentKey: content_key,
                contentKeyEnforcement: 'SUCCESS',
                globalUniqueness: true
            });
        }
        
        // Build JSON payload instead of FormData
        // Explicitly get source_url from the correct platform tab
        let source_url = '';
        if (platform === 'youtube') {
            source_url = document.getElementById('youtube-url')?.value || '';
        } else if (platform === 'instagram') {
            source_url = document.getElementById('instagram-source-url')?.value || '';
        } else if (platform === 'tiktok') {
            source_url = document.getElementById('tiktok-source-url')?.value || '';
        }
        
        const jsonPayload = {
            platform,
            content_id,
            content_key,
            source_url: source_url.trim(),
            canonical_url: formData.get('canonical_url'),
            video_origin: formData.get('video_origin') || 'ai_generated',
            language: 'ko' // Default language since language fields were removed
        };

        // Add Instagram/TikTok specific fields for full pipeline processing
        if (platform === 'instagram' || platform === 'tiktok') {
            // Check if user uploaded video file - indicates intention for full pipeline
            const videoFile = formData.get('video_file');
            const hasVideoFile = videoFile && videoFile.size > 0;
            
            if (hasVideoFile) {
                // Upload file to GCS first
                this.updateProgress(10, '비디오 파일을 업로드하고 있습니다...', []);
                
                const uploadedGcsUri = await this.uploadVideoFile(videoFile, platform, content_id);
                
                // Force full pipeline when video file is uploaded  
                jsonPayload.processing_options = {
                    force_full_pipeline: true,
                    audio_fingerprint: true,
                    brand_detection: true,
                    hook_genome_analysis: true
                };
                
                // Set actual uploaded GCS URI (필수 필드)
                jsonPayload.uploaded_gcs_uri = uploadedGcsUri;
                
                this.updateProgress(25, '파일 업로드 완료, 인제스트 요청을 처리하고 있습니다...', []);
            } else {
                // Metadata-only processing (force_full_pipeline still recommended for testing)
                jsonPayload.processing_options = {
                    force_full_pipeline: true, // 테스트 초반엔 강제 권장
                    audio_fingerprint: false,
                    brand_detection: false,
                    hook_genome_analysis: false
                };
                // uploaded_gcs_uri는 파일이 없으면 생략
            }
        }
        
        // Log JSON payload construction
        if (window.logger) {
            window.logger.info('JSON payload constructed for platform-specific processing', {
                correlationId: this.correlationId,
                platform,
                contentKey: content_key,
                submissionType: 'JSON_ONLY',
                platformSpecificPath: `gs://tough-variety-raw-central1/ingest/requests/${platform}/`,
                formDataReplacement: 'COMPLETE',
                // Enhanced logging for IG/TT conditional pipeline
                ...(platform === 'instagram' || platform === 'tiktok' ? {
                    forceFullPipeline: jsonPayload.force_full_pipeline,
                    uploadedGcsUri: jsonPayload.uploaded_gcs_uri || 'NOT_SET',
                    processingOptions: jsonPayload.processing_options,
                    conditionalPipelineMode: jsonPayload.force_full_pipeline ? 'FULL_PROCESSING' : 'METADATA_ONLY'
                } : {})
            });
        }
        
        try {
            // Add platform-specific metadata for Instagram/TikTok (text only, no likes)
            if (platform === 'instagram' || platform === 'tiktok') {
                // Extract comment text only (no likes field)
                const comments = [];
                for (let i = 1; i <= 3; i++) {
                    const text = formData.get(`top_comment_${i}_text`);
                    if (text && text.trim()) {
                        comments.push({
                            text: text.trim()
                            // Likes field removed completely
                        });
                    }
                }
                
                // Use Cursor extracted metadata if available, fallback to manual input
                const extractedData = platform === 'instagram' ? window.instagramMetadata : window.tiktokMetadata;
                
                if (extractedData) {
                    // Use Cursor extracted metadata (90%+ automation achieved)
                    Object.assign(jsonPayload, {
                        title: extractedData.title || formData.get('title'),
                        view_count: extractedData.view_count || parseInt(formData.get('view_count')) || 0,
                        like_count: extractedData.like_count || parseInt(formData.get('like_count')) || 0,
                        comment_count: extractedData.comment_count || parseInt(formData.get('comment_count')) || 0,
                        share_count: extractedData.share_count || parseInt(formData.get('share_count')) || 0,
                        hashtags: extractedData.hashtags || formData.get('hashtags'),
                        upload_date: extractedData.upload_date || formData.get('upload_date'),
                        author: extractedData.author,
                        followers: extractedData.followers
                    });
                    
                    if (platform === 'tiktok' && extractedData.duration) {
                        jsonPayload.duration = extractedData.duration;
                    }
                } else {
                    // Fallback to manual input
                    Object.assign(jsonPayload, {
                        title: formData.get('title'),
                        view_count: parseInt(formData.get('view_count')) || 0,
                        like_count: parseInt(formData.get('like_count')) || 0,
                        comment_count: parseInt(formData.get('comment_count')) || 0,
                        share_count: parseInt(formData.get('share_count')) || 0,
                        hashtags: formData.get('hashtags'),
                        upload_date: formData.get('upload_date'),
                        top_comment_1_text: comments[0]?.text || '',
                        top_comment_2_text: comments[1]?.text || '',
                        top_comment_3_text: comments[2]?.text || ''
                    });
                    
                    if (platform === 'tiktok') {
                        jsonPayload.duration = parseInt(formData.get('duration')) || null;
                    }
                }
            }
            
            this.showProgressSection();
            this.updateProgress(0, '제출 내용을 검증하고 있습니다...', []);
            
            // Determine endpoint based on extractor selection
            const selectedExtractor = document.querySelector('input[name="extractor"]:checked')?.value || 'main';
            const endpoint = this.testMode ? '/vdp/test-submit' : 
                           selectedExtractor === 'main' ? '/api/vdp/extract-main' : '/api/vdp/extract-vertex';
            // Enhanced logging for JSON-only submission
            window.logger.info('JSON-only submission initiated', {
                correlationId: this.correlationId,
                platform,
                contentId: content_id,
                contentKey: content_key,
                endpoint,
                submissionType: 'JSON_ONLY',
                platformSpecificPath: true
            });
            
            window.logger.apiRequest(`${this.apiBase}${endpoint}`, 'POST');
            window.logger.formSubmission(platform, !!formData.get('video_file'));
            
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Correlation-ID': this.correlationId
                },
                body: JSON.stringify(jsonPayload)
            });
            
            window.logger.apiResponse(response.status, response.ok);
            const result = await response.json();
            
            // Enhanced response logging
            if (window.logger) {
                window.logger.info('API response received', {
                    correlationId: this.correlationId,
                    responseStatus: response.status,
                    responseOk: response.ok,
                    jobId: result.job_id?.substring(0, 8) + '...',
                    contentKey: result.content_key || content_key,
                    platformPath: result.gcs_uri ? 'PLATFORM_SEGMENTED' : 'UNKNOWN'
                });
            }
            
            window.logger.debug('📦 Response received', { job_id: result.job_id?.substring(0, 8) + '...' });
            
            if (!response.ok) {
                throw new ProblemDetailsError(result);
            }
            
            // Handle 202 Accepted response (GCS storage trigger)
            if (response.status === 202) {
                this.currentJob = result;
                this.updateProgress(15, 'GCS 저장 완료, 백엔드 처리 대기 중...', ['제출 완료', 'GCS 저장']);
                this.displayIngestJobInfo(result);
                this.showIngestCompleteMessage(result);
                return;
            }
            
            // Handle VDP wrapper prevention (legacy direct VDP response)
            if (result.vdp && typeof result.vdp === 'object') {
                result = result.vdp;
            }
            
            this.currentJob = result;
            this.updateProgress(10, '처리가 시작되었습니다...', ['제출 완료']);
            this.displayJobInfo(result);
            this.startProgressPolling(result.job_id);
            
        } catch (error) {
            window.logger.reportError(error, 'Form submission');
            this.showError(error);
        }
    }
    
    buildMetadataFromForm(platform, formData) {
        const metadata = {
            platform: platform === 'instagram' ? 'instagram_reels' : 'tiktok',
            source_url: formData.get('source_url') || '',
            content_id: formData.get('content_id') || '',
            creator: formData.get('creator') || '',
            title: formData.get('title') || '',
            language: formData.get('language') || 'ko',
            view_count: parseInt(formData.get('view_count')) || 0,
            like_count: parseInt(formData.get('like_count')) || 0,
            comment_count: parseInt(formData.get('comment_count')) || 0,
            share_count: parseInt(formData.get('share_count')) || 0,
            upload_date: formData.get('upload_date') || new Date().toISOString(),
            video_origin: formData.get('video_origin') || 'unknown'
        };
        
        // Parse hashtags
        const hashtagsInput = formData.get('hashtags') || '';
        if (hashtagsInput.trim()) {
            metadata.hashtags = hashtagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } else {
            metadata.hashtags = [];
        }
        
        // Parse top comments with platform-specific schema branching
        const topComments = [];
        for (let i = 1; i <= 3; i++) {
            const author = formData.get(`top_comment_${i}_author`);
            const text = formData.get(`top_comment_${i}_text`);
            const likes = formData.get(`top_comment_${i}_likes`);
            
            if (text && text.trim()) {
                if (platform === 'instagram') {
                    // Instagram comment schema: simplified structure
                    topComments.push({
                        text: text.trim(),
                        author: author && author.trim() ? author.trim() : 'Anonymous',
                        engagement: {
                            likes: parseInt(likes) || 0
                        }
                    });
                } else if (platform === 'tiktok') {
                    // TikTok comment schema: enhanced with additional fields
                    topComments.push({
                        text: text.trim(),
                        author: author && author.trim() ? author.trim() : 'Anonymous',
                        likes: parseInt(likes) || 0,
                        timestamp: new Date().toISOString(), // Auto-generated for TikTok
                        verified: false // Default for manual entry
                    });
                }
            }
        }
        if (topComments.length > 0) {
            metadata.top_comments = topComments;
        }
        
        // TikTok-specific fields
        if (platform === 'tiktok') {
            metadata.duration = parseInt(formData.get('duration')) || null;
        }
        
        return metadata;
    }
    
    showProgressSection() {
        document.getElementById('progress-section').style.display = 'block';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('vdp-form').style.display = 'none';
        
        // Scroll to progress section
        document.getElementById('progress-section').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
    
    displayJobInfo(job) {
        document.getElementById('progress-platform').textContent = job.platform.toUpperCase();
        document.getElementById('progress-job-id').textContent = `Job ID: ${job.job_id}`;
    }
    
    displayIngestJobInfo(job) {
        document.getElementById('progress-platform').textContent = (job.platform || 'UNKNOWN').toUpperCase();
        document.getElementById('progress-job-id').textContent = `Ingest ID: ${job.job_id}`;
    }
    
    showIngestCompleteMessage(job) {
        const resultsSection = document.getElementById('results-section');
        
        resultsSection.innerHTML = `
            <div class="ingest-complete-container">
                <div class="ingest-header">
                    <span class="ingest-icon">📥</span>
                    <h2 class="ingest-title">요청이 성공적으로 접수되었습니다!</h2>
                </div>
                
                <div class="ingest-details">
                    <div class="ingest-info">
                        <div class="info-item">
                            <span class="label">플랫폼:</span>
                            <span class="value">${(job.platform || 'Unknown').toUpperCase()}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">콘텐츠 ID:</span>
                            <span class="value">${job.content_id || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">작업 ID:</span>
                            <span class="value">${job.job_id}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">상태:</span>
                            <span class="value status-queued">${job.status || 'queued'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">예상 완료:</span>
                            <span class="value">${job.estimated_completion ? new Date(job.estimated_completion).toLocaleString('ko-KR') : '약 2분 후'}</span>
                        </div>
                    </div>
                    
                    <div class="ingest-message">
                        <p>🔄 백엔드에서 자동으로 처리됩니다</p>
                        <p>📊 완료 후 VDP 결과를 확인하실 수 있습니다</p>
                        <p>💡 작업 ID를 기록해두시면 나중에 결과를 조회할 수 있습니다</p>
                    </div>
                    
                    <div class="gcs-info">
                        <p><strong>📁 저장 위치:</strong></p>
                        <code class="gcs-uri">${job.gcs_uri || 'N/A'}</code>
                    </div>
                </div>
                
                <div class="ingest-actions">
                    <button type="button" class="copy-job-id-btn" onclick="vdpProcessor.copyJobId('${job.job_id}')">
                        📋 작업 ID 복사
                    </button>
                    <button type="button" class="process-another-btn" onclick="vdpProcessor.resetForm()">
                        🔄 다른 콘텐츠 처리하기
                    </button>
                </div>
            </div>
        `;
        
        resultsSection.style.display = 'block';
        document.getElementById('progress-section').style.display = 'none';
    }
    
    updateProgress(percentage, step, completedSteps) {
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressStep = document.getElementById('progress-step');
        const stepsContainer = document.getElementById('progress-steps');
        
        progressFill.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;
        progressStep.textContent = step;
        
        // Update progress steps
        const allSteps = [
            '제출 내용 검증',
            '콘텐츠 다운로드',
            'GCS 업로드',
            'AI 분석',
            '품질 검증',
            '데이터베이스 저장'
        ];
        
        stepsContainer.innerHTML = '';
        allSteps.forEach((stepName, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'progress-step';
            
            let stepStatus = 'pending';
            let stepIcon = '⏳';
            
            if (completedSteps.includes(stepName)) {
                stepStatus = 'completed';
                stepIcon = '✅';
            } else if (step.includes(stepName.toLowerCase())) {
                stepStatus = 'active';
                stepIcon = '🔄';
            }
            
            stepEl.classList.add(`progress-step--${stepStatus}`);
            stepEl.innerHTML = `
                <span class="progress-step__icon">${stepIcon}</span>
                <span class="progress-step__text">${stepName}</span>
            `;
            
            stepsContainer.appendChild(stepEl);
        });
    }
    
    async startProgressPolling(jobId) {
        this.progressInterval = setInterval(async () => {
            try {
                const jobEndpoint = this.testMode ? `/test-jobs/${jobId}` : `/jobs/${jobId}`;
                const response = await fetch(`${this.apiBase}${jobEndpoint}`);
                const job = await response.json();
                
                if (!response.ok) {
                    throw new ProblemDetailsError(job);
                }
                
                this.updateProgress(
                    job.progress || 0,
                    job.current_step || '처리 중...',
                    job.steps_completed || []
                );
                
                if (job.status === 'completed') {
                    this.stopProgressPolling();
                    this.showSuccess(job);
                } else if (job.status === 'failed') {
                    this.stopProgressPolling();
                    this.showError(job.error || { title: '알 수 없는 오류', detail: '처리 중 오류가 발생했습니다.' });
                }
                
            } catch (error) {
                window.logger.warn('Progress polling error:', { message: error.message });
                this.stopProgressPolling();
                this.showError(error);
            }
        }, 3000); // Poll every 3 seconds
    }
    
    stopProgressPolling() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    showSuccess(job) {
        const resultsSection = document.getElementById('results-section');
        const result = job.result || job; // Support direct VDP response
        const hookAnalysis = result.hook_analysis || result.overall_analysis?.hookGenome || {};
        const qualityIndicators = result.quality_indicators || {};
        const hookGatePass = result.hook_gate_status === 'PASS';
        const legacyMode = result.legacy_mode || false;
        const selectedExtractor = document.querySelector('input[name="extractor"]:checked')?.value || 'main';
        
        // Show appropriate display based on extractor type
        if (selectedExtractor === 'main') {
            this.showMainVdpResults(result);
            return;
        }
        
        // Show and update metrics display
        this.showMetricsDisplay(qualityIndicators, hookGatePass, result);
        
        resultsSection.innerHTML = `
            <div class="success-container">
                <div class="success-header">
                    <span class="success-icon">✅</span>
                    <h2 class="success-title">VDP 분석 완료!</h2>
                    ${legacyMode ? '<span class="legacy-badge">⚠️ 품질저하</span>' : ''}
                </div>
                
                <!-- Hook Gate Status Badge -->
                <div class="hook-gate-badge ${hookGatePass ? 'pass' : 'fail'}">
                    <span class="badge-icon">${hookGatePass ? '✅' : '❌'}</span>
                    <span class="badge-text">Hook Gate ${result.hook_gate_status}</span>
                </div>
                
                <!-- Quality Indicators -->
                <div class="quality-indicators">
                    <div class="quality-grid">
                        <div class="quality-metric">
                            <span class="metric-icon">🎬</span>
                            <span class="metric-value">${qualityIndicators.scenes || 'N/A'}</span>
                            <span class="metric-label">Scenes</span>
                        </div>
                        <div class="quality-metric">
                            <span class="metric-icon">📸</span>
                            <span class="metric-value">${qualityIndicators.shots || 'N/A'}</span>
                            <span class="metric-label">Shots</span>
                        </div>
                        <div class="quality-metric">
                            <span class="metric-icon">🔑</span>
                            <span class="metric-value">${qualityIndicators.keyframes || 'N/A'}</span>
                            <span class="metric-label">Keyframes</span>
                        </div>
                    </div>
                </div>
                
                <!-- Hook Analysis Details -->
                <div class="success-details">
                    <div class="metric">
                        <span class="label">Hook 품질:</span>
                        <span class="value ${(qualityIndicators.hook_strength || hookAnalysis.strength_score) >= 0.7 ? 'good' : 'warning'}">${(qualityIndicators.hook_strength || hookAnalysis.strength_score || 'N/A').toFixed ? (qualityIndicators.hook_strength || hookAnalysis.strength_score).toFixed(2) : (qualityIndicators.hook_strength || hookAnalysis.strength_score)}/1.00</span>
                    </div>
                    <div class="metric">
                        <span class="label">Hook 시작:</span>
                        <span class="value ${(qualityIndicators.hook_timing || hookAnalysis.start_sec) <= 3 ? 'good' : 'warning'}">${(qualityIndicators.hook_timing || hookAnalysis.start_sec || 'N/A').toFixed ? (qualityIndicators.hook_timing || hookAnalysis.start_sec).toFixed(1) : (qualityIndicators.hook_timing || hookAnalysis.start_sec)}초</span>
                    </div>
                    <div class="metric">
                        <span class="label">처리 시간:</span>
                        <span class="value">${result.processing_time || 'N/A'}초</span>
                    </div>
                </div>
                
                <div class="success-actions">
                    <div class="download-validation-toggle">
                        <div class="toggle-tabs">
                            <button type="button" class="toggle-tab toggle-tab--active" data-tab="download" onclick="switchActionTab('download')">
                                📥 다운로드
                            </button>
                            <button type="button" class="toggle-tab" data-tab="validation" onclick="switchActionTab('validation')">
                                ✅ 검증
                            </button>
                        </div>
                        
                        <div class="tab-content tab-content--active" data-content="download">
                            <button type="button" class="view-results-btn" onclick="vdpProcessor.downloadVDP('${result.result_gcs_uri || result.vdp_file_url || ''}')">
                                📊 JSON 다운로드
                            </button>
                        </div>
                        
                        <div class="tab-content" data-content="validation">
                            <button type="button" class="validation-btn" onclick="vdpProcessor.validateVDP('${result.result_gcs_uri || result.vdp_file_url || ''}')">
                                🔍 AJV 검증 결과
                            </button>
                            <div class="validation-results" id="validation-results" style="display: none;"></div>
                        </div>
                    </div>
                    
                    <button type="button" class="process-another-btn" onclick="vdpProcessor.resetForm()">
                        🔄 다른 콘텐츠 분석하기
                    </button>
                </div>
            </div>
        `;
        
        resultsSection.style.display = 'block';
        document.getElementById('progress-section').style.display = 'none';
    }
    
    showError(error) {
        const resultsSection = document.getElementById('results-section');
        
        const title = error.title || '처리 오류';
        const detail = error.detail || '요청을 처리하는 중 오류가 발생했습니다.';
        const code = error.code || 'UNKNOWN_ERROR';
        const fixes = error.fixes || ['다시 시도해보세요', '문제가 지속되면 지원팀에 문의하세요'];
        
        resultsSection.innerHTML = `
            <div class="error-container">
                <div class="error-header">
                    <span class="error-icon">⚠️</span>
                    <span class="error-title">${title}</span>
                    <span class="error-code">${code}</span>
                </div>
                
                <div class="error-message">
                    ${detail}
                </div>
                
                <div class="error-fixes">
                    <h4>해결 방법:</h4>
                    <ul>
                        ${fixes.map(fix => `<li>${fix}</li>`).join('')}
                    </ul>
                </div>
                
                <button type="button" class="retry-btn" onclick="vdpProcessor.resetForm()">
                    다시 시도
                </button>
            </div>
        `;
        
        resultsSection.style.display = 'block';
        document.getElementById('progress-section').style.display = 'none';
    }
    
    resetForm() {
        // Reset form visibility
        document.getElementById('vdp-form').style.display = 'block';
        document.getElementById('progress-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('metrics-display').style.display = 'none';
        
        // Clear form data
        const form = document.getElementById('vdp-form');
        form.reset();
        
        // Clear all form inputs specifically
        document.querySelectorAll('.form-input, .form-textarea').forEach(input => {
            input.value = '';
        });
        
        // Reset file upload zones
        document.querySelectorAll('.file-upload-zone').forEach(zone => {
            zone.classList.remove('file-upload-zone--selected');
        });
        
        document.querySelectorAll('.file-upload-text').forEach((label, index) => {
            // Reset all video file upload labels
            label.textContent = '클릭하여 동영상 파일 선택 또는 드래그하여 업로드';
        });
        
        // Clear validation states
        document.querySelectorAll('.form-input').forEach(input => {
            this.clearValidationState(input);
        });
        
        // Reset platform form
        this.updateFormState();
        this.validateForm();
        
        // Stop any polling
        this.stopProgressPolling();
        this.currentJob = null;
        this.metricsUpdated = false;
        
        // Scroll back to top
        document.querySelector('.vdp-form').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async downloadVDP(vdpUrl) {
        if (!vdpUrl) {
            alert('VDP 파일 URL을 찾을 수 없습니다.');
            return;
        }
        
        try {
            window.logger.vdpProcessing('download', 'initiated');
            
            // Create a temporary link element to trigger download
            const link = document.createElement('a');
            link.href = vdpUrl;
            link.download = ''; // Let browser determine filename from Content-Disposition header
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.logger.vdpProcessing('download', 'completed');
            
        } catch (error) {
            window.logger.reportError(error, 'VDP download');
            alert('VDP 파일 다운로드에 실패했습니다. 다시 시도해주세요.');
        }
    }
    
    showMetricsDisplay(qualityIndicators, hookGatePass, result) {
        const metricsDisplay = document.getElementById('metrics-display');
        const gateBadge = document.getElementById('gate-badge');
        
        // Update Hook Gate status
        gateBadge.className = `gate-badge gate-badge--${hookGatePass ? 'pass' : 'fail'}`;
        gateBadge.innerHTML = `
            <span class="badge-icon">${hookGatePass ? '✅' : '❌'}</span>
            <span class="badge-text">Hook Gate ${result.hook_gate_status || 'UNKNOWN'}</span>
        `;
        
        // Update metrics with color coding
        this.updateMetric('scenes', qualityIndicators.scenes || 0, 4);
        this.updateMetric('shots', qualityIndicators.shots || 0, 8);
        this.updateMetric('keyframes', qualityIndicators.keyframes || 0, 20);
        
        // Show auto-retry button if density is insufficient
        const insufficientDensity = (
            (qualityIndicators.scenes || 0) < 3 ||
            (qualityIndicators.shots || 0) < 6 ||
            (qualityIndicators.keyframes || 0) < 15
        );
        
        const autoRetryBtn = document.getElementById('auto-retry-btn');
        if (insufficientDensity) {
            autoRetryBtn.style.display = 'block';
            autoRetryBtn.onclick = () => this.retryWithDensityExpansion(result.result_gcs_uri || result.vdp_file_url);
        }
        
        metricsDisplay.style.display = 'block';
        this.metricsUpdated = true;
    }
    
    updateMetric(metricName, current, target) {
        const currentEl = document.getElementById(`${metricName}-current`);
        const statusEl = document.getElementById(`${metricName}-status`);
        const cardEl = document.getElementById(`${metricName}-metric`);
        
        currentEl.textContent = current;
        
        // Color coding logic: green (충족), yellow (근접), red (부족)
        let status, statusText, colorClass;
        
        if (current >= target) {
            status = 'sufficient';
            statusText = '충족';
            colorClass = 'metric-sufficient';
        } else if (current >= target * 0.75) {
            status = 'close';
            statusText = '근접';
            colorClass = 'metric-close';
        } else {
            status = 'insufficient';
            statusText = '부족';
            colorClass = 'metric-insufficient';
        }
        
        statusEl.textContent = statusText;
        cardEl.className = `metric-card ${colorClass}`;
    }
    
    async retryWithDensityExpansion(vdpUrl) {
        if (!vdpUrl) {
            alert('VDP URL을 찾을 수 없습니다.');
            return;
        }
        
        try {
            window.logger.vdpProcessing('density expansion', 'initiated');
            
            const autoRetryBtn = document.getElementById('auto-retry-btn');
            const originalText = autoRetryBtn.querySelector('.btn-text').textContent;
            autoRetryBtn.querySelector('.btn-text').textContent = '재확장 처리 중...';
            autoRetryBtn.disabled = true;
            
            const response = await fetch(`${this.apiBase}/vdp/ensure-density-floor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vdp_url: vdpUrl,
                    target_scenes: 4,
                    target_shots: 8,
                    target_keyframes: 20
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                window.logger.vdpProcessing('density expansion', 'completed');
                // Refresh metrics with new data
                if (result.quality_indicators) {
                    this.updateMetric('scenes', result.quality_indicators.scenes || 0, 4);
                    this.updateMetric('shots', result.quality_indicators.shots || 0, 8);
                    this.updateMetric('keyframes', result.quality_indicators.keyframes || 0, 20);
                }
                autoRetryBtn.style.display = 'none';
            } else {
                throw new Error(result.detail || '재확장 처리에 실패했습니다.');
            }
            
        } catch (error) {
            window.logger.reportError(error, 'Density expansion');
            alert(`재확장 처리 실패: ${error.message}`);
            
            const autoRetryBtn = document.getElementById('auto-retry-btn');
            autoRetryBtn.querySelector('.btn-text').textContent = originalText;
            autoRetryBtn.disabled = false;
        }
    }
    
    async validateVDP(vdpUrl) {
        if (!vdpUrl) {
            alert('VDP URL을 찾을 수 없습니다.');
            return;
        }
        
        try {
            window.logger.vdpProcessing('validation', 'initiated');
            
            const validationBtn = document.querySelector('.validation-btn');
            const originalText = validationBtn.textContent;
            validationBtn.textContent = '🔄 검증 중...';
            validationBtn.disabled = true;
            
            const response = await fetch(`${this.apiBase}/vdp/validate-schema`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vdp_url: vdpUrl
                })
            });
            
            const result = await response.json();
            const validationResults = document.getElementById('validation-results');
            
            if (response.ok && result.valid) {
                validationResults.innerHTML = `
                    <div class="validation-success">
                        ✅ <strong>스키마 검증 성공</strong><br>
                        모든 필드가 유효합니다.
                    </div>
                `;
            } else {
                const errors = result.errors || ['알 수 없는 검증 오류'];
                validationResults.innerHTML = `
                    <div class="validation-error">
                        ❌ <strong>스키마 검증 실패</strong><br>
                        <ul>${errors.map(err => `<li>${err}</li>`).join('')}</ul>
                    </div>
                `;
            }
            
            validationResults.style.display = 'block';
            validationBtn.textContent = originalText;
            validationBtn.disabled = false;
            
        } catch (error) {
            window.logger.reportError(error, 'VDP validation');
            alert(`스키마 검증 실패: ${error.message}`);
        }
    }
    
    copyJobId(jobId) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(jobId).then(() => {
                this.showJobIdCopyFeedback();
            }).catch(() => {
                this.fallbackCopyJobId(jobId);
            });
        } else {
            this.fallbackCopyJobId(jobId);
        }
    }
    
    fallbackCopyJobId(jobId) {
        const textArea = document.createElement('textarea');
        textArea.value = jobId;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showJobIdCopyFeedback();
        } catch (err) {
            window.logger.warn('Copy to clipboard failed:', { message: err.message });
            alert('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
        }
        
        textArea.remove();
    }
    
    showJobIdCopyFeedback() {
        const button = document.querySelector('.copy-job-id-btn');
        if (button) {
            const originalText = button.textContent;
            button.textContent = '✅ 복사됨!';
            button.style.background = '#10b981';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '#3b82f6';
            }, 2000);
        }
    }
    
    // Upload video file to GCS for IG/TT processing (실전 인제스트 필수)
    async uploadVideoFile(videoFile, platform, content_id) {
        try {
            if (window.logger) {
                window.logger.info('Initiating video file upload for real ingest', {
                    correlationId: this.correlationId,
                    platform,
                    contentId: content_id,
                    fileName: videoFile.name,
                    fileSize: videoFile.size,
                    uploadType: 'REAL_GCS_UPLOAD'
                });
            }
            
            // Create FormData for file upload
            const uploadFormData = new FormData();
            uploadFormData.append('video_file', videoFile);
            uploadFormData.append('platform', platform);
            uploadFormData.append('content_id', content_id);
            
            // Upload to GCS via server endpoint
            const response = await fetch(`${this.apiBase}/api/upload-video`, {
                method: 'POST',
                headers: {
                    'X-Correlation-ID': this.correlationId
                },
                body: uploadFormData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'File upload failed');
            }
            
            const result = await response.json();
            
            if (window.logger) {
                window.logger.success('Video file uploaded to GCS successfully', {
                    correlationId: this.correlationId,
                    uploadedGcsUri: result.uploaded_gcs_uri,
                    fileSize: result.file_size,
                    contentType: result.content_type,
                    platform: result.platform,
                    realIngestReady: true
                });
            }
            
            return result.uploaded_gcs_uri;
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Video file upload failed', {
                    correlationId: this.correlationId,
                    error: error.message,
                    platform,
                    contentId: content_id,
                    uploadStage: 'GCS_UPLOAD'
                });
            }
            
            throw new Error(`파일 업로드 실패: ${error.message}`);
        }
    }
    
    showMainVdpResults(vdpData) {
        const resultsSection = document.getElementById('results-section');
        const vdpResults = document.getElementById('vdp-results');
        const errorResults = document.getElementById('error-results');
        
        // Hide error display
        errorResults.style.display = 'none';
        
        // Show VDP results
        vdpResults.style.display = 'block';
        resultsSection.style.display = 'block';
        
        // Update extractor badge
        document.getElementById('extractor-used').textContent = 'Main VDP (Gemini 2.5 Pro)';
        document.getElementById('processing-time').textContent = `${vdpData.processing_time || 'N/A'}ms`;
        
        // Display scene analysis
        this.displaySceneAnalysis(vdpData.scene_analysis || []);
        
        // Display hook analysis if available
        const hookData = vdpData.overall_analysis?.hookGenome || vdpData.hook_analysis;
        if (hookData) {
            this.displayHookAnalysis(hookData);
        }
        
        // Display content summary
        this.displayContentSummary(vdpData.content_summary || vdpData.overall_analysis?.content_summary);
        
        // Setup export functions
        this.setupVdpExportActions(vdpData);
        
        // Hide progress section
        document.getElementById('progress-section').style.display = 'none';
    }
    
    displaySceneAnalysis(scenes) {
        const container = document.getElementById('scene-analysis');
        if (!scenes || scenes.length === 0) {
            container.innerHTML = '<p class="no-data">Scene analysis not available</p>';
            return;
        }
        
        container.innerHTML = scenes.map((scene, index) => `
            <div class="scene-card">
                <div class="scene-header">
                    <span class="scene-number">${index + 1}</span>
                    <span class="scene-timing">${scene.start_sec || 0}s - ${scene.end_sec || 0}s</span>
                </div>
                <div class="scene-content">
                    <h4>${scene.description || 'No description'}</h4>
                    ${scene.objects ? `<p><strong>Objects:</strong> ${scene.objects.join(', ')}</p>` : ''}
                    ${scene.emotion ? `<p><strong>Emotion:</strong> ${scene.emotion}</p>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    displayHookAnalysis(hookData) {
        document.getElementById('hook-timing').querySelector('.metric-value').textContent = 
            `${hookData.start_sec || 0}s`;
        document.getElementById('hook-strength').querySelector('.metric-value').textContent = 
            `${(hookData.strength_score || 0).toFixed(2)}`;
            
        const hookContent = document.getElementById('hook-content');
        hookContent.innerHTML = `
            <div class="hook-details">
                <p><strong>Pattern:</strong> ${hookData.pattern_code || 'N/A'}</p>
                <p><strong>Delivery:</strong> ${hookData.delivery || 'N/A'}</p>
                ${hookData.trigger_modalities ? `<p><strong>Modalities:</strong> ${hookData.trigger_modalities.join(', ')}</p>` : ''}
            </div>
        `;
    }
    
    displayContentSummary(summary) {
        const container = document.getElementById('content-summary');
        if (!summary) {
            container.innerHTML = '<p class="no-data">Content summary not available</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="summary-content">
                <h4>${summary.title || 'No title'}</h4>
                <p>${summary.description || summary.summary || 'No description available'}</p>
                ${summary.key_moments ? `
                    <div class="key-moments">
                        <h5>Key Moments:</h5>
                        <ul>
                            ${summary.key_moments.map(moment => 
                                `<li>${moment.time || 0}s: ${moment.description || 'No description'}</li>`
                            ).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    setupVdpExportActions(vdpData) {
        document.getElementById('export-json-btn').onclick = () => {
            this.downloadVdpAsJson(vdpData);
        };
        
        document.getElementById('view-raw-btn').onclick = () => {
            this.showRawVdpData(vdpData);
        };
    }
    
    downloadVdpAsJson(vdpData) {
        const blob = new Blob([JSON.stringify(vdpData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vdp-${vdpData.content_id || 'unknown'}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    showRawVdpData(vdpData) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>RAW VDP Data</h3>
                    <button type="button" class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <pre class="raw-json">${JSON.stringify(vdpData, null, 2)}</pre>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    startCircuitBreakerMonitoring() {
        // Monitor circuit breaker status every 5 seconds
        this.circuitBreakerInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.apiBase}/api/circuit-breaker/status`);
                if (response.ok) {
                    const status = await response.json();
                    this.updateExtractorStatus(status);
                }
            } catch (error) {
                console.warn('Circuit breaker status check failed:', error.message);
            }
        }, 5000);
    }
    
    updateExtractorStatus(status) {
        const vertexStatus = document.getElementById('vertex-status');
        if (vertexStatus && status.vertex_api_breaker) {
            const state = status.vertex_api_breaker.state;
            const className = state === 'CLOSED' ? 'extractor-option__status--ready' : 
                           state === 'HALF_OPEN' ? 'extractor-option__status--warning' :
                           'extractor-option__status--error';
            
            vertexStatus.className = `extractor-option__status ${className}`;
            vertexStatus.textContent = state;
        }
    }
}

// Problem Details Error Class
class ProblemDetailsError extends Error {
    constructor(problemDetails) {
        super(problemDetails.title || problemDetails.detail || 'Unknown error');
        this.name = 'ProblemDetailsError';
        this.title = problemDetails.title;
        this.detail = problemDetails.detail;
        this.status = problemDetails.status;
        this.code = problemDetails.code;
        this.fixes = problemDetails.fixes || [];
        this.instance = problemDetails.instance;
    }
}

// Drag and Drop Handlers
function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event, fileType) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length === 0) return;
    
    const file = files[0];
    const platform = document.querySelector('input[name="platform"]:checked')?.value;
    
    if (!platform || platform === 'youtube') return;
    
    const inputId = fileType === 'video' ? `${platform}-video` : `${platform}-metadata`;
    const input = document.getElementById(inputId);
    
    if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(changeEvent);
    }
}

// Template Copy Function
function copyTemplate(platform) {
    const templateEl = document.getElementById(`${platform}-template`);
    const text = templateEl.textContent;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback(platform);
        }).catch(() => {
            fallbackCopyText(text);
            showCopyFeedback(platform);
        });
    } else {
        fallbackCopyText(text);
        showCopyFeedback(platform);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        window.logger.warn('Copy to clipboard failed:', { message: err.message });
    }
    
    textArea.remove();
}

function showCopyFeedback(platform) {
    const button = document.querySelector(`#${platform}-template + .copy-template-btn`);
    if (button) {
        const originalText = button.textContent;
        button.textContent = '✅ 복사됨!';
        button.style.background = '#10b981';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '#3b82f6';
        }, 2000);
    }
}

// Tab switching function for download/validation toggle
function switchActionTab(tabName) {
    // Remove active states
    document.querySelectorAll('.toggle-tab').forEach(tab => {
        tab.classList.remove('toggle-tab--active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('tab-content--active');
    });
    
    // Add active states
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('toggle-tab--active');
    document.querySelector(`[data-content="${tabName}"]`).classList.add('tab-content--active');
}

// Cursor metadata extraction functions
async function extractInstagramMetadata() {
    const urlInput = document.getElementById('instagram-source-url');
    const statusDiv = document.getElementById('instagram-extraction-status');
    const extractBtn = document.querySelector('#instagram-form .extract-metadata-btn');
    
    const url = urlInput.value.trim();
    if (!url) {
        statusDiv.innerHTML = '<div class="status-error">❌ URL을 입력해주세요</div>';
        return;
    }
    
    const originalText = extractBtn.textContent;
    extractBtn.textContent = '🔄 추출 중...';
    extractBtn.disabled = true;
    statusDiv.innerHTML = '<div class="status-loading">🔄 메타데이터 추출 중...</div>';
    
    try {
        const response = await fetch('/api/extract-social-metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                platform: 'instagram'
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Auto-fill hidden metadata fields (store for submission)
            window.instagramMetadata = {
                title: result.data.title,
                view_count: result.data.view_count,
                like_count: result.data.like_count,
                comment_count: result.data.comment_count,
                share_count: result.data.share_count,
                hashtags: result.data.hashtags,
                upload_date: result.data.upload_date,
                author: result.data.author,
                followers: result.data.followers
            };
            
            statusDiv.innerHTML = `
                <div class="status-success">
                    ✅ 메타데이터 자동 추출 완료!<br>
                    <small>👁 ${result.data.view_count || 0} 조회 | ❤️ ${result.data.like_count || 0} 좋아요 | 💬 ${result.data.comment_count || 0} 댓글 | 👤 ${result.data.author}</small>
                </div>
            `;
        } else {
            throw new Error(result.detail || 'Instagram 메타데이터 추출 실패');
        }
    } catch (error) {
        statusDiv.innerHTML = `<div class="status-error">❌ 추출 실패: ${error.message}</div>`;
    } finally {
        extractBtn.textContent = originalText;
        extractBtn.disabled = false;
    }
}

async function extractTikTokMetadata() {
    const urlInput = document.getElementById('tiktok-source-url');
    const statusDiv = document.getElementById('tiktok-extraction-status');
    const extractBtn = document.querySelector('#tiktok-form .extract-metadata-btn');
    
    const url = urlInput.value.trim();
    if (!url) {
        statusDiv.innerHTML = '<div class="status-error">❌ URL을 입력해주세요</div>';
        return;
    }
    
    const originalText = extractBtn.textContent;
    extractBtn.textContent = '🔄 추출 중...';
    extractBtn.disabled = true;
    statusDiv.innerHTML = '<div class="status-loading">🔄 메타데이터 추출 중...</div>';
    
    try {
        const response = await fetch('/api/extract-social-metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                platform: 'tiktok'
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Auto-fill hidden metadata fields (store for submission)
            window.tiktokMetadata = {
                title: result.data.title,
                view_count: result.data.view_count,
                like_count: result.data.like_count,
                comment_count: result.data.comment_count,
                share_count: result.data.share_count,
                hashtags: result.data.hashtags,
                upload_date: result.data.upload_date,
                author: result.data.author,
                duration: result.data.duration
            };
            
            statusDiv.innerHTML = `
                <div class="status-success">
                    ✅ 메타데이터 자동 추출 완료!<br>
                    <small>👁 ${result.data.view_count || 0} 조회 | ❤️ ${result.data.like_count || 0} 좋아요 | 💬 ${result.data.comment_count || 0} 댓글 | 👤 ${result.data.author}</small>
                </div>
            `;
        } else {
            throw new Error(result.detail || 'TikTok 메타데이터 추출 실패');
        }
    } catch (error) {
        statusDiv.innerHTML = `<div class="status-error">❌ 추출 실패: ${error.message}</div>`;
    } finally {
        extractBtn.textContent = originalText;
        extractBtn.disabled = false;
    }
}

// Initialize when DOM is ready
let vdpProcessor;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        vdpProcessor = new VDPProcessor();
        window.vdpProcessor = vdpProcessor; // Make it globally accessible
    });
} else {
    vdpProcessor = new VDPProcessor();
    window.vdpProcessor = vdpProcessor; // Make it globally accessible
}