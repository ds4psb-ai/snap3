const express = require('express');
const path = require('path');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const fetch = require('node-fetch');
const multer = require('multer');
const crypto = require('crypto');
const LRU = require('lru-cache');

// Import the URL normalizer (ES6 import in CommonJS using dynamic import)
let normalizeSocialUrl;

// LRU Cache for metadata responses (60-second TTL)
const metadataCache = new LRU({
    max: 500,
    maxAge: 60000 // 60 seconds
});

// GCS Configuration
const storage = new Storage({
    projectId: 'tough-variety-466003-c5',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined
});

// 🚨 CRITICAL: Bucket Policy Enforcement (2025-08-19)
const ALLOWED_RAW_BUCKET = 'tough-variety-raw-central1'; // 단일 표준 버킷 - 절대 변경 금지
const RAW_BUCKET = process.env.RAW_BUCKET || ALLOWED_RAW_BUCKET;

// Bucket validation and enforcement
if (RAW_BUCKET !== ALLOWED_RAW_BUCKET) {
    console.error(`🚨 CRITICAL ERROR: Invalid RAW_BUCKET detected!`);
    console.error(`Expected: ${ALLOWED_RAW_BUCKET}`);
    console.error(`Actual: ${RAW_BUCKET}`);
    console.error(`Source: ${process.env.RAW_BUCKET ? 'Environment Variable' : 'Default'}`);
    console.error(`This violates Regional Alignment Policy. Server will not start.`);
    process.exit(1);
}

console.log(`✅ Bucket validation passed: ${RAW_BUCKET}`);
const GOLD_BUCKET = 'tough-variety-gold';

// Enhanced Logging System
function generateCorrelationId() {
    return crypto.randomBytes(8).toString('hex');
}

// VDP Conversion Function - Transform Cursor response to VDP format
function convertCursorToVDP(cursorData, urlResult, correlationId) {
    const nowISO = new Date().toISOString();
    const loadDate = nowISO.split('T')[0];
    
    // Generate content_key
    const content_key = `${urlResult.platform}:${urlResult.id}`;
    
    structuredLog('info', 'Converting Cursor data to VDP format', {
        contentKey: content_key,
        platform: urlResult.platform,
        contentId: urlResult.id,
        conversionMode: 'CURSOR_TO_VDP'
    }, correlationId);
    
    // Build VDP structure with Cursor extracted data
    const vdpData = {
        // VDP Required Fields
        content_key,
        content_id: urlResult.id,
        metadata: {
            platform: urlResult.platform.charAt(0).toUpperCase() + urlResult.platform.slice(1),
            language: 'ko',
            video_origin: 'social_media',
            
            // Cursor extracted social metadata
            title: cursorData.data?.title || null,
            view_count: parseInt(cursorData.data?.view_count) || 0,
            like_count: parseInt(cursorData.data?.like_count) || 0,
            comment_count: parseInt(cursorData.data?.comment_count) || 0,
            share_count: parseInt(cursorData.data?.share_count) || 0,
            hashtags: cursorData.data?.hashtags || [],
            upload_date: cursorData.data?.upload_date || null,
            top_comments: cursorData.data?.top_comments || []
        },
        load_timestamp: nowISO,
        load_date: loadDate,
        
        // Source information
        source_url: urlResult.originalUrl,
        canonical_url: urlResult.canonicalUrl,
        extracted_video_url: cursorData.data?.video_url || null,
        
        // Processing metadata
        processing_info: {
            cursor_extraction: {
                success: cursorData.success,
                coverage_percentage: cursorData.coverage_percentage || 0,
                extraction_time_ms: cursorData.performance?.extraction_time || null,
                watermark_free: cursorData.data?.watermark_free || false,
                quality: cursorData.data?.quality || 'unknown'
            },
            conversion_timestamp: nowISO,
            correlation_id: correlationId,
            conversion_version: '1.0'
        }
    };
    
    structuredLog('success', 'VDP conversion completed', {
        contentKey: content_key,
        platform: urlResult.platform,
        metadataFields: Object.keys(vdpData.metadata).length,
        conversionSuccess: true
    }, correlationId);
    
    return vdpData;
}

function structuredLog(level, message, data = {}, correlationId = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        correlationId,
        service: 'simple-web-server',
        ...data
    };
    
    const emoji = {
        info: '📝',
        success: '✅', 
        warning: '⚠️',
        error: '❌',
        performance: '⚡',
        security: '🔒',
        validation: '🔍'
    }[level] || '📄';
    
    console.log(`${emoji} [${level.toUpperCase()}] ${message}`, correlationId ? `[${correlationId}]` : '', JSON.stringify(data, null, 2));
    return logEntry;
}

