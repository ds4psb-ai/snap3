import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Problems } from '@/lib/errors/problem';
import { VEO3_PROMPT_SCHEMA } from '@/lib/schemas/veo3.zod';

export async function POST(request: NextRequest) {
  const instance = '/api/compile/veo3';
  
  try {
    const body = await request.json();
    const validatedData = VEO3_PROMPT_SCHEMA.parse(body);
    
    // Validate constraints
    if (validatedData.duration !== 8) {
      return Problems.invalidDuration(validatedData.duration, instance);
    }
    
    if (validatedData.aspect !== '16:9') {
      return Problems.unsupportedAspectRatio(validatedData.aspect, instance);
    }
    
    // TODO: Implement Veo3 prompt compilation
    return NextResponse.json({
      id: 'veo3-' + Date.now(),
      prompt: validatedData.prompt,
      duration: validatedData.duration,
      aspect: validatedData.aspect,
      resolution: validatedData.resolution,
      status: 'compiled',
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
      message: 'Invalid Veo3 prompt format',
      code: 'INVALID_REQUEST',
    }], instance);
  }
}

export async function GET() {
  return Problems.methodNotAllowed('GET', ['POST'], '/api/compile/veo3');
}




