/**
 * Provider Error Adapter
 * Maps provider errors to RFC 9457 Problem Details
 */

import { ErrorCode } from './codes';
import { Problem, buildProblemJSON, problemResponse } from './problem';
import { AppError } from './app-error';
import { generateTraceId } from '../logging/logger';

/**
 * Provider error types that need mapping
 */
export enum ProviderErrorType {
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Map provider error to appropriate ErrorCode
 */
function mapProviderErrorToCode(error: ProviderErrorType): ErrorCode {
  const mapping: Record<ProviderErrorType, ErrorCode> = {
    [ProviderErrorType.RATE_LIMITED]: ErrorCode.RATE_LIMITED,
    [ProviderErrorType.QUOTA_EXCEEDED]: ErrorCode.PROVIDER_QUOTA_EXCEEDED,
    [ProviderErrorType.TIMEOUT]: ErrorCode.TIMEOUT,
    [ProviderErrorType.CONNECTION_FAILED]: ErrorCode.SERVICE_UNAVAILABLE,
    [ProviderErrorType.INVALID_REQUEST]: ErrorCode.VALIDATION_ERROR,
    [ProviderErrorType.AUTHENTICATION_FAILED]: ErrorCode.UNAUTHORIZED,
    [ProviderErrorType.PERMISSION_DENIED]: ErrorCode.FORBIDDEN,
    [ProviderErrorType.RESOURCE_NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
    [ProviderErrorType.CONFLICT]: ErrorCode.CONFLICT,
    [ProviderErrorType.INTERNAL_ERROR]: ErrorCode.INTERNAL_ERROR,
    [ProviderErrorType.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
    [ProviderErrorType.POLICY_VIOLATION]: ErrorCode.PROVIDER_POLICY_BLOCKED,
    [ProviderErrorType.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
    [ProviderErrorType.FORBIDDEN]: ErrorCode.FORBIDDEN,
    [ProviderErrorType.VALIDATION_ERROR]: ErrorCode.VALIDATION_ERROR,
  };
  
  return mapping[error] || ErrorCode.INTERNAL_ERROR;
}

/**
 * Extract retry-after value from various provider error formats
 */
function extractRetryAfter(error: any): number | undefined {
  // Handle undefined or null error
  if (!error) return undefined;
  
  // Check various common formats
  if (typeof error.retryAfter === 'number') return error.retryAfter;
  if (typeof error.retry_after === 'number') return error.retry_after;
  if (typeof error.retryAfterSeconds === 'number') return error.retryAfterSeconds;
  if (typeof error.retryAfterMs === 'number') return Math.ceil(error.retryAfterMs / 1000);
  
  // Check headers if present
  if (error.headers) {
    const headers = error.headers;
    if (headers['retry-after']) return parseInt(headers['retry-after'], 10);
    if (headers['Retry-After']) return parseInt(headers['Retry-After'], 10);
    if (headers['x-retry-after']) return parseInt(headers['x-retry-after'], 10);
  }
  
  // Default retry-after values based on error type
  if (error.type === ProviderErrorType.RATE_LIMITED) return 60;
  if (error.type === ProviderErrorType.QUOTA_EXCEEDED) return 3600;
  
  return undefined;
}

/**
 * Provider-specific error details
 */
interface ProviderErrorDetails {
  provider: string;
  originalError?: any;
  context?: Record<string, any>;
}

/**
 * Adapt provider errors to Problem Details
 */
export class ProviderErrorAdapter {
  private traceId: string;
  
  constructor(traceId?: string) {
    this.traceId = traceId || generateTraceId();
  }
  
  /**
   * Convert provider error to Problem
   */
  toProblem(
    errorType: ProviderErrorType,
    details: ProviderErrorDetails,
    instance?: string
  ): Problem {
    const code = mapProviderErrorToCode(errorType);
    let retryAfter = extractRetryAfter(details.originalError);
    
    // Set default retry-after values if not provided
    if (retryAfter === undefined) {
      if (errorType === ProviderErrorType.RATE_LIMITED) {
        retryAfter = 60;
      } else if (errorType === ProviderErrorType.QUOTA_EXCEEDED) {
        retryAfter = 3600;
      }
    }
    
    // Build detail message with provider context
    let detail = `Provider error from ${details.provider}`;
    if (details.originalError?.message) {
      detail += `: ${details.originalError.message}`;
    }
    
    // Add context if available
    if (details.context) {
      const contextParts = Object.entries(details.context)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`);
      if (contextParts.length > 0) {
        detail += ` (${contextParts.join(', ')})`;
      }
    }
    
    return buildProblemJSON(code, {
      detail,
      instance,
      retryAfter,
      traceId: this.traceId,
    });
  }
  
  /**
   * Convert provider error to Problem Response
   */
  toResponse(
    errorType: ProviderErrorType,
    details: ProviderErrorDetails,
    instance?: string
  ): Response {
    const problem = this.toProblem(errorType, details, instance);
    
    const headers = new Headers({
      'Content-Type': 'application/problem+json',
    });
    
    // Add Retry-After header for rate limiting
    if (problem.retryAfter) {
      headers.set('Retry-After', String(problem.retryAfter));
    }
    
    return new Response(JSON.stringify(problem), {
      status: problem.status,
      headers,
    });
  }
  
  /**
   * Convert AppError to Problem Response with provider context
   */
  fromAppError(error: AppError, provider?: string): Response {
    // Determine retry-after value for rate limit errors
    let retryAfter = error.retryAfter;
    if (!retryAfter && (error.code === ErrorCode.RATE_LIMITED || 
        error.code === ErrorCode.PROVIDER_QUOTA_EXCEEDED)) {
      retryAfter = error.code === ErrorCode.RATE_LIMITED ? 60 : 3600;
    }
    
    const detail = provider 
      ? `${error.detail || error.message} (provider: ${provider})`
      : error.detail || error.message;
    
    return problemResponse(error.code, {
      detail,
      instance: error.instance,
      retryAfter,
      traceId: this.traceId,
    });
  }
  
  /**
   * Handle SQS-specific errors
   */
  fromSQSError(error: any, instance?: string): Response {
    let errorType = ProviderErrorType.INTERNAL_ERROR;
    let retryAfter: number | undefined;
    
    // Map SQS error codes
    if (error.code || error.Code) {
      const code = error.code || error.Code;
      switch (code) {
        case 'OverLimit':
        case 'RequestThrottled':
        case 'ThrottlingException':
          errorType = ProviderErrorType.RATE_LIMITED;
          retryAfter = 5; // SQS typically needs short backoff
          break;
        case 'ServiceUnavailable':
        case 'InternalError':
          errorType = ProviderErrorType.SERVICE_UNAVAILABLE;
          retryAfter = 30;
          break;
        case 'InvalidParameterValue':
        case 'InvalidRequest':
          errorType = ProviderErrorType.INVALID_REQUEST;
          break;
        case 'AccessDenied':
          errorType = ProviderErrorType.PERMISSION_DENIED;
          break;
        case 'QueueDoesNotExist':
          errorType = ProviderErrorType.RESOURCE_NOT_FOUND;
          break;
      }
    }
    
    return this.toResponse(errorType, {
      provider: 'SQS',
      originalError: error,
      context: { 
        queueUrl: error.queueUrl,
        region: error.region,
      },
    }, instance);
  }
  
  /**
   * Handle Redis/Upstash-specific errors
   */
  fromRedisError(error: any, instance?: string): Response {
    let errorType = ProviderErrorType.INTERNAL_ERROR;
    let retryAfter: number | undefined;
    
    // Check for common Redis error patterns
    if (error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many requests')) {
        errorType = ProviderErrorType.RATE_LIMITED;
        retryAfter = 60;
      } else if (msg.includes('quota') || msg.includes('limit exceeded')) {
        errorType = ProviderErrorType.QUOTA_EXCEEDED;
        retryAfter = 3600;
      } else if (msg.includes('timeout') || msg.includes('timed out')) {
        errorType = ProviderErrorType.TIMEOUT;
        retryAfter = 10;
      } else if (msg.includes('connection') || msg.includes('econnrefused')) {
        errorType = ProviderErrorType.CONNECTION_FAILED;
        retryAfter = 30;
      } else if (msg.includes('auth') || msg.includes('noauth')) {
        errorType = ProviderErrorType.AUTHENTICATION_FAILED;
      }
    }
    
    // Check Upstash-specific headers
    if (error.headers) {
      if (error.headers['x-ratelimit-remaining'] === '0') {
        errorType = ProviderErrorType.RATE_LIMITED;
        const reset = error.headers['x-ratelimit-reset'];
        if (reset) {
          retryAfter = Math.ceil((parseInt(reset, 10) - Date.now()) / 1000);
        }
      }
    }
    
    return this.toResponse(errorType, {
      provider: 'Redis/Upstash',
      originalError: error,
      context: {
        operation: error.command,
      },
    }, instance);
  }
  
  /**
   * Handle BullMQ-specific errors
   */
  fromBullMQError(error: any, instance?: string): Response {
    let errorType = ProviderErrorType.INTERNAL_ERROR;
    
    if (error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('queue is paused')) {
        errorType = ProviderErrorType.SERVICE_UNAVAILABLE;
      } else if (msg.includes('job not found')) {
        errorType = ProviderErrorType.RESOURCE_NOT_FOUND;
      } else if (msg.includes('job is locked')) {
        errorType = ProviderErrorType.CONFLICT;
      }
    }
    
    return this.toResponse(errorType, {
      provider: 'BullMQ',
      originalError: error,
    }, instance);
  }
  
  /**
   * Generic provider error handler
   */
  fromProviderError(provider: string, error: any, instance?: string): Response {
    // Try to detect error type from common patterns
    let errorType = ProviderErrorType.INTERNAL_ERROR;
    
    if (error.status === 429 || error.statusCode === 429) {
      errorType = ProviderErrorType.RATE_LIMITED;
    } else if (error.status === 403 || error.statusCode === 403) {
      errorType = ProviderErrorType.PERMISSION_DENIED;
    } else if (error.status === 401 || error.statusCode === 401) {
      errorType = ProviderErrorType.AUTHENTICATION_FAILED;
    } else if (error.status === 404 || error.statusCode === 404) {
      errorType = ProviderErrorType.RESOURCE_NOT_FOUND;
    } else if (error.status === 503 || error.statusCode === 503) {
      errorType = ProviderErrorType.SERVICE_UNAVAILABLE;
    }
    
    return this.toResponse(errorType, {
      provider,
      originalError: error,
    }, instance);
  }
}

/**
 * Middleware to wrap provider calls with error handling
 */
export async function withProviderErrorHandling<T>(
  provider: string,
  operation: () => Promise<T>,
  instance?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const adapter = new ProviderErrorAdapter();
    
    // If it's already an AppError, enhance it with provider context
    if (error instanceof AppError) {
      throw new AppError(error.code, {
        detail: `${error.detail || error.message} (provider: ${provider})`,
        instance: instance || error.instance,
        retryAfter: error.retryAfter,
      });
    }
    
    // Convert provider error to AppError
    let errorType = ProviderErrorType.INTERNAL_ERROR;
    let retryAfter: number | undefined;
    
    // Detect error type
    if (error && typeof error === 'object') {
      const err = error as any;
      if (err.status === 429 || err.statusCode === 429 || 
          err.code === 'RATE_LIMITED' || err.code === 'ThrottlingException') {
        errorType = ProviderErrorType.RATE_LIMITED;
        retryAfter = extractRetryAfter(err) || 60;
      } else if (err.code === 'QUOTA_EXCEEDED' || err.code === 'OverLimit') {
        errorType = ProviderErrorType.QUOTA_EXCEEDED;
        retryAfter = extractRetryAfter(err) || 3600;
      } else if (err.status === 403 || err.statusCode === 403) {
        errorType = ProviderErrorType.FORBIDDEN;
      } else if (err.status === 401 || err.statusCode === 401) {
        errorType = ProviderErrorType.UNAUTHORIZED;
      } else if (err.status === 404 || err.statusCode === 404) {
        errorType = ProviderErrorType.RESOURCE_NOT_FOUND;
      } else if (err.status === 400 || err.statusCode === 400) {
        errorType = ProviderErrorType.VALIDATION_ERROR;
      } else if (err.status === 503 || err.statusCode === 503) {
        errorType = ProviderErrorType.SERVICE_UNAVAILABLE;
      }
    }
    
    const code = mapProviderErrorToCode(errorType);
    throw new AppError(code, {
      detail: `Provider error from ${provider}: ${error instanceof Error ? error.message : String(error)}`,
      instance,
      retryAfter,
    });
  }
}