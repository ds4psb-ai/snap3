/**
 * RFC 9457 Problem Details implementation
 * Lightweight functional approach
 */

import { NextResponse } from 'next/server';
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
    [key: string]: any; // Allow arbitrary additional properties
  } = {}
): Problem {
  const meta = ERROR_META[code];
  
  // Extract known properties
  const { detail, instance, retryAfter, violations, traceId, ...additionalProps } = opts;
  
  return {
    type: meta.type,
    title: meta.title,
    status: meta.status,
    code,
    fix: meta.fix,
    timestamp: new Date().toISOString(),
    traceId: traceId ?? generateTraceId(),
    ...(detail && { detail }),
    ...(instance && { instance }),
    ...(retryAfter && { retryAfter }),
    ...(violations && violations.length > 0 && { violations }),
    ...additionalProps, // Spread any additional properties
  };
}

/**
 * Create a NextResponse with Problem Details
 */
export function problemResponse(
  code: ErrorCode,
  opts: Parameters<typeof buildProblemJSON>[1] = {}
): NextResponse {
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
  
  return NextResponse.json(problem, { status: problem.status })
// TODO: Set headers using res.headers.set() pattern;
}

/**
 * Generate a trace ID for request tracking
 */
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Factory functions for creating Problem JSON objects (not NextResponse)
 * Used for testing and internal logic
 */
export const ProblemDetails = {
  // Generic error helpers returning Problem objects
  badRequest(detail?: string, opts: { code?: string; violations?: any[] } = {}) {
    // Map string codes to ErrorCode enum values
    const errorCode = opts.code === 'EMBED_DENIED' ? ErrorCode.EMBED_DENIED :
                     opts.code === 'VALIDATION_ERROR' ? ErrorCode.VALIDATION_ERROR :
                     ErrorCode.BAD_REQUEST;
    
    return buildProblemJSON(errorCode, {
      detail,
      violations: opts.violations,
    });
  },

  notFound(detail?: string) {
    return buildProblemJSON(ErrorCode.RESOURCE_NOT_FOUND, {
      detail,
    });
  },

  internalServerError(detail?: string) {
    return buildProblemJSON(ErrorCode.INTERNAL_ERROR, {
      detail,
    });
  },

  tooManyRequests(detail?: string, retryAfter?: number) {
    return buildProblemJSON(ErrorCode.RATE_LIMITED, {
      detail,
      retryAfter,
    });
  },

  fromAppError(error: any) {
    const errorCode = error.code || ErrorCode.INTERNAL_ERROR;
    return buildProblemJSON(errorCode, {
      detail: error.detail || error.message,
    });
  },

  invalidDuration(actual: number) {
    return buildProblemJSON(ErrorCode.INVALID_DURATION, {
      detail: `Duration must be exactly 8 seconds, got ${actual}`,
      violations: [{
        field: 'duration',
        message: 'Must be 8 seconds',
        code: 'INVALID_DURATION',
      }],
    });
  },

  unsupportedAspectRatio(requested: string) {
    return buildProblemJSON(ErrorCode.UNSUPPORTED_AR_FOR_PREVIEW, {
      detail: `Requested ${requested} aspect ratio, but preview only supports 16:9. Will provide crop-proxy metadata.`,
    });
  },

  qaViolation(violations: Array<{ field: string; message: string; code?: string }>, instance?: string) {
    return buildProblemJSON(ErrorCode.QA_RULE_VIOLATION, {
      detail: `QA validation failed with ${violations.length} violation(s)`,
      violations,
      instance,
    });
  },

  validation(violations: Array<{ field: string; message: string; code?: string }>) {
    return buildProblemJSON(ErrorCode.VALIDATION_ERROR, {
      detail: `Validation failed for ${violations.length} field(s)`,
      violations,
    });
  },

  methodNotAllowed(method?: string, allowed?: string[]) {
    return buildProblemJSON(ErrorCode.METHOD_NOT_ALLOWED, {
      detail: method 
        ? `Method ${method} is not allowed for this endpoint`
        : allowed?.length 
          ? `Allowed methods: ${allowed.join(', ')}`
          : 'Method not allowed',
    });
  },
};

/**
 * Factory functions for common problems
 * These return plain Problem objects
 */
