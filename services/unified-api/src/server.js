/**
 * Unified VDP API Server
 * Single endpoint for all platform VDP submissions
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { handleVdpSubmit, getJobStatus, downloadVDP } = require('./handlers/vdp-submit');
const { handleSimpleTest, getSimpleJobStatus } = require('./handlers/simple-test');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081', 'https://app.outlier.example'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Rate limiting
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 submissions per window per IP
  message: {
    type: 'https://api.outlier.example/problems/rate-limited',
    title: 'Too Many Requests',
    status: 429,
    detail: 'You have exceeded the submission rate limit. Please wait before submitting again.',
    code: 'RATE_LIMITED',
    fixes: ['Wait 15 minutes before next submission', 'Contact support for higher limits']
  },
  standardHeaders: true,
  legacyHeaders: false
});

const statusLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 status checks per minute per IP
  message: {
    type: 'https://api.outlier.example/problems/rate-limited',
    title: 'Too Many Status Requests',
    status: 429,
    detail: 'You have exceeded the status check rate limit.',
    code: 'STATUS_RATE_LIMITED',
    fixes: ['Reduce polling frequency', 'Use reasonable intervals (5-10 seconds)']
  }
});

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || require('crypto').randomBytes(8).toString('hex');
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  console.log(`[${new Date().toISOString()}] ${requestId} ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'unified-vdp-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API documentation
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Unified VDP API',
    version: '1.0.0',
    description: 'Single endpoint for YouTube, Instagram, and TikTok VDP processing',
    endpoints: {
      'POST /api/vdp/submit': {
        description: 'Submit content for VDP processing',
        platforms: ['youtube', 'instagram', 'tiktok'],
        parameters: {
          platform: 'Platform type (required)',
          url: 'YouTube URL (required for youtube)',
          video_file: 'MP4 file (required for instagram/tiktok)',
          metadata_file: 'JSON metadata (required for instagram/tiktok)',
          language: 'Content language (optional, default: ko)'
        },
        responses: {
          202: 'Accepted - Processing started',
          400: 'Bad Request - Invalid parameters',
          422: 'Unprocessable Entity - Validation failed',
          429: 'Too Many Requests - Rate limited'
        }
      },
      'GET /api/jobs/{job_id}': {
        description: 'Get job status and results',
        responses: {
          200: 'Job status',
          404: 'Job not found'
        }
      }
    },
    error_format: 'RFC 9457 Problem Details',
    rate_limits: {
      submissions: '10 per 15 minutes',
      status_checks: '60 per minute'
    }
  });
});

// Test API routes (for debugging)
app.post('/api/vdp/test-submit', handleSimpleTest);
app.get('/api/test-jobs/:jobId', getSimpleJobStatus);

// Main API routes
app.post('/api/vdp/submit', submitLimiter, handleVdpSubmit);
app.get('/api/jobs/:jobId', statusLimiter, getJobStatus);
app.get('/api/vdp/:contentId/download', statusLimiter, downloadVDP);

// Platform-specific metadata templates
app.get('/api/metadata/template/:platform', (req, res) => {
  const { platform } = req.params;
  
  const templates = {
    instagram: {
      platform: 'instagram_reels',
      source_url: 'https://instagram.com/p/EXAMPLE_ID',
      view_count: 12500,
      like_count: 850,
      comment_count: 42,
      share_count: 25,
      hashtags: ['viral', 'trending', 'reels'],
      cta_types: ['like', 'comment', 'share'],
      original_sound: true,
      upload_date: '2025-08-15T10:00:00Z',
      video_origin: 'Real-Footage'
    },
    tiktok: {
      platform: 'tiktok',
      source_url: 'https://tiktok.com/@user/video/EXAMPLE_ID',
      view_count: 25000,
      like_count: 1200,
      comment_count: 89,
      share_count: 45,
      hashtags: ['fyp', 'viral', 'trending'],
      cta_types: ['like', 'comment', 'share', 'follow'],
      original_sound: false,
      sound_name: 'Popular Sound Title',
      upload_date: '2025-08-15T10:00:00Z',
      video_origin: 'Real-Footage'
    }
  };
  
  if (!templates[platform]) {
    return res.status(404).json({
      type: 'https://api.outlier.example/problems/template-not-found',
      title: 'Template Not Found',
      status: 404,
      detail: `Metadata template for platform '${platform}' not found`,
      code: 'TEMPLATE_NOT_FOUND',
      available_platforms: Object.keys(templates)
    });
  }
  
  res.json({
    platform,
    template: templates[platform],
    instructions: {
      required_fields: ['platform', 'source_url'],
      optional_fields: ['view_count', 'like_count', 'hashtags', 'upload_date'],
      notes: [
        'All numeric fields should be numbers, not strings',
        'Dates should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)',
        'hashtags should be an array of strings without # symbol'
      ]
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error(`[${req.requestId}] Error:`, error);
  
  // Multer errors (file upload)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      type: 'https://api.outlier.example/problems/file-too-large',
      title: 'File Too Large',
      status: 413,
      detail: 'Uploaded file exceeds size limit',
      code: 'FILE_TOO_LARGE',
      fixes: ['Compress video to under 100MB', 'Use shorter video clip']
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      type: 'https://api.outlier.example/problems/unexpected-file',
      title: 'Unexpected File Field',
      status: 400,
      detail: 'Unexpected file field in upload',
      code: 'UNEXPECTED_FILE',
      fixes: ['Use correct field names: video_file, metadata_file', 'Check form data structure']
    });
  }
  
  // JSON parsing errors
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      type: 'https://api.outlier.example/problems/invalid-json',
      title: 'Invalid JSON',
      status: 400,
      detail: 'Request body contains invalid JSON',
      code: 'INVALID_JSON',
      fixes: ['Check JSON syntax', 'Ensure proper quotes and commas']
    });
  }
  
  // Default server error
  res.status(500).json({
    type: 'https://api.outlier.example/problems/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: req.originalUrl,
    code: 'INTERNAL_SERVER_ERROR',
    request_id: req.requestId,
    fixes: ['Try again in a few moments', 'Contact support if problem persists']
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    type: 'https://api.outlier.example/problems/endpoint-not-found',
    title: 'Endpoint Not Found',
    status: 404,
    detail: `Endpoint ${req.method} ${req.originalUrl} not found`,
    code: 'ENDPOINT_NOT_FOUND',
    fixes: ['Check API documentation at /api/docs', 'Verify URL and HTTP method']
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Unified VDP API server running on port ${PORT}`);
  console.log(`📚 API documentation: http://localhost:${PORT}/api/docs`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;