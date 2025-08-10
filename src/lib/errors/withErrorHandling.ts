import { NextRequest, NextResponse } from 'next/server';
import { ApiProblems as Problems } from './problem';
import { ZodError } from 'zod';
import { AppError } from './app-error';

type RouteHandler = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse>;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('API route error:', error);

      if (error instanceof ZodError) {
        const violations = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return Problems.validation(violations);
      }

      if (error instanceof AppError) {
        return NextResponse.json(
          error.toProblemDetails(),
          { status: error.status }
        );
      }

      return Problems.internalServerError('An unexpected error occurred');
    }
  };
}