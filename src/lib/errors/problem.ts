/**
 * RFC 9457 Problem Details implementation
 * Lightweight functional approach
 */

import { ErrorCode, ERROR_META } from './codes';

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: ErrorCode;
  fix?: string;
  retryAfter?: number;
  violations?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  timestamp?: string;
  traceId?: string;
}

/**
 * Build a Problem Details JSON object
 */
export function buildProblemJSON(
  code: ErrorCode,
  opts: {
    detail?: string;
    instance?: string;
    retryAfter?: number;
    violations?: Array<{
      field: string;
      message: string;
      code?: string;
    }>;
    traceId?: string;
  } = {}
): Problem {
  const meta = ERROR_META[code];
  return {
    type: meta.type,
    title: meta.title,
    status: meta.status,
    code,
    fix: meta.fix,
    timestamp: new Date().toISOString(),
    traceId: opts.traceId ?? generateTraceId(),
    ...(opts.detail && { detail: opts.detail }),
    ...(opts.instance && { instance: opts.instance }),
    ...(opts.retryAfter && { retryAfter: opts.retryAfter }),
    ...(opts.violations && opts.violations.length > 0 && { violations: opts.violations }),
  };
}

/**
 * Create a Response with Problem Details
 */
export function problemResponse(
  code: ErrorCode,
  opts: Parameters<typeof buildProblemJSON>[1] = {}
): Response {
  // For rate limiting codes, ensure retryAfter is set
  if ((code === ErrorCode.RATE_LIMITED || code === ErrorCode.PROVIDER_QUOTA_EXCEEDED) && !opts.retryAfter) {
    opts.retryAfter = ERROR_META[code].retryAfter ?? 60;
  }
  
  const problem = buildProblemJSON(code, opts);
  const headers = new Headers({ 
    'Content-Type': 'application/problem+json',
  });
  
  // Add Retry-After header for rate limiting
  if (code === ErrorCode.RATE_LIMITED || code === ErrorCode.PROVIDER_QUOTA_EXCEEDED) {
    const retryAfter = problem.retryAfter ?? ERROR_META[code].retryAfter ?? 60;
    headers.set('Retry-After', String(retryAfter));
  }
  
  return new Response(JSON.stringify(problem), { 
    status: problem.status, 
    headers,
  });
}

/**
 * Generate a trace ID for request tracking
 */
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Factory functions for common problems
 */
export const Problems = {
  validation(violations: Array<{ field: string; message: string; code?: string }>, instance?: string) {
    return problemResponse(ErrorCode.VALIDATION_ERROR, {
      detail: `Validation failed for ${violations.length} field(s)`,
      violations,
      instance,
    });
  },

  badRequest(detail?: string, instance?: string) {
    return problemResponse(ErrorCode.BAD_REQUEST, {
      detail: detail || 'Bad request',
      instance,
    });
  },

  notFound(resource?: string, instance?: string) {
    return problemResponse(ErrorCode.RESOURCE_NOT_FOUND, {
      detail: resource ? `Resource '${resource}' not found` : undefined,
      instance,
    });
  },

  unauthorized(detail?: string, instance?: string) {
    return problemResponse(ErrorCode.UNAUTHORIZED, {
      detail,
      instance,
    });
  },

  forbidden(detail?: string, instance?: string) {
    return problemResponse(ErrorCode.FORBIDDEN, {
      detail,
      instance,
    });
  },

  rateLimited(retryAfter = 60, instance?: string) {
    return problemResponse(ErrorCode.RATE_LIMITED, {
      retryAfter,
      instance,
    });
  },

  invalidDuration(actual: number, instance?: string) {
    return problemResponse(ErrorCode.INVALID_DURATION, {
      detail: `Duration must be exactly 8 seconds, got ${actual}`,
      violations: [{
        field: 'duration',
        message: 'Must be 8 seconds',
        code: 'INVALID_DURATION',
      }],
      instance,
    });
  },

  unsupportedAspectRatio(requested: string, instance?: string) {
    return problemResponse(ErrorCode.UNSUPPORTED_AR_FOR_PREVIEW, {
      detail: `Requested ${requested} aspect ratio, but preview only supports 16:9. Will provide crop-proxy metadata.`,
      instance,
    });
  },

  qaViolation(violations: Array<{ field: string; message: string; code?: string }>, instance?: string) {
    return problemResponse(ErrorCode.QA_RULE_VIOLATION, {
      detail: `QA validation failed with ${violations.length} violation(s)`,
      violations,
      instance,
    });
  },

  providerQuotaExceeded(retryAfter = 3600, provider?: string, instance?: string) {
    return problemResponse(ErrorCode.PROVIDER_QUOTA_EXCEEDED, {
      detail: provider ? `Quota exceeded for provider: ${provider}` : undefined,
      retryAfter,
      instance,
    });
  },

  embedDenied(url: string, reason?: string, instance?: string) {
    return problemResponse(ErrorCode.EMBED_DENIED, {
      detail: reason || `Embedding denied for URL: ${url}`,
      instance,
    });
  },

  methodNotAllowed(method?: string, allowed?: string[], instance?: string) {
    return problemResponse(ErrorCode.METHOD_NOT_ALLOWED, {
      detail: method 
        ? `Method ${method} is not allowed for this endpoint`
        : allowed?.length 
          ? `Allowed methods: ${allowed.join(', ')}`
          : undefined,
      instance,
    });
  },

  tooManyRequests(detail?: string, retryAfter = 60, instance?: string) {
    return problemResponse(ErrorCode.RATE_LIMITED, {
      detail,
      retryAfter,
      instance,
    });
  },

  internalServerError(detail?: string, instance?: string) {
    return problemResponse(ErrorCode.INTERNAL_ERROR, {
      detail: detail || 'Internal server error',
      instance,
    });
  },
};