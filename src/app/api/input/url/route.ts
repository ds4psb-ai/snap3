import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiProblems as Problems } from '@/lib/errors/problem';

const UrlInputSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

export async function POST(request: NextRequest) {
  const instance = '/api/input/url';
  
  try {
    const body = await request.json();
    const validatedData = UrlInputSchema.parse(body);
    
    // TODO: Implement URL processing logic
    return NextResponse.json({ 
      message: 'URL processed',
      url: validatedData.url 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const violations = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: 'VALIDATION_ERROR',
      }));
      return Problems.validation(violations, instance);
    }
    
    return Problems.validation([{
      field: 'request',
      message: 'Failed to process URL input',
      code: 'URL_PROCESSING_ERROR',
    }], instance);
  }
}


