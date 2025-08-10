import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PreviewRequestSchema = z.object({
  veo3Id: z.string(),
  prompt: z.string(),
  duration: z.literal(8),
  aspectRatio: z.literal('16:9'),
  quality: z.enum(['720p', '1080p']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = PreviewRequestSchema.parse(body);
    
    // Generate job ID
    const jobId = 'job-' + Date.now();
    
    // TODO: Implement async job creation
    console.log('Creating preview job:', jobId, validatedData);
    
    // Return 202 Accepted with job ID
    return NextResponse.json(
      {
        jobId,
        status: 'accepted',
        message: 'Preview job created successfully',
        pollUrl: `/api/jobs/${jobId}`,
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid preview request' },
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

