import { NextRequest, NextResponse } from 'next/server';
import { getJobQueue, getJobTracker } from '@/lib/jobs/worker';
import { withErrorHandling } from '@/lib/errors/withErrorHandling';
import { ApiProblems } from '@/lib/errors/problem';
import { JobStatus } from '@/lib/jobs/types';

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  
  // Get job from queue
  const queue = getJobQueue();
  const tracker = getJobTracker();
  const job = queue.getJob(id);
  
  if (!job) {
    return ApiProblems.notFound(`Job ${id} not found`);
  }
  
  // Build response based on job status
  const response: Record<string, any> = {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    createdAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString(),
  };
  
  // Add status-specific fields
  if (job.startedAt) {
    response.startedAt = new Date(job.startedAt).toISOString();
  }
  
  if (job.completedAt) {
    response.completedAt = new Date(job.completedAt).toISOString();
  }
  
  if (job.status === JobStatus.COMPLETED && job.result) {
    response.result = job.result;
  }
  
  if (job.status === JobStatus.FAILED && job.error) {
    response.error = job.error;
  }
  
  // Add job history if available
  const history = tracker.getJobHistory(id);
  if (history.length > 0) {
    response.history = history.map(h => ({
      from: h.from,
      to: h.to,
      timestamp: new Date(h.timestamp).toISOString(),
    }));
  }
  
  // Add retry information for failed jobs
  if (job.status === JobStatus.FAILED && job.error?.retryAfter) {
    const retryAt = job.updatedAt + (job.error.retryAfter * 1000);
    response.retryAt = new Date(retryAt).toISOString();
  }
  
  // Add ETA for processing jobs
  if (job.status === JobStatus.PROCESSING) {
    const stats = queue.getStats();
    if (stats.avgProcessingTime) {
      const eta = job.startedAt! + stats.avgProcessingTime;
      response.estimatedCompletionAt = new Date(eta).toISOString();
    }
  }
  
  return NextResponse.json(response);
});

export async function POST() {
  return ApiProblems.notFound('POST method not supported for /api/jobs/[id]');
}