// Request correlation middleware
function addCorrelationId(req, res, next) {
    req.correlationId = generateCorrelationId();
    res.setHeader('X-Correlation-ID', req.correlationId);
    next();
}

const app = express();

// Multer for file uploads (video files only for IG/TT)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept video files only
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(addCorrelationId);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from web directory
app.use(express.static(path.join(__dirname, 'web')));

// Load the URL normalizer module
async function loadNormalizer() {
    try {
        const normalizer = await import('./jobs/url-normalizer.js');
        normalizeSocialUrl = normalizer.normalizeSocialUrl;
        console.log('✅ URL normalizer loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load URL normalizer:', error);
    }
}

// URL normalization endpoint
app.post('/api/normalize-url', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                error: 'URL is required',
                message: 'URL 필드가 필요합니다'
            });
        }

        if (!normalizeSocialUrl) {
            return res.status(500).json({
                error: 'Normalizer not loaded',
                message: 'URL 정규화 모듈이 로드되지 않았습니다'
            });
        }

        // Use the URL normalizer
        const result = await normalizeSocialUrl(url);
        
        console.log('📝 URL normalization result:', {
            originalUrl: result.originalUrl,
            platform: result.platform,
            id: result.id,
            canonicalUrl: result.canonicalUrl
        });

        // Return the normalized data
        res.json({
            platform: result.platform,
            content_id: result.id,
            standard_url: result.canonicalUrl,
            original_url: result.originalUrl,
            expanded_url: result.expandedUrl
        });

    } catch (error) {
        console.error('❌ URL normalization error:', error);
        res.status(400).json({
            error: 'Invalid URL',
            message: error.message || '유효하지 않은 URL입니다'
        });
    }
});

