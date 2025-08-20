import dotenv from 'dotenv';
import { VDPExtractorConfig } from '../types';

// Load environment variables
dotenv.config();

export function loadConfig(): VDPExtractorConfig {
  // Validate required environment variables
  const requiredEnvVars = ['GEMINI_API_KEY', 'YOUTUBE_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const config: VDPExtractorConfig = {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY!,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3'),
      timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '30000'),
    },
    youtube: {
      apiKey: process.env.YOUTUBE_API_KEY!,
      maxRetries: parseInt(process.env.YOUTUBE_MAX_RETRIES || '3'),
    },
    server: {
      port: parseInt(process.env.PORT || '3001'),
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
    processing: {
      maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100'),
      tempDir: process.env.TEMP_DIR || './temp',
      maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5'),
    },
  };

  // Optional cache configuration
  if (process.env.REDIS_URL) {
    config.cache = {
      enabled: true,
      ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '3600'), // 1 hour
      redisUrl: process.env.REDIS_URL,
    };
  }

  return config;
}

export function validateConfig(config: VDPExtractorConfig): void {
  // Validate Gemini configuration
  if (!config.gemini.apiKey) {
    throw new Error('Gemini API key is required');
  }

  // Validate YouTube configuration
  if (!config.youtube.apiKey) {
    throw new Error('YouTube API key is required');
  }

  // Validate server configuration
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error('Invalid server port');
  }

  // Validate processing configuration
  if (config.processing.maxFileSizeMB < 1 || config.processing.maxFileSizeMB > 1000) {
    throw new Error('Invalid max file size (must be between 1-1000 MB)');
  }

  if (config.processing.maxConcurrentJobs < 1 || config.processing.maxConcurrentJobs > 20) {
    throw new Error('Invalid max concurrent jobs (must be between 1-20)');
  }

  console.log('✅ Configuration validated successfully');
}

export function getConfigSummary(config: VDPExtractorConfig): object {
  return {
    gemini: {
      model: config.gemini.model,
      maxRetries: config.gemini.maxRetries,
      timeoutMs: config.gemini.timeoutMs,
    },
    youtube: {
      maxRetries: config.youtube.maxRetries,
    },
    server: {
      port: config.server.port,
      corsOrigin: config.server.corsOrigin,
      rateLimitWindowMs: config.server.rateLimitWindowMs,
      rateLimitMaxRequests: config.server.rateLimitMaxRequests,
    },
    processing: {
      maxFileSizeMB: config.processing.maxFileSizeMB,
      tempDir: config.processing.tempDir,
      maxConcurrentJobs: config.processing.maxConcurrentJobs,
    },
    cache: config.cache
      ? {
          enabled: config.cache.enabled,
          ttlSeconds: config.cache.ttlSeconds,
        }
      : { enabled: false },
  };
}