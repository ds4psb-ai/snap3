import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './app-error';
import { buildProblemJSON } from './problem';
import { ErrorCode } from './codes';
import { zodErrorToViolations } from './zod-to-violations';

type RouteHandler = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse>;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('[withErrorHandling]', error);
      
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const violations = zodErrorToViolations(error);
        const problem = buildProblemJSON(ErrorCode.VALIDATION_ERROR, {
          detail: `Request validation failed: ${violations.length} error(s)`,
          violations,
        });
        
        return NextResponse.json(problem, { 
          status: 400,
          headers: { 'Content-Type': 'application/problem+json' }
        });
      }
      
      // Handle application errors  
      if (error instanceof AppError) {
        const problem = buildProblemJSON(error.code, {
          detail: error.message,
          context: error.context,
        });
        
        return NextResponse.json(problem, { 
          status: problem.status,
          headers: { 'Content-Type': 'application/problem+json' }
        });
      }
      
      // Generic error fallback
      const problem = buildProblemJSON(ErrorCode.INTERNAL_SERVER_ERROR, {
        detail: 'An unexpected server error occurred',
      });

      return NextResponse.json(problem, { 
        status: 500,
        headers: { 'Content-Type': 'application/problem+json' }
      });
    }
  };
}