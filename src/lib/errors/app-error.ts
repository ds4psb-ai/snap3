/**
 * Application-specific error class extending native Error
 * Works in conjunction with Problem Details for API responses
 */

import { ErrorCode, ERROR_META, ErrorMetadata } from './codes';

export interface ErrorContext {
  detail?: string;
  retryAfter?: number;
  violations?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  metadata?: Record<string, unknown>;
  instance?: string;
  traceId?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly fix: string;
  public readonly type: string;
  public readonly detail?: string;
  public readonly retryAfter?: number;
  public readonly violations?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  public readonly metadata?: Record<string, unknown>;
  public readonly instance?: string;
  public readonly traceId?: string;
  public readonly timestamp: string;

  constructor(code: ErrorCode, context: ErrorContext = {}) {
    const meta = ERROR_META[code];
    
    // Use detail if provided, otherwise use title
    super(context.detail || meta.title);
    
    this.name = 'AppError';
    this.code = code;
    this.status = meta.status;
    this.fix = meta.fix;
    this.type = meta.type;
    this.detail = context.detail;
    this.retryAfter = context.retryAfter ?? meta.retryAfter;
    this.violations = context.violations;
    this.metadata = context.metadata;
    this.instance = context.instance;
    this.traceId = context.traceId ?? this.generateTraceId();
    this.timestamp = new Date().toISOString();

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if error is retryable based on metadata
   */
  isRetryable(): boolean {
    return ERROR_META[this.code].retryable ?? false;
  }

  /**
   * Convert to Problem Details format
   */
  toProblemDetails() {
    const problem: Record<string, unknown> = {
      type: this.type,
      title: ERROR_META[this.code].title,
      status: this.status,
      code: this.code,
      fix: this.fix,
      timestamp: this.timestamp,
      traceId: this.traceId,
    };

    if (this.detail) problem.detail = this.detail;
    if (this.instance) problem.instance = this.instance;
    if (this.violations && this.violations.length > 0) {
      problem.violations = this.violations;
    }
    if (this.retryAfter) problem.retryAfter = this.retryAfter;
    if (this.metadata) problem.metadata = this.metadata;

    return problem;
  }

  /**
   * Static factory methods for common errors
   */
  static validation(violations: Array<{ field: string; message: string; code?: string }>, instance?: string): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, {
      detail: `Validation failed for ${violations.length} field(s)`,
      violations,
      instance,
    });
  }

  static notFound(resource: string, instance?: string): AppError {
    return new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
      detail: `Resource '${resource}' not found`,
      instance,
    });
  }

  static unauthorized(detail?: string, instance?: string): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, {
      detail,
      instance,
    });
  }

  static forbidden(detail?: string, instance?: string): AppError {
    return new AppError(ErrorCode.FORBIDDEN, {
      detail,
      instance,
    });
  }

  static rateLimited(retryAfter = 60, instance?: string): AppError {
    return new AppError(ErrorCode.RATE_LIMITED, {
      retryAfter,
      instance,
    });
  }

  static invalidDuration(actual: number, instance?: string): AppError {
    return new AppError(ErrorCode.INVALID_DURATION, {
      detail: `Duration must be exactly 8 seconds, got ${actual}`,
      violations: [{
        field: 'duration',
        message: 'Must be 8 seconds',
        code: 'INVALID_DURATION',
      }],
      instance,
    });
  }

  static unsupportedAspectRatio(requested: string, instance?: string): AppError {
    return new AppError(ErrorCode.UNSUPPORTED_AR_FOR_PREVIEW, {
      detail: `Requested ${requested} aspect ratio, but preview only supports 16:9`,
      metadata: {
        requested,
        supported: '16:9',
        cropProxy: true,
      },
      instance,
    });
  }

  static qaViolation(violations: Array<{ field: string; message: string; code?: string }>, instance?: string): AppError {
    return new AppError(ErrorCode.QA_RULE_VIOLATION, {
      detail: `QA validation failed with ${violations.length} violation(s)`,
      violations,
      instance,
    });
  }

  static providerQuotaExceeded(retryAfter = 3600, provider?: string, instance?: string): AppError {
    return new AppError(ErrorCode.PROVIDER_QUOTA_EXCEEDED, {
      detail: provider ? `Quota exceeded for provider: ${provider}` : 'Provider quota exceeded',
      retryAfter,
      metadata: { provider },
      instance,
    });
  }

  static embedDenied(url: string, reason?: string, instance?: string): AppError {
    return new AppError(ErrorCode.EMBED_DENIED, {
      detail: reason || `Embedding denied for URL: ${url}`,
      metadata: { url, reason },
      instance,
    });
  }
}