import { NextRequest, NextResponse } from 'next/server';
import { Problems } from './problem';
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
      console.error('Route handler error:', error);

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return NextResponse.json(
          Problems.badRequest({
            detail: 'Validation failed',
            violations: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          }),
          { status: 400 }
        );
      }

      // Handle AppError instances
      if (error instanceof AppError) {
        return NextResponse.json(
          Problems.fromAppError(error),
          { status: error.statusCode }
        );
      }

      // Handle generic errors
      if (error instanceof Error) {
        return NextResponse.json(
          Problems.internalServerError({
            detail: error.message,
          }),
          { status: 500 }
        );
      }

      // Fallback for unknown errors
      return NextResponse.json(
        Problems.internalServerError({
          detail: 'An unexpected error occurred',
        }),
        { status: 500 }
      );
    }
  };
}