// Enhanced submit endpoint with URL standardization and GCS storage
app.post('/api/submit', async (req, res) => {
    try {
        const { url, metadata } = req.body;
        
        if (!url) {
            return res.status(400).json({
                error: 'URL is required',
                message: 'URL 필드가 필요합니다'
            });
        }

        if (!normalizeSocialUrl) {
            return res.status(500).json({
                error: 'Normalizer not loaded',
                message: 'URL 정규화 모듈이 로드되지 않았습니다'
            });
        }

        console.log('📝 Submit request received:', { url: url.substring(0, 50) + '...' });

        // Step 1: URL standardization
        const urlResult = await normalizeSocialUrl(url);
        console.log('🔄 URL standardized:', {
            platform: urlResult.platform,
            content_id: urlResult.id,
            canonical_url: urlResult.canonicalUrl
        });

        // Step 2: Build ingest request JSON
        const ingestRequest = {
            content_id: urlResult.id,
            platform: urlResult.platform,
            source_url: urlResult.canonicalUrl,
            original_url: urlResult.originalUrl,
            expanded_url: urlResult.expandedUrl,
            language: metadata?.language || 'ko',
            video_origin: metadata?.video_origin || 'unknown',
            submitted_at: new Date().toISOString(),
            submission_type: 'link_input_enhanced',
            metadata: metadata || {}
        };

        // Step 3: Store ingest request in GCS
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `ingest/link-input/${urlResult.id}_${timestamp}.json`;
        
        const bucket = storage.bucket(RAW_BUCKET);
        const file = bucket.file(fileName);
        
        await file.save(JSON.stringify(ingestRequest, null, 2), {
            metadata: {
                contentType: 'application/json',
                metadata: {
                    'vdp-platform': urlResult.platform,
                    'vdp-content-id': urlResult.id,
                    'vdp-submission-type': 'link-input-enhanced',
                    'vdp-language': metadata?.language || 'ko'
                }
            }
        });

        const gcsUri = `gs://${RAW_BUCKET}/${fileName}`;
        console.log('✅ Ingest request stored in GCS:', gcsUri);

        res.json({
            success: true,
            content_id: urlResult.id,
            platform: urlResult.platform,
            gcs_uri: gcsUri,
            standardized_url: urlResult.canonicalUrl,
            message: 'Ingest request created successfully'
        });

    } catch (error) {
        console.error('❌ Submit endpoint error:', error);
        res.status(500).json({
            error: 'Submit failed',
            message: error.message || 'Submit 처리에 실패했습니다'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'simple-web-server',
        normalizer_loaded: !!normalizeSocialUrl,
        gcs_configured: !!storage
    });
});

// GCS Ingest Request Storage Endpoint (트리거 전용)
app.post('/api/vdp/extract-vertex', async (req, res) => {
    const startTime = Date.now();
    const correlationId = req.correlationId;
    
    structuredLog('info', 'JSON-only submission received', {
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
        endpoint: '/api/vdp/extract-vertex'
    }, correlationId);
    
    // Validate JSON-only submission (FormData/multipart detection)
    if (req.headers['content-type']?.includes('multipart/form-data')) {
        structuredLog('error', 'FormData/multipart submission detected', {
            contentType: req.headers['content-type'],
            errorCode: 'FORMDATA_MULTIPART_DETECTED',
            fix: 'Use JSON-only processing'
        }, correlationId);
        
        return res.status(400).json({
            error: 'FORMDATA_MULTIPART_DETECTED',
            message: 'Only JSON submissions are supported',
            details: 'FormData/multipart detected. Use JSON-only processing.'
        });
    }
    
    // Extract JSON data directly (no FormData processing)
    const platform = req.body.platform;
    const content_id = req.body.content_id;
    const content_key = req.body.content_key; // platform:content_id format
    const source_url = req.body.source_url; // User input URL
    const canonical_url = req.body.canonical_url; // Normalized URL
    const video_origin = req.body.video_origin || 'unknown';
    const language = req.body.language || 'ko';
    
    // Enhanced validation logging with content_key enforcement
    const validationResult = {
        hasContentKey: !!content_key,
        hasContentId: !!content_id,
        hasPlatform: !!platform,
        hasSourceUrl: !!source_url
    };
    
    structuredLog('validation', 'Field validation results', {
        validationResult,
        extractedFields: {
            platform,
            content_id,
            content_key,
            source_url: source_url ? source_url.substring(0, 50) + '...' : null,
            canonical_url: canonical_url ? canonical_url.substring(0, 50) + '...' : null,
            video_origin,
            language
        }
    }, correlationId);
    
    // Content key enforcement validation
    if (!content_id) {
        structuredLog('error', 'Content ID missing - content_key enforcement failed', {
            errorCode: 'CONTENT_ID_MISSING',
            requiredFields: ['content_id', 'platform'],
            fix: 'Provide content_id to generate content_key'
        }, correlationId);
        
        return res.status(400).json({
            error: 'CONTENT_ID_MISSING',
            message: 'content_id is required for content_key generation',
            details: 'Content key enforcement requires content_id field'
        });
    }
    
    if (!platform) {
        structuredLog('error', 'Platform missing - content_key enforcement failed', {
            errorCode: 'PLATFORM_MISSING',
            requiredFields: ['platform', 'content_id'],
            fix: 'Provide platform to generate content_key'
        }, correlationId);
        
        return res.status(400).json({
            error: 'PLATFORM_MISSING', 
            message: 'platform is required for content_key generation',
            details: 'Content key enforcement requires platform field'
        });
    }
    
    // Build standardized ingest request JSON with VDP 공통 필수 필드
    const nowISO = new Date().toISOString(); // RFC3339 UTC Z format
    const loadDate = nowISO.split('T')[0];   // YYYY-MM-DD format
    
    // Content key generation and enforcement
    const generatedContentKey = content_key || `${platform}:${content_id}`;
    
    structuredLog('success', 'Content key generated successfully', {
        contentKey: generatedContentKey,
        platform,
        contentId: content_id,
        enforcement: 'ENABLED',
        globalUniqueness: true
    }, correlationId);
    
    // Platform-specific path validation
    const platformPath = `gs://${RAW_BUCKET}/ingest/requests/${platform}/`;
    const vdpOutputPath = `gs://${RAW_BUCKET}/raw/vdp/${platform}/${content_id}.NEW.universal.json`;
    
    structuredLog('info', 'Platform-specific paths generated', {
        requestPath: platformPath,
        outputPath: vdpOutputPath,
        platform,
        pathStructure: 'PLATFORM_SEGMENTED',
        compliance: 'GCS_PATH_STANDARD'
    }, correlationId);
    
    const ingestRequest = {
        // VDP 공통 필수 필드
        content_key: generatedContentKey,
        content_id,
        metadata: {
            platform: platform.charAt(0).toUpperCase() + platform.slice(1), // YouTube, Instagram, TikTok
            language,
            video_origin
        },
        load_timestamp: nowISO,      // RFC3339 UTC Z
        load_date: loadDate,         // YYYY-MM-DD
        
        // 추가 처리 필드
        source_url,                  // User input URL (정규화 전)
        canonical_url,               // Normalized URL (정규화 후)
        outGcsUri: vdpOutputPath,
        ingest_type: 'link',
        created_at: nowISO,
        correlationId,              // Add correlation ID to request
        
        // 실전 인제스트 필수 필드 (IG/TT)
        ...(req.body.uploaded_gcs_uri && { uploaded_gcs_uri: req.body.uploaded_gcs_uri }),
        ...(req.body.processing_options && { processing_options: req.body.processing_options })
    };
    
    // Add platform-specific metadata (Instagram/TikTok only - 댓글 내용만, 좋아요 제거)
    if (platform === 'instagram' || platform === 'tiktok') {
        // Extract comment data (text only - no author, no likes)
        const comments = [];
        for (let i = 1; i <= 3; i++) {
            const text = req.body[`top_comment_${i}_text`];
            if (text && text.trim()) {
                comments.push({
                    text: text.trim()
                    // 닉네임과 좋아요 필드 모두 제거 완료 - 댓글 내용만 유지
                });
            }
        }
        
        // 기존 metadata 확장 (VDP 공통 필드는 유지)
        ingestRequest.metadata = {
            ...ingestRequest.metadata, // 기존 platform, language, video_origin 유지
            title: req.body.title,
            view_count: parseInt(req.body.view_count) || 0,
            like_count: parseInt(req.body.like_count) || 0,
            comment_count: parseInt(req.body.comment_count) || 0,
            share_count: parseInt(req.body.share_count) || 0,
            hashtags: req.body.hashtags,
            upload_date: req.body.upload_date,
            top_comments: comments
        };
        
        if (platform === 'tiktok') {
            ingestRequest.metadata.duration = parseInt(req.body.duration) || null;
        }
    }
    
    try {
        // Store ingest request in GCS with platform-structured path
        const timestamp = Date.now();
        const fileName = `ingest/requests/${platform}/${content_id}_${timestamp}.json`;
        
        // 🚨 CRITICAL: Final bucket validation before GCS operation
        if (RAW_BUCKET !== ALLOWED_RAW_BUCKET) {
            structuredLog('error', 'CRITICAL: Bucket validation failed during GCS operation', {
                expectedBucket: ALLOWED_RAW_BUCKET,
                actualBucket: RAW_BUCKET,
                errorCode: 'BUCKET_VALIDATION_FAILED',
                fix: 'Restart server with correct RAW_BUCKET'
            }, correlationId);
            
            return res.status(500).json({
                error: 'BUCKET_VALIDATION_FAILED',
                message: 'Invalid bucket configuration detected',
                details: `Expected ${ALLOWED_RAW_BUCKET}, got ${RAW_BUCKET}`,
                correlationId
            });
        }
        
        structuredLog('info', 'GCS operation initiated with validated bucket', {
            bucket: RAW_BUCKET,
            fileName,
            platform,
            contentId: content_id,
            bucketValidation: 'PASSED'
        }, correlationId);
        
        const bucket = storage.bucket(RAW_BUCKET);
        const file = bucket.file(fileName);
        
        await file.save(JSON.stringify(ingestRequest, null, 2), {
            metadata: {
                contentType: 'application/json',
                metadata: {
                    'vdp-platform': platform,
                    'vdp-content-id': content_id,
                    'vdp-content-key': generatedContentKey,
                    'vdp-canonical-url': canonical_url,
                    'vdp-ingest-type': 'link',
                    'vdp-language': language,
                    'vdp-load-date': loadDate,
                    'vdp-correlation-id': correlationId
                }
            }
        });
        
        const gcsUri = `gs://${RAW_BUCKET}/${fileName}`;
        const processingTime = Date.now() - startTime;
        
        structuredLog('success', 'Ingest request stored successfully', {
            gcsUri,
            contentKey: generatedContentKey,
            platform,
            contentId: content_id,
            fileName,
            pathStructure: 'PLATFORM_SEGMENTED',
            jsonOnlyProcessing: true
        }, correlationId);
        
        structuredLog('performance', 'Request processing completed', {
            processingTimeMs: processingTime,
            endpoint: '/api/vdp/extract-vertex',
            contentKey: generatedContentKey,
            status: 'SUCCESS'
        }, correlationId);
        
        // Return success response (no VDP server call)
        res.status(202).json({
            success: true,
            message: '요청이 성공적으로 접수되었습니다',
            job_id: `ingest_${timestamp}_${content_id}`,
            platform: platform,
            content_id: content_id,
            gcs_uri: gcsUri,
            status: 'queued',
            estimated_completion: new Date(Date.now() + 120000).toISOString() // 2 minutes
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        structuredLog('error', 'GCS storage operation failed', {
            error: error.message,
            stack: error.stack,
            contentKey: content_key || `${platform}:${content_id}`,
            platform,
            contentId: content_id,
            processingTimeMs: processingTime,
            errorCode: 'GCS_STORAGE_ERROR'
        }, correlationId);
        
        res.status(500).json({
            error: 'GCS_STORAGE_ERROR',
            message: 'GCS 저장 중 오류가 발생했습니다',
            details: error.message,
            correlationId
        });
    }
});

// Cursor Metadata Extractor Integration Endpoint
app.post('/api/extract-social-metadata', async (req, res) => {
    const startTime = Date.now();
    const correlationId = req.correlationId;
    
    structuredLog('info', 'Cursor metadata extraction request received', {
        url: req.body.url?.substring(0, 50) + '...',
        platform: req.body.platform,
        endpoint: '/api/extract-social-metadata'
    }, correlationId);
    
    try {
        const { url, platform, options = {} } = req.body;
        
        // Check cache first
        const cacheKey = `${platform}:${url}`;
        const cachedResult = metadataCache.get(cacheKey);
        
        if (cachedResult) {
            structuredLog('performance', 'Cache hit for metadata extraction', {
                cacheKey,
                ttlRemaining: metadataCache.getRemainingTTL(cacheKey)
            }, correlationId);
            
            return res.json({
                ...cachedResult,
                cache_hit: true,
                correlationId
            });
        }
        
        // Validation
        if (!url || !platform) {
            structuredLog('error', 'Missing required fields for metadata extraction', {
                hasUrl: !!url,
                hasPlatform: !!platform,
                errorCode: 'REQUIRED_FIELDS_MISSING'
            }, correlationId);
            
            return res.status(400).json({
                error: 'REQUIRED_FIELDS_MISSING',
                message: 'url and platform fields are required',
                correlationId
            });
        }
        
        // Platform validation
        if (!['instagram', 'tiktok'].includes(platform.toLowerCase())) {
            return res.status(400).json({
                error: 'INVALID_PLATFORM',
                message: 'Only Instagram and TikTok metadata extraction supported',
                supported_platforms: ['instagram', 'tiktok'],
                correlationId
            });
        }
        
        // URL normalization first
        if (!normalizeSocialUrl) {
            return res.status(500).json({
                error: 'NORMALIZER_NOT_LOADED',
                message: 'URL normalizer not available',
                correlationId
            });
        }
        
        const urlResult = await normalizeSocialUrl(url);
        
        structuredLog('success', 'URL normalized for metadata extraction', {
            platform: urlResult.platform,
            contentId: urlResult.id,
            canonicalUrl: urlResult.canonicalUrl
        }, correlationId);
        
        // ACTIVE: Cursor API Bridge Integration
        structuredLog('info', 'Initiating Cursor API bridge call', {
            targetUrl: 'http://localhost:3000/api/social/extract',
            platform: urlResult.platform,
            contentId: urlResult.id
        }, correlationId);
        
        let extractionResponse;
        
        try {
            // Call Cursor's metadata extraction API
            const cursorResponse = await fetch('http://localhost:3000/api/social/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Correlation-ID': correlationId
                },
                body: JSON.stringify({
                    url: urlResult.canonicalUrl,
                    platform: urlResult.platform,
                    options: {
                        include_video: options.include_video || false,
                        include_comments: options.include_comments !== false, // default true
                        max_comments: options.max_comments || 3
                    }
                }),
                timeout: 30000 // 30 second timeout
            });
            
            if (!cursorResponse.ok) {
                throw new Error(`Cursor API error: ${cursorResponse.status}`);
            }
            
            const cursorData = await cursorResponse.json();
            
            structuredLog('success', 'Cursor metadata extraction successful', {
                platform: urlResult.platform,
                contentId: urlResult.id,
                coveragePercentage: cursorData.coverage_percentage,
                success: cursorData.success
            }, correlationId);
            
            // Transform Cursor response to VDP format
            extractionResponse = {
                success: cursorData.success,
                platform: urlResult.platform,
                content_id: urlResult.id,
                coverage_percentage: cursorData.coverage_percentage || 0,
                cursor_integration_status: cursorData.success ? 'ACTIVE' : 'FALLBACK',
                data: {
                    content_id: urlResult.id,
                    normalized_url: urlResult.canonicalUrl,
                    original_url: urlResult.originalUrl,
                    
                    // Cursor extracted metadata
                    title: cursorData.data?.title || null,
                    view_count: cursorData.data?.view_count || 0,
                    like_count: cursorData.data?.like_count || 0,
                    comment_count: cursorData.data?.comment_count || 0,
                    share_count: cursorData.data?.share_count || 0,
                    hashtags: cursorData.data?.hashtags || [],
                    upload_date: cursorData.data?.upload_date || null,
                    top_comments: cursorData.data?.top_comments || [],
                    
                    // Video download info
                    video_url: cursorData.data?.video_url || null,
                    
                    // Quality metrics
                    extraction_quality: cursorData.data?.quality || 'unknown',
                    watermark_free: cursorData.data?.watermark_free || false
                },
                performance: {
                    extraction_time_ms: cursorData.performance?.extraction_time || null,
                    api_response_time_ms: Date.now() - startTime
                },
                correlationId
            };
            
        } catch (error) {
            structuredLog('warning', 'Cursor API unavailable - fallback mode activated', {
                error: error.message,
                fallbackMode: 'MANUAL_INPUT',
                cursorStatus: 'UNAVAILABLE'
            }, correlationId);
            
            // Fallback response when Cursor is unavailable
            extractionResponse = {
                success: false,
                platform: urlResult.platform,
                content_id: urlResult.id,
                coverage_percentage: 0,
                cursor_integration_status: 'UNAVAILABLE',
                data: {
                    content_id: urlResult.id,
                    normalized_url: urlResult.canonicalUrl,
                    original_url: urlResult.originalUrl,
                    extraction_ready: true,
                    missing_fields: ['view_count', 'like_count', 'comment_count', 'top_comments'],
                    fallback_needed: true,
                    fallback_reason: error.message
                },
                fallback_options: {
                    manual_form: 'Use web UI for manual metadata input',
                    retry_later: 'Try again when Cursor API is available'
                },
                correlationId
            };
        }
        
        const processingTime = Date.now() - startTime;
        
        structuredLog('info', 'Metadata extraction API ready for Cursor integration', {
            processingTimeMs: processingTime,
            platform: urlResult.platform,
            contentId: urlResult.id,
            integrationStatus: 'READY_FOR_CURSOR'
        }, correlationId);
        
        // Cache successful response
        if (extractionResponse.success) {
            metadataCache.set(cacheKey, extractionResponse);
            structuredLog('performance', 'Response cached successfully', {
                cacheKey,
                ttl: 60000
            }, correlationId);
        }
        
        res.json(extractionResponse);
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        structuredLog('error', 'Metadata extraction API error', {
            error: error.message,
            stack: error.stack,
            processingTimeMs: processingTime,
            errorCode: 'METADATA_EXTRACTION_ERROR'
        }, correlationId);
        
        res.status(500).json({
            error: 'METADATA_EXTRACTION_ERROR',
            message: 'Metadata extraction failed',
            details: error.message,
            correlationId
        });
    }
});

// Enhanced VDP Pipeline Integration - Convert Cursor data and submit to VDP pipeline
app.post('/api/vdp/cursor-extract', async (req, res) => {
    const startTime = Date.now();
    const correlationId = req.correlationId;
    
    structuredLog('info', 'VDP pipeline integration with Cursor extraction initiated', {
        endpoint: '/api/vdp/cursor-extract',
        platform: req.body.platform,
        url: req.body.url?.substring(0, 50) + '...'
    }, correlationId);
    
    try {
        const { url, platform, options = {} } = req.body;
        
        // Step 1: Get metadata from Cursor
        const metadataResponse = await fetch(`http://localhost:8080/api/extract-social-metadata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Correlation-ID': correlationId
            },
            body: JSON.stringify({ url, platform, options })
        });
        
        if (!metadataResponse.ok) {
            throw new Error(`Metadata extraction failed: ${metadataResponse.status}`);
        }
        
        const metadataResult = await metadataResponse.json();
        
        if (!metadataResult.success) {
            structuredLog('warning', 'Cursor extraction failed - using fallback', {
                cursorStatus: 'FAILED',
                fallbackMode: 'PARTIAL_VDP',
                coveragePercentage: metadataResult.coverage_percentage
            }, correlationId);
        }
        
        // Step 2: Convert to VDP format
        if (!normalizeSocialUrl) {
            return res.status(500).json({
                error: 'NORMALIZER_NOT_LOADED',
                message: 'URL normalizer not available',
                correlationId
            });
        }
        
        const urlResult = await normalizeSocialUrl(url);
        const vdpData = convertCursorToVDP(metadataResult, urlResult, correlationId);
        
        // Step 3: Store VDP request in GCS for processing
        const timestamp = Date.now();
        const fileName = `ingest/requests/${platform.toLowerCase()}/${vdpData.content_id}_cursor_${timestamp}.json`;
        
        const bucket = storage.bucket(RAW_BUCKET);
        const file = bucket.file(fileName);
        
        await file.save(JSON.stringify(vdpData, null, 2), {
            metadata: {
                contentType: 'application/json',
                metadata: {
                    'vdp-platform': platform.toLowerCase(),
                    'vdp-content-id': vdpData.content_id,
                    'vdp-content-key': vdpData.content_key,
                    'vdp-cursor-integration': metadataResult.success ? 'ACTIVE' : 'FALLBACK',
                    'vdp-coverage-percentage': metadataResult.coverage_percentage || '0',
                    'vdp-correlation-id': correlationId,
                    'vdp-processing-type': 'cursor_enhanced'
                }
            }
        });
        
        const gcsUri = `gs://${RAW_BUCKET}/${fileName}`;
        const totalProcessingTime = Date.now() - startTime;
        
        structuredLog('success', 'VDP pipeline integration completed', {
            gcsUri,
            contentKey: vdpData.content_key,
            cursorSuccess: metadataResult.success,
            coveragePercentage: metadataResult.coverage_percentage,
            totalProcessingTimeMs: totalProcessingTime
        }, correlationId);
        
        // Return integration response
        res.status(202).json({
            success: true,
            message: 'Cursor 통합 VDP 파이프라인 처리 시작',
            job_id: `vdp_cursor_${timestamp}_${vdpData.content_id}`,
            content_key: vdpData.content_key,
            platform: platform.toLowerCase(),
            content_id: vdpData.content_id,
            gcs_uri: gcsUri,
            cursor_integration: {
                status: metadataResult.cursor_integration_status,
                coverage_percentage: metadataResult.coverage_percentage,
                extraction_success: metadataResult.success
            },
            processing: {
                status: 'queued',
                estimated_completion: new Date(Date.now() + 180000).toISOString(), // 3 minutes
                total_processing_time_ms: totalProcessingTime
            },
            correlationId
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        structuredLog('error', 'VDP pipeline integration failed', {
            error: error.message,
            stack: error.stack,
            processingTimeMs: processingTime,
            errorCode: 'VDP_CURSOR_INTEGRATION_ERROR'
        }, correlationId);
        
        res.status(500).json({
            error: 'VDP_CURSOR_INTEGRATION_ERROR',
            message: 'Cursor VDP 파이프라인 통합 중 오류 발생',
            details: error.message,
            correlationId
        });
    }
});

// Test VDP submission endpoint (for compatibility)
app.post('/api/vdp/test-submit', (req, res) => {
    console.log('📝 Test submission received');
    
    // Simulate successful job creation
    const mockJobId = `test-job-${Date.now()}`;
    res.json({
        job_id: mockJobId,
        platform: req.body.platform || 'unknown',
        status: 'submitted',
        message: 'Test submission successful'
    });
});

// Test job status endpoint (for compatibility)
app.get('/api/test-jobs/:jobId', (req, res) => {
    const { jobId } = req.params;
    
    // Simulate completed job with metrics
    res.json({
        job_id: jobId,
        status: 'completed',
        progress: 100,
        current_step: '완료',
        steps_completed: ['제출 완료', '콘텐츠 다운로드', 'GCS 업로드', 'AI 분석', '품질 검증', '데이터베이스 저장'],
        result: {
            result_gcs_uri: 'gs://test-bucket/test-result.json',
            vdp_file_url: 'https://example.com/test-vdp.json',
            hook_gate_status: 'PASS',
            processing_time: 45.2,
            quality_indicators: {
                scenes: 4,
                shots: 8,
                keyframes: 20,
                hook_strength: 0.85,
                hook_timing: 2.1
            },
            hook_analysis: {
                strength_score: 0.85,
                start_sec: 2.1,
                pattern_code: 'curiosity_gap'
            },
            legacy_mode: false
        }
    });
});

// File Upload Endpoint for IG/TT Video Files
app.post('/api/upload-video', upload.single('video_file'), async (req, res) => {
    const startTime = Date.now();
    const correlationId = req.correlationId;
    
    structuredLog('info', 'Video file upload request received', {
        contentType: req.headers['content-type'],
        platform: req.body.platform,
        contentId: req.body.content_id
    }, correlationId);
    
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'FILE_MISSING',
                message: '비디오 파일이 필요합니다',
                correlationId
            });
        }
        
        const platform = req.body.platform;
        const content_id = req.body.content_id;
        
        if (!platform || !content_id) {
            return res.status(400).json({
                error: 'REQUIRED_FIELDS_MISSING',
                message: 'platform과 content_id가 필요합니다',
                correlationId
            });
        }
        
        if (platform !== 'instagram' && platform !== 'tiktok') {
            return res.status(400).json({
                error: 'INVALID_PLATFORM',
                message: '파일 업로드는 Instagram과 TikTok만 지원됩니다',
                correlationId
            });
        }
        
        // Generate GCS file path
        const timestamp = Date.now();
        const fileExtension = req.file.originalname.split('.').pop() || 'mp4';
        const fileName = `uploads/${platform}/${content_id}_${timestamp}.${fileExtension}`;
        const gcsUri = `gs://${RAW_BUCKET}/${fileName}`;
        
        // Upload to GCS
        const bucket = storage.bucket(RAW_BUCKET);
        const file = bucket.file(fileName);
        
        await file.save(req.file.buffer, {
            metadata: {
                contentType: req.file.mimetype,
                metadata: {
                    'vdp-platform': platform,
                    'vdp-content-id': content_id,
                    'vdp-upload-type': 'video',
                    'vdp-correlation-id': correlationId,
                    'original-filename': req.file.originalname
                }
            }
        });
        
        const processingTime = Date.now() - startTime;
        
        structuredLog('success', 'Video file uploaded to GCS successfully', {
            gcsUri,
            platform,
            contentId: content_id,
            fileSize: req.file.size,
            fileName: req.file.originalname,
            processingTimeMs: processingTime
        }, correlationId);
        
        res.json({
            success: true,
            uploaded_gcs_uri: gcsUri,
            file_size: req.file.size,
            content_type: req.file.mimetype,
            platform,
            content_id,
            correlationId
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        structuredLog('error', 'Video file upload failed', {
            error: error.message,
            stack: error.stack,
            platform: req.body.platform,
            contentId: req.body.content_id,
            processingTimeMs: processingTime
        }, correlationId);
        
        res.status(500).json({
            error: 'UPLOAD_FAILED',
            message: '파일 업로드 중 오류가 발생했습니다',
            details: error.message,
            correlationId
        });
    }
});

const PORT = process.env.PORT || 8080;

// Initialize server
async function startServer() {
    await loadNormalizer();
    
    // Enhanced startup logging with environment validation
    structuredLog('info', 'Server startup initiated', {
        port: PORT,
        rawBucket: RAW_BUCKET,
        goldBucket: GOLD_BUCKET,
        projectId: storage.projectId,
        region: process.env.REGION || 'unspecified',
        nodeEnv: process.env.NODE_ENV || 'development'
    });
    
    // Environment variable validation
    if (RAW_BUCKET === 'tough-variety-raw-central1') {
        structuredLog('info', 'Using standard RAW_BUCKET (Regional Alignment Policy compliant)', {
            standardBucket: RAW_BUCKET,
            recommendedAction: 'Set RAW_BUCKET environment variable for region alignment',
            regionAlignment: 'us-central1 recommended for optimal performance'
        });
    } else {
        structuredLog('success', 'Custom RAW_BUCKET configured for regional alignment', {
            customBucket: RAW_BUCKET,
            regionOptimization: 'ENABLED'
        });
    }
    
    app.listen(PORT, () => {
        structuredLog('success', 'VDP Enhanced Web Server started successfully', {
            serverUrl: `http://localhost:${PORT}`,
            endpoints: {
                normalization: 'POST /api/normalize-url',
                vdpExtract: 'POST /api/vdp/extract-vertex',
                health: 'GET /api/health'
            },
            features: {
                jsonOnlyProcessing: true,
                platformSegmentation: true,
                contentKeyEnforcement: true,
                regionalAlignment: RAW_BUCKET === 'tough-variety-raw-central1'
            }
        });
        
        console.log(`🚀 Simple web server running on http://localhost:${PORT}`);
        console.log(`📝 URL normalization endpoint: POST /api/normalize-url`);
        console.log(`🔗 UI available at: http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);