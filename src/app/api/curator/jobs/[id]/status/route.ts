import { NextRequest, NextResponse } from 'next/server';

// Import jobs map from create route (in production, use shared storage)
let jobs: Map<string, any>;
try {
  // This is a workaround for development - in production, use Redis/Database
  jobs = new Map();
} catch (error) {
  jobs = new Map();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    if (!jobId) {
      return NextResponse.json(
        {
          type: 'https://snap3.example/problems/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Job ID is required',
          instance: request.url,
        },
        { status: 400 }
      );
    }

    // In production, fetch from Redis/Database
    // For now, simulate job status
    const job = jobs.get(jobId) || generateMockJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          type: 'https://snap3.example/problems/not-found',
          title: 'Job Not Found',
          status: 404,
          detail: `Job with ID ${jobId} not found`,
          instance: request.url,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId: job.id,
      uploadId: job.uploadId,
      status: job.status,
      progress: job.progress,
      fileName: job.fileName,
      fileType: job.fileType,
      gcsPath: job.gcsPath,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      error: job.error,
    });

  } catch (error) {
    console.error('Job status fetch error:', error);
    
    return NextResponse.json(
      {
        type: 'https://snap3.example/problems/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to fetch job status',
        instance: request.url,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Generate mock job for demonstration
function generateMockJob(jobId: string) {
  const now = new Date();
  const createdAt = new Date(now.getTime() - Math.random() * 60000); // Random time in last minute
  
  // Simulate job progression over time
  const elapsed = now.getTime() - createdAt.getTime();
  let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
  let progress = 0;

  if (elapsed > 2000) {
    status = 'processing';
    progress = Math.min(90, Math.floor((elapsed - 2000) / 100));
  }
  
  if (elapsed > 10000) {
    status = 'completed';
    progress = 100;
  }

  return {
    id: jobId,
    uploadId: `upload_${jobId}`,
    gcsPath: `uploads/mock-${jobId}.csv`,
    fileName: `file-${jobId}.csv`,
    fileType: 'csv',
    status,
    progress,
    createdAt: createdAt.toISOString(),
    updatedAt: now.toISOString(),
  };
}