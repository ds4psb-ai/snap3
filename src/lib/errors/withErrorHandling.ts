/**
 * Higher-order function to wrap API route handlers with error handling
 * Provides consistent error responses following RFC 9457 Problem Details
 */

import { NextRequest, NextResponse } from 'next/server';
import { ErrorCode } from './codes';
import { problemResponse } from './problem';
import { ZodError } from 'zod';

type ApiHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an API route handler with error handling
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      const response = await handler(request, context);
      // Preserve headers by returning the response directly
      return response;
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const violations = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code?.toUpperCase(),
        }));
        
        return problemResponse(ErrorCode.VALIDATION_ERROR, {
          detail: `Validation failed for ${violations.length} field(s)`,
          violations,
          instance: request.url,
        });
      }
      
      // Handle known application errors
      if (error instanceof Error) {
        // Check if it's a known error pattern
        if (error.message.includes('not found')) {
          return problemResponse(ErrorCode.RESOURCE_NOT_FOUND, {
            detail: error.message,
            instance: request.url,
          });
        }
        
        if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
          return problemResponse(ErrorCode.UNAUTHORIZED, {
            detail: error.message,
            instance: request.url,
          });
        }
      }
      
      // Default to internal server error
      return problemResponse(ErrorCode.INTERNAL_ERROR, {
        detail: 'An unexpected error occurred',
        instance: request.url,
      });
    }
  };
}

/**
 * Convenience function for adding additional error context
 */
export function withErrorContext(
  handler: ApiHandler,
  context: { operation: string; resource?: string }
): ApiHandler {
  return withErrorHandling(async (request, routeContext) => {
    try {
      return await handler(request, routeContext);
    } catch (error) {
      // Add operation context to the error
      if (error instanceof Error) {
        error.message = `${context.operation}: ${error.message}`;
      }
      throw error;
    }
  });
}