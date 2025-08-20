import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createJobSchema = z.object({
  uploadId: z.string().min(1),
  gcsPath: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.enum(['csv', 'tsv', 'file']),
});

// Mock job storage - in production, use Redis/Database
const jobs = new Map<string, {
  id: string;
  uploadId: string;
  gcsPath: string;
  fileName: string;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = createJobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          type: 'https://snap3.example/problems/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid job creation request',
          errors: validation.error.flatten().fieldErrors,
          instance: request.url,
        },
        { status: 400 }
      );
    }

    const { uploadId, gcsPath, fileName, fileType } = validation.data;

    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create job record
    const job = {
      id: jobId,
      uploadId,
      gcsPath,
      fileName,
      fileType,
      status: 'pending' as const,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store job (in production, use Redis/Database)
    jobs.set(jobId, job);

    // In production, this would enqueue the job to BullMQ
    // For now, simulate processing with a timer
    setTimeout(() => {
      simulateJobProcessing(jobId);
    }, 1000);

    return NextResponse.json({
      jobId,
      status: job.status,
      message: 'Processing job created successfully',
      createdAt: job.createdAt.toISOString(),
    });

  } catch (error) {
    console.error('Job creation error:', error);
    
    return NextResponse.json(
      {
        type: 'https://snap3.example/problems/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to create processing job',
        instance: request.url,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Simulate job processing (in production, this would be handled by BullMQ workers)
async function simulateJobProcessing(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  // Simulate processing stages
  const stages = [
    { status: 'processing', progress: 25 },
    { status: 'processing', progress: 50 },
    { status: 'processing', progress: 75 },
    { status: 'completed', progress: 100 },
  ];

  for (const stage of stages) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    
    job.status = stage.status as any;
    job.progress = stage.progress;
    job.updatedAt = new Date();
    
    jobs.set(jobId, job);
  }
}

// Export jobs map for access in other routes
export { jobs };