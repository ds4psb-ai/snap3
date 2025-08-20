const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test VDP submission endpoint
app.post('/api/vdp/test-submit', (req, res) => {
    console.log('📝 Test submission received');
    
    // Simulate successful job creation
    const mockJobId = `test-job-${Date.now()}`;
    res.json({
        job_id: mockJobId,
        platform: 'youtube',
        status: 'submitted',
        message: 'Test submission successful'
    });
});

// Test job status endpoint
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

// Health endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'test-backend' });
});

// VDP validation endpoint
app.post('/api/vdp/validate-schema', (req, res) => {
    res.json({
        valid: true,
        message: 'Schema validation passed'
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Test backend running on http://localhost:${PORT}`);
    console.log(`📊 Ready to demonstrate VDP UI metrics`);
});