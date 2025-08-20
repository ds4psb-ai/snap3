import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { loadConfig, validateConfig, getConfigSummary } from './utils/config';
import { createLogger, createRequestLogger } from './utils/logger';
import { GitHubVDPExtractorService } from './services/github-vdp-extractor.service';
import { VDPController } from './controllers/vdp.controller';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { 
  createErrorHandler, 
  createNotFoundHandler, 
  createAsyncHandler 
} from './middleware/error-handler';

// Load configuration
const config = loadConfig();
validateConfig(config);

// Create logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE,
  serviceName: 'vdp-extractor',
});

// Log startup information
logger.info('Starting VDP Extractor Service', {
  version: '1.0.0',
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
  config: getConfigSummary(config),
});

// Create Express app
const app = express();

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
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use(createRequestLogger(logger));

// Rate limiting middleware
const rateLimitMiddleware = createRateLimitMiddleware({
  windowMs: config.server.rateLimitWindowMs,
  maxRequests: config.server.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later',
  keyGenerator: (req) => req.ip || 'unknown',
}, logger);

app.use('/api', rateLimitMiddleware);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = config.processing.tempDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.processing.maxFileSizeMB * 1024 * 1024, // Convert MB to bytes
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/avi',
      'video/mov',
      'video/quicktime',
      'video/x-msvideo',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// Initialize services
let vdpService: GitHubVDPExtractorService;
let vdpController: VDPController;

try {
  vdpService = new GitHubVDPExtractorService(config);
  vdpController = new VDPController(vdpService, logger);
  logger.info('Services initialized successfully');
} catch (error) {
  logger.error('Failed to initialize services:', error);
  process.exit(1);
}

// API Routes
const apiRouter = express.Router();

// Health check endpoint (no rate limiting)
app.get('/health', createAsyncHandler(vdpController.healthCheck));

// Service info endpoint
apiRouter.get('/info', createAsyncHandler(vdpController.getServiceInfo));

// Metrics endpoint
apiRouter.get('/metrics', createAsyncHandler(vdpController.getMetrics));

// VDP extraction endpoints
apiRouter.post('/extract', createAsyncHandler(vdpController.extractFromUrl));
apiRouter.get('/extract', createAsyncHandler(vdpController.extractFromQuery));
apiRouter.post('/extract/batch', createAsyncHandler(vdpController.extractBatch));
apiRouter.post('/extract/file', upload.single('video'), createAsyncHandler(vdpController.extractFromFile));

// Mount API router
app.use('/api/v1', apiRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'VDP Extractor Service',
    version: '1.0.0',
    description: 'Viral DNA Profile extraction service for social media content analysis',
    endpoints: {
      health: '/health',
      info: '/api/v1/info',
      metrics: '/api/v1/metrics',
      extract: {
        url: 'POST /api/v1/extract',
        query: 'GET /api/v1/extract?url=<url>',
        batch: 'POST /api/v1/extract/batch',
        file: 'POST /api/v1/extract/file',
      },
    },
    documentation: 'https://github.com/your-org/vdp-extractor',
  });
});

// Error handling middleware
app.use(createNotFoundHandler(logger));
app.use(createErrorHandler(logger));

// Graceful shutdown handling
let server: any;

function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close((err: any) => {
      if (err) {
        logger.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      logger.info('Server closed successfully');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  gracefulShutdown('unhandledRejection');
});

// Start server
async function startServer() {
  try {
    // Test service health before starting
    const health = await vdpService.healthCheck();
    if (health.status === 'unhealthy') {
      logger.error('Services are unhealthy, cannot start server');
      process.exit(1);
    }
    
    if (health.status === 'degraded') {
      logger.warn('Some services are degraded, starting with limited functionality');
    }

    // Start the server on port 3001 (changed from 3001 to avoid conflicts)
    const port = 3005; // Avoid port conflicts with Cursor (3000) and existing services
    server = app.listen(port, () => {
      logger.info(`VDP Extractor Service started successfully`, {
        port: port,
        environment: process.env.NODE_ENV || 'development',
        servicesStatus: health.status,
      });
    });

    // Set server timeout
    server.timeout = 120000; // 2 minutes

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer().catch((error) => {
  logger.error('Startup failed:', error);
  process.exit(1);
});

export default app;