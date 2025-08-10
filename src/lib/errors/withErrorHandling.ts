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
      console.error('API route error:', error);

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

      if (error instanceof AppError) {
        return NextResponse.json(
          Problems[error.type](error.message),
          { status: error.statusCode }
        );
      }

      return NextResponse.json(
        Problems.internalServerError({
          detail: 'An unexpected error occurred',
        }),
        { status: 500 }
      );
    }
  };
}