const express = require('express');
const path = require('path');
const cors = require('cors');

// Import the URL normalizer (ES6 import in CommonJS using dynamic import)
let normalizeSocialUrl;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'web-server',
        normalizer_loaded: !!normalizeSocialUrl
    });
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

// Catch-all handler for single page app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

const PORT = process.env.PORT || 9001;

// Initialize server
async function startServer() {
    await loadNormalizer();
    
    app.listen(PORT, () => {
        console.log(`🚀 Web server running on http://localhost:${PORT}`);
        console.log(`📝 URL normalization endpoint: POST /api/normalize-url`);
        console.log(`🔗 UI available at: http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);