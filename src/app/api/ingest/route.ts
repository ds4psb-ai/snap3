import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Problems } from '@/lib/errors/problem';

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
      return Problems.validation(violations, request.url);
    }
    return Problems.validation(
      [{ field: 'request', message: 'Invalid ingest data' }],
      request.url
    );
  }
}

export async function GET(request: NextRequest) {
  return Problems.methodNotAllowed('GET', ['POST'], request.url);
}

export async function PUT(request: NextRequest) {
  return Problems.methodNotAllowed('PUT', ['POST'], request.url);
}

export async function DELETE(request: NextRequest) {
  return Problems.methodNotAllowed('DELETE', ['POST'], request.url);
}




