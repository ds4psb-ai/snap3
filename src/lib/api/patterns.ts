/**
 * Next.js 15 API Route Modern Patterns
 * Standardized patterns for consistent API development
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiProblems } from '@/lib/errors/problem';

/**
 * Modern API route handler wrapper with standardized error handling
 * Uses Next.js 15 async params pattern and React 19 optimizations
 */
export function createApiHandler<T extends z.ZodType>(
  schema: T,
  handler: (
    data: z.infer<T>,
    request: NextRequest,
    context?: any
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      return await handler(validatedData, request, context);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const violations = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        return ApiProblems.validation(violations, request.url);
      }
      
      console.error('API handler error:', error);
      return ApiProblems.internalServerError('An unexpected error occurred');
    }
  };
}

/**
 * Modern dynamic route handler with async params support
 */
export function createDynamicHandler<T extends Record<string, string>>(
  handler: (
    params: T,
    request: NextRequest
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<T> }
  ) => {
    try {
      const resolvedParams = await params;
      return await handler(resolvedParams, request);
    } catch (error) {
      console.error('Dynamic handler error:', error);
      return ApiProblems.internalServerError('Failed to process request');
    }
  };
}

/**
 * Rate limiting helper with Next.js 15 optimizations
 */
export async function withRateLimit<T>(
  request: NextRequest,
  handler: () => Promise<T>,
  options: {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (req: NextRequest) => string;
  } = {}
): Promise<T> {
  const { windowMs = 60000, maxRequests = 100 } = options;
  
  // Simple in-memory rate limiting (use Redis in production)
  const key = options.keyGenerator?.(request) || 
              request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'default';
  
  // Rate limiting logic would go here
  // For now, just execute the handler
  return await handler();
}

/**
 * Modern response helpers with proper typing
 */
export const ApiResponse = {
  json<T>(data: T, options?: ResponseInit): NextResponse<T> {
    return NextResponse.json(data, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  },

  created<T>(data: T, location?: string): NextResponse<T> {
    return NextResponse.json(data, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...(location && { Location: location }),
      },
    });
  },

  noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  },

  stream(stream: ReadableStream, options?: ResponseInit): NextResponse {
    return new NextResponse(stream, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
        ...options?.headers,
      },
    });
  },
};