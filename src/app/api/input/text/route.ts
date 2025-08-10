import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiProblems as Problems } from '@/lib/errors/problem';

const TextInputSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty'),
});

export async function POST(request: NextRequest) {
  const instance = '/api/input/text';
  
  try {
    const body = await request.json();
    const validatedData = TextInputSchema.parse(body);
    
    // TODO: Implement text processing logic
    return NextResponse.json({ 
      message: 'Text processed',
      text: validatedData.text 
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
      message: 'Failed to process text input request',
      code: 'INTERNAL_ERROR',
    }], instance);
  }
}


