import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobQueue, getJobTracker, getJobWorker } from '@/lib/jobs/worker';
import { JobPriority } from '@/lib/jobs/types';
import { Problems } from '@/lib/errors/problem';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode } from '@/lib/errors/codes';

const PreviewRequestSchema = z.object({
  veo3Id: z.string().uuid(),
  prompt: z.string().min(1).max(1000),
  duration: z.literal(8),
  aspectRatio: z.literal('16:9'),
  quality: z.enum(['720p', '1080p']),
});

export async function POST(request: NextRequest) {
  try {
  // Validate request body
  const body = await request.json();
  const validation = PreviewRequestSchema.safeParse(body);
  
  if (!validation.success) {
    // Check for specific validation errors
    const durationError = validation.error.issues.find(i => i.path.includes('duration'));
    if (durationError) {
      return Problems.invalidDuration(body.duration, request.url);
    }
    
    const aspectError = validation.error.issues.find(i => i.path.includes('aspectRatio'));
    if (aspectError) {
      return Problems.unsupportedAspectRatio(body.aspectRatio, request.url);
    }
    
    // Generic validation error
    const violations = validation.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    return Problems.validation(violations, request.url);
  }
  
  const validatedData = validation.data;
  
  // Get instances
  const queue = getJobQueue();
  const tracker = getJobTracker();
  const worker = getJobWorker();
  
  // Check idempotency
  const idempotencyKey = request.headers.get('Idempotency-Key');
  if (idempotencyKey) {
    const existingJobId = tracker.getJobByIdempotencyKey(idempotencyKey);
    if (existingJobId) {
      const existingJob = queue.getJob(existingJobId);
      if (existingJob) {
        // Return existing job
        const response = NextResponse.json(
          {
            id: existingJob.id,
            status: existingJob.status,
            progress: existingJob.progress,
            createdAt: new Date(existingJob.createdAt).toISOString(),
          },
          { status: 202 }
        );
        response.headers.set('Location', `/api/jobs/${existingJob.id}`);
        return response;
      }
    }
  }
  
  // Get request ID for rate limiting
  const requestId = request.headers.get('X-Request-Id') ?? 
                   request.headers.get('CF-Ray') ?? 
                   `req-${Date.now()}`;
  
    // Create job
    const job = queue.enqueue({
      type: 'preview',
      payload: validatedData,
      priority: JobPriority.NORMAL,
      requestId,
      idempotencyKey,
      metadata: {
        userAgent: request.headers.get('User-Agent'),
        ip: request.headers.get('X-Forwarded-For') ?? request.headers.get('X-Real-IP'),
      },
    });
    
    // Track idempotency
    if (idempotencyKey) {
      tracker.setIdempotencyKey(idempotencyKey, job.id);
    }
    
    // Track request
    tracker.addJobToRequest(requestId, job.id);
    tracker.recordRequest(requestId);
    
    // Create response
    const response = NextResponse.json(
      {
        id: job.id,
        status: job.status,
        progress: job.progress,
        createdAt: new Date(job.createdAt).toISOString(),
      },
      { status: 202 }
    );
    
    // Add Location header
    response.headers.set('Location', `/api/jobs/${job.id}`);
    
    return response;
  } catch (error) {
    console.error('Preview job creation error:', error);
    return NextResponse.json(
      Problems.internalServerError('Failed to create preview job'),
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    Problems.notFound('Endpoint not found'),
    { status: 404, headers: { 'Content-Type': 'application/problem+json' } }
  );
}