export const Problems = {
  // Generic error helpers returning plain Problem objects
  badRequest(detail?: string, opts: { code?: string; violations?: any[] } = {}) {
    // Map string codes to ErrorCode enum values
    const errorCode = opts.code === 'EMBED_DENIED' ? ErrorCode.EMBED_DENIED :
                     opts.code === 'VALIDATION_ERROR' ? ErrorCode.VALIDATION_ERROR :
                     ErrorCode.BAD_REQUEST;
    
    return buildProblemJSON(errorCode, {
      detail,
      violations: opts.violations,
    });
  },

  notFound(detail?: string) {
    return buildProblemJSON(ErrorCode.RESOURCE_NOT_FOUND, {
      detail,
    });
  },

  internalServerError(detail?: string) {
    return buildProblemJSON(ErrorCode.INTERNAL_ERROR, {
      detail,
    });
  },

  tooManyRequests(detail?: string, retryAfter?: number) {
    return buildProblemJSON(ErrorCode.RATE_LIMITED, {
      detail,
      retryAfter,
    });
  },

  fromAppError(error: any) {
    const errorCode = error.code || ErrorCode.INTERNAL_ERROR;
    return buildProblemJSON(errorCode, {
      detail: error.detail || error.message,
    });
  },

  invalidDuration(actual: number) {
    return buildProblemJSON(ErrorCode.INVALID_DURATION, {
      detail: `Duration must be exactly 8 seconds, got ${actual}`,
      violations: [{
        field: 'duration',
        message: 'Must be 8 seconds',
        code: 'INVALID_DURATION',
      }],
    });
  },

  unsupportedAspectRatio(requested: string) {
    return buildProblemJSON(ErrorCode.UNSUPPORTED_AR_FOR_PREVIEW, {
      detail: `Requested ${requested} aspect ratio, but preview only supports 16:9. Will provide crop-proxy metadata.`,
    });
  },

  qaViolation(violations: Array<{ field: string; message: string; code?: string }>, instance?: string) {
    return buildProblemJSON(ErrorCode.QA_RULE_VIOLATION, {
      detail: `QA validation failed with ${violations.length} violation(s)`,
      violations,
      instance,
    });
  },

  validation(violations: Array<{ field: string; message: string; code?: string }>) {
    return buildProblemJSON(ErrorCode.VALIDATION_ERROR, {
      detail: `Validation failed for ${violations.length} field(s)`,
      violations,
    });
  },

  methodNotAllowed(method?: string, allowed?: string[]) {
    return buildProblemJSON(ErrorCode.METHOD_NOT_ALLOWED, {
      detail: method 
        ? `Method ${method} is not allowed for this endpoint`
        : allowed?.length 
          ? `Allowed methods: ${allowed.join(', ')}`
          : 'Method not allowed',
    });
  },
};

// Utility to wrap Problems in NextResponse for API routes  
export function wrapProblem(problem: Problem, status: number = 400) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  
  const headers: Record<string, string> = {
    'content-type': 'application/problem+json',
  };
  
  if (problem.retryAfter) {
    headers['Retry-After'] = String(problem.retryAfter);
  }
  
  return NextResponse.json(problem, { status, headers });
}

// Extended Problems object with NextResponse methods for API routes
export const ApiProblems = {
  ...Problems,
  
  // Override methods to return NextResponse
  badRequest(detail?: string, opts: { code?: string; violations?: any[] } = {}) {
    return wrapProblem(Problems.badRequest(detail, opts), 400);
  },
  
  notFound(detail?: string) {
    return wrapProblem(Problems.notFound(detail), 404);
  },
  
  validation(violations: Array<{ field: string; message: string; code?: string }>, instance?: string) {
    return wrapProblem({...Problems.validation(violations), instance}, 400);
  },
  
  methodNotAllowed(method?: string, allowed?: string[], instance?: string) {
    return wrapProblem({...Problems.methodNotAllowed(method, allowed), instance}, 405);
  },
  
  internalServerError(detail?: string) {
    return wrapProblem(Problems.internalServerError(detail), 500);
  },
  
  tooManyRequests(detail?: string, retryAfter?: number) {
    const problem = buildProblemJSON(ErrorCode.RATE_LIMITED, {
      detail,
      retryAfter: retryAfter || 60,
    });
    const response = NextResponse.json(problem, { 
      status: problem.status,
      headers: {
        'content-type': 'application/problem+json',
        'Retry-After': String(problem.retryAfter || 60),
      }
    });
    return response;
  },
  
  // Add missing methods that API routes use
  qaViolation(violations: Array<{ field: string; message: string; code?: string }>, instance?: string) {
    return wrapProblem({...Problems.qaViolation(violations), instance}, 422);
  },
  
  invalidDuration(actual: number, instance?: string) {
    return wrapProblem({...Problems.invalidDuration(actual), instance}, 400);
  },
  
  unsupportedAspectRatio(requested: string, cropProxy?: any, instance?: string) {
    const problem = buildProblemJSON(ErrorCode.UNSUPPORTED_AR_FOR_PREVIEW, {
      detail: `Requested ${requested} aspect ratio, but preview only supports 16:9. Will provide crop-proxy metadata.`,
      cropProxy,
      instance,
    });
    return NextResponse.json(problem, { status: problem.status })
// TODO: Set headers using res.headers.set() pattern;
  },
  
  // Methods that don't exist in base Problems - create them
  embedDenied(url: string, reason?: string, instance?: string) {
    return wrapProblem(buildProblemJSON(ErrorCode.EMBED_DENIED, {
      detail: reason || `Embedding denied for URL: ${url}`,
      instance,
    }), 403);
  },

  // Provider-specific errors for storage operations
  providerQuotaExceeded(retryAfter = 3600, provider?: string, instance?: string) {
    return wrapProblem(buildProblemJSON(ErrorCode.PROVIDER_QUOTA_EXCEEDED, {
      detail: provider ? `Quota exceeded for provider: ${provider}` : 'Storage quota exceeded',
      retryAfter,
      instance,
    }), 429);
  },

  providerPolicyBlocked(detail?: string, instance?: string) {
    return wrapProblem(buildProblemJSON(ErrorCode.PROVIDER_POLICY_BLOCKED, {
      detail: detail || 'Access denied by storage policy',
      instance,
    }), 403);
  },
};