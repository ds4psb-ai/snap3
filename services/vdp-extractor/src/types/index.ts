export * from '../schemas/viral-dna-profile';

// API Request/Response types
export interface ExtractVDPRequest {
  url: string;
  platform?: 'youtube' | 'tiktok' | 'instagram' | 'auto';
  options?: {
    includeContentAnalysis?: boolean;
    includeViralFactors?: boolean;
    maxComments?: number;
    deepAnalysis?: boolean;
    skipCache?: boolean;
  };
}

export interface ExtractVDPResponse {
  success: boolean;
  data?: ViralDNAProfile;
  error?: string;
  processingTime?: number;
  cacheHit?: boolean;
}

export interface BatchExtractRequest {
  urls: string[];
  options?: ExtractVDPRequest['options'];
}

export interface BatchExtractResponse {
  success: boolean;
  results: Array<{
    url: string;
    result: ExtractVDPResponse;
  }>;
  totalProcessingTime: number;
}

// Service configuration types
export interface VDPExtractorConfig {
  gemini: {
    apiKey: string;
    model: string;
    maxRetries: number;
    timeoutMs: number;
  };
  youtube: {
    apiKey: string;
    maxRetries: number;
  };
  server: {
    port: number;
    corsOrigin: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
  processing: {
    maxFileSizeMB: number;
    tempDir: string;
    maxConcurrentJobs: number;
  };
  cache?: {
    enabled: boolean;
    ttlSeconds: number;
    redisUrl?: string;
  };
}

// Error types
export class VDPExtractionError extends Error {
  public readonly step: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly originalError?: Error;

  constructor(
    message: string,
    step: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    originalError?: Error
  ) {
    super(message);
    this.name = 'VDPExtractionError';
    this.step = step;
    this.severity = severity;
    this.originalError = originalError;
  }
}

export class PlatformNotSupportedError extends VDPExtractionError {
  constructor(platform: string) {
    super(`Platform ${platform} is not supported`, 'platform-detection', 'high');
    this.name = 'PlatformNotSupportedError';
  }
}

export class ContentNotAccessibleError extends VDPExtractionError {
  constructor(url: string, reason?: string) {
    super(
      `Content at ${url} is not accessible${reason ? `: ${reason}` : ''}`,
      'content-access',
      'high'
    );
    this.name = 'ContentNotAccessibleError';
  }
}

export class RateLimitExceededError extends VDPExtractionError {
  constructor(service: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${service}${retryAfter ? `. Retry after ${retryAfter} seconds` : ''}`,
      'rate-limiting',
      'medium'
    );
    this.name = 'RateLimitExceededError';
  }
}

// Platform detection types
export interface PlatformDetectionResult {
  platform: 'youtube' | 'tiktok' | 'instagram' | 'unknown';
  contentId: string;
  confidence: number;
  normalizedUrl: string;
}

// Processing status types
export interface ProcessingStatus {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt: string;
  completedAt?: string;
  error?: string;
  result?: ViralDNAProfile;
}

// Batch processing types
export interface BatchJob {
  id: string;
  urls: string[];
  options: ExtractVDPRequest['options'];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results: Array<{
    url: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: ViralDNAProfile;
    error?: string;
  }>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// API response wrapper
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    processingTime: number;
    version: string;
    timestamp: string;
  };
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    gemini: 'up' | 'down' | 'degraded';
    youtube: 'up' | 'down' | 'degraded';
    cache?: 'up' | 'down' | 'disabled';
  };
  uptime: number;
  version: string;
  timestamp: string;
}

// Metrics types
export interface ServiceMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  processing: {
    queueSize: number;
    activeJobs: number;
    averageProcessingTime: number;
  };
  apis: {
    gemini: {
      calls: number;
      errors: number;
      averageLatency: number;
    };
    youtube: {
      calls: number;
      errors: number;
      averageLatency: number;
    };
  };
  timestamp: string;
}

// Re-export main types from schema
import { ViralDNAProfile } from '../schemas/viral-dna-profile';