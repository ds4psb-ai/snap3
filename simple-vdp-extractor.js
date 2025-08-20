// Simple VDP Extractor Integration - Phase 2
// Connects main web server (8080) to VDP extractor functionality

const express = require('express');
const cors = require('cors');

const app = express();
const port = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Simple VDP extraction endpoint
app.post('/api/vdp/extract', async (req, res) => {
    try {
        const { url, platform = "youtube", content_id } = req.body;
        
        console.log(`🔄 VDP extraction request: ${platform} - ${content_id}`);
        
        // Mock VDP response for now (to test integration)
        const mockVdpResponse = {
            success: true,
            content_id: content_id,
            platform: platform,
            vdp_data: {
                overall_analysis: {
                    hookGenome: {
                        pattern_code: "CURIOSITY_HOOK",
                        delivery: "Visual storytelling with emotional progression",
                        start_sec: 2.1,
                        strength_score: 0.85,
                        microbeats_sec: [0.5, 1.2, 2.1],
                        trigger_modalities: ["visual", "narrative"]
                    },
                    scene_analysis: {
                        total_scenes: 3,
                        pacing: "dynamic",
                        visual_style: "professional"
                    },
                    content_summary: {
                        description: `Extracted VDP for ${platform} content: ${content_id}`,
                        key_themes: ["engagement", "viral_potential", "platform_optimization"]
                    }
                },
                metadata: {
                    platform: platform,
                    content_id: content_id,
                    source_url: url,
                    language: "en",
                    video_origin: "social_media"
                },
                load_timestamp: new Date().toISOString(),
                load_date: new Date().toISOString().split('T')[0]
            },
            processing_time_ms: 1200,
            created_at: new Date().toISOString()
        };
        
        res.json(mockVdpResponse);
        
    } catch (error) {
        console.error('VDP extraction error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'simple-vdp-extractor',
        port: port,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Simple VDP Extractor running on http://localhost:${port}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /api/vdp/extract - VDP extraction`);
    console.log(`   GET  /api/health      - Health check`);
});