import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
    return NextResponse.json(
      { error: 'Invalid ingest data' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}




