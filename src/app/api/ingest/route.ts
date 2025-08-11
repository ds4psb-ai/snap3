import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiProblems } from '@/lib/errors/problem';

const IngestSchema = z.object({
  type: z.enum(['url', 'text', 'upload']),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = IngestSchema.parse(body);
    
    // TODO: Implement ingest logic
    return NextResponse.json({
      id: 'ingest-' + Date.now(),
      type: validatedData.type,
      status: 'normalized',
      embedCompatibility: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const violations = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return ApiProblems.validation(violations);
    }
    return ApiProblems.validation([
      { field: 'request', message: 'Invalid ingest data' }
    ]);
  }
}

export async function GET() {
  return ApiProblems.methodNotAllowed('GET', ['POST']);
}

export async function PUT() {
  return ApiProblems.methodNotAllowed('PUT', ['POST']);
}

export async function DELETE() {
  return ApiProblems.methodNotAllowed('DELETE', ['POST']);
}





