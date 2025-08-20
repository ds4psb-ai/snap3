import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { 
  VDPExtractionError, 
  PlatformNotSupportedError, 
  ContentNotAccessibleError, 
  RateLimitExceededError 
} from '../types';
import { APIResponse } from '../types';
import winston from 'winston';

export function createErrorHandler(logger: winston.Logger) {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Handle different types of errors
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let errorDetails: any = undefined;

    if (error instanceof ZodError) {
      // Validation errors
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      errorMessage = 'Request validation failed';
      errorDetails = {
        validationErrors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      };
    } else if (error instanceof VDPExtractionError) {
      // VDP extraction specific errors
      switch (error.severity) {
        case 'low':
          statusCode = 200; // Warning, but continue
          break;
        case 'medium':
          statusCode = 400;
          break;
        case 'high':
          statusCode = 400;
          break;
        case 'critical':
          statusCode = 500;
          break;
      }
      
      errorCode = 'VDP_EXTRACTION_ERROR';
      errorMessage = error.message;
      errorDetails = {
        step: error.step,
        severity: error.severity,
        originalError: error.originalError?.message,
      };
    } else if (error instanceof PlatformNotSupportedError) {
      statusCode = 400;
      errorCode = 'PLATFORM_NOT_SUPPORTED';
      errorMessage = error.message;
    } else if (error instanceof ContentNotAccessibleError) {
      statusCode = 400;
      errorCode = 'CONTENT_NOT_ACCESSIBLE';
      errorMessage = error.message;
    } else if (error instanceof RateLimitExceededError) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
      errorMessage = error.message;
    } else if (error.message?.includes('timeout')) {
      statusCode = 408;
      errorCode = 'REQUEST_TIMEOUT';
      errorMessage = 'Request timed out. Please try again.';
    } else if (error.message?.includes('ECONNREFUSED')) {
      statusCode = 503;
      errorCode = 'SERVICE_UNAVAILABLE';
      errorMessage = 'External service is currently unavailable';
    } else if (error.message?.includes('quota')) {
      statusCode = 429;
      errorCode = 'QUOTA_EXCEEDED';
      errorMessage = 'API quota exceeded. Please try again later.';
    }

    // Create standardized error response
    const response: APIResponse = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
      },
      meta: {
        processingTime: 0, // Will be set by response time middleware
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    };

    res.status(statusCode).json(response);
  };
}

export function createNotFoundHandler(logger: winston.Logger) {
  return (req: Request, res: Response) => {
    logger.warn('Route not found:', {
      url: req.url,
      method: req.method,
      ip: req.ip,
    });

    const response: APIResponse = {
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.url} not found`,
      },
      meta: {
        processingTime: 0,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    };

    res.status(404).json(response);
  };
}

export function createAsyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}