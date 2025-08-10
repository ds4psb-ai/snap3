/**
 * Error handling middleware for Next.js API routes
 * Converts various error types to RFC 9457 Problem Details
 */

import { ZodError } from 'zod';
import { AppError } from '@/lib/errors/app-error';
import { problemResponse, buildProblemJSON } from '@/lib/errors/problem';
import { ErrorCode } from '@/lib/errors/codes';
import { zodErrorToViolations } from '@/lib/errors/zod-to-violations';

type Handler = (req: Request) => Promise<Response> | Response;
type NextHandler = (req: Request, ctx: any) => Promise<Response> | Response;

/**
 * Wrap API route handler with error handling
 */
export function withErrorHandling(handler: Handler): Handler {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err: unknown) {
      return handleError(err, req.url);
    }
  };
}

/**
 * Wrap Next.js API route handler with error handling
 */
export function withNextErrorHandling(handler: NextHandler): NextHandler {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
      return handleError(err, req.url);
    }
  };
}

/**
 * Handle different error types and convert to Problem Details
 */
function handleError(err: unknown, instance?: string): Response {
  // Zod validation errors
  if (err instanceof ZodError) {
    const violations = zodErrorToViolations(err);
    return problemResponse(ErrorCode.VALIDATION_ERROR, {
      detail: `Validation failed for ${violations.length} field(s)`,
      violations,
      instance,
    });
  }

  // AppError - custom application errors
  if (err instanceof AppError) {
    return problemResponse(err.code, {
      detail: err.detail,
      retryAfter: err.retryAfter,
      violations: err.violations,
      instance: instance ?? err.instance,
      traceId: err.traceId,
    });
  }

  // Standard Error
  if (err instanceof Error) {
    console.error('Unhandled error:', err);
    
    // Check for specific error patterns
    if (err.message.includes('not found')) {
      return problemResponse(ErrorCode.RESOURCE_NOT_FOUND, {
        detail: err.message,
        instance,
      });
    }
    
    if (err.message.includes('unauthorized') || err.message.includes('authentication')) {
      return problemResponse(ErrorCode.UNAUTHORIZED, {
        detail: err.message,
        instance,
      });
    }
    
    if (err.message.includes('forbidden') || err.message.includes('permission')) {
      return problemResponse(ErrorCode.FORBIDDEN, {
        detail: err.message,
        instance,
      });
    }

    // Generic internal error
    const problem = buildProblemJSON(ErrorCode.INTERNAL_SERVER_ERROR, {
      detail: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
      instance,
    });
    
    return new Response(JSON.stringify(problem), {
      status: 500,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }

  // Unknown error type
  console.error('Unknown error type:', err);
  const problem = buildProblemJSON(ErrorCode.INTERNAL_SERVER_ERROR, {
    detail: 'An unexpected error occurred',
    instance,
  });
  
  return new Response(JSON.stringify(problem), {
    status: 500,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

/**
 * Express-style error handler for Next.js API routes
 */
export function errorHandler(err: unknown, req: Request, res: Response): Response {
  return handleError(err, req.url);
}

/**
 * Utility to throw common errors
 */
export const throwError = {
  notFound: (resource: string, instance?: string) => {
    throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, {
      detail: `Resource '${resource}' not found`,
      instance,
    });
  },

  unauthorized: (detail?: string, instance?: string) => {
    throw new AppError(ErrorCode.UNAUTHORIZED, {
      detail,
      instance,
    });
  },

  forbidden: (detail?: string, instance?: string) => {
    throw new AppError(ErrorCode.FORBIDDEN, {
      detail,
      instance,
    });
  },

  validation: (violations: Array<{ field: string; message: string; code?: string }>, instance?: string) => {
    throw new AppError(ErrorCode.VALIDATION_ERROR, {
      detail: `Validation failed for ${violations.length} field(s)`,
      violations,
      instance,
    });
  },

  rateLimited: (retryAfter = 60, instance?: string) => {
    throw new AppError(ErrorCode.RATE_LIMITED, {
      retryAfter,
      instance,
    });
  },

  invalidDuration: (actual: number, instance?: string) => {
    throw new AppError(ErrorCode.INVALID_DURATION, {
      detail: `Duration must be exactly 8 seconds, got ${actual}`,
      violations: [{
        field: 'duration',
        message: 'Must be 8 seconds',
        code: 'INVALID_DURATION',
      }],
      instance,
    });
  },

  qaViolation: (violations: Array<{ field: string; message: string; code?: string }>, instance?: string) => {
    throw new AppError(ErrorCode.QA_RULE_VIOLATION, {
      detail: `QA validation failed with ${violations.length} violation(s)`,
      violations,
      instance,
    });
  },
};