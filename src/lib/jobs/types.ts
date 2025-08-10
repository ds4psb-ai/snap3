/**
 * Job system types and interfaces
 */

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

export enum JobType {
  PREVIEW = 'preview',
  COMPILE = 'compile',
  EXPORT = 'export',
}

export interface JobPayload {
  veo3Id?: string;
  prompt?: string;
  duration?: number;
  aspectRatio?: string;
  quality?: string;
  [key: string]: unknown;
}

export interface JobResult {
  videoUrl?: string;
  duration?: number;
  aspectRatio?: string;
  quality?: string;
  fps?: number;
  bitrate?: number;
  synthIdDetected?: boolean;
  [key: string]: unknown;
}

export interface JobError {
  code: string;
  message: string;
  fix?: string;
  retryAfter?: number;
}

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  priority: JobPriority;
  payload: JobPayload;
  result?: JobResult | null;
  error?: JobError | null;
  progress: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
  requestId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface QueueConfig {
  maxConcurrent?: number;
  maxQueueSize?: number;
  defaultPriority?: JobPriority;
  maxAttempts?: number;
  rateLimit?: {
    perMinute?: number;
    perRequest?: number;
  };
}

export interface JobTransition {
  from: JobStatus;
  to: JobStatus;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
  avgProcessingTime?: number;
  successRate?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetsAt: number;
  retryAfter?: number;
}