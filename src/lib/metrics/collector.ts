/**
 * Metrics collector for job processing
 * Emits attempts, maxAttempts, and nextAttemptAt without PII
 */

export interface JobMetrics {
  queueName: string;
  jobId: string;
  traceId: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: Date;
  processingTimeMs?: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';
  error?: string;
}

export interface QueueMetrics {
  queueName: string;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTimeMs: number;
  p95ProcessingTimeMs: number;
  successRate: number;
}

class MetricsCollector {
  private jobMetrics: Map<string, JobMetrics> = new Map();
  private processingTimes: number[] = [];

  /**
   * Record job attempt metrics
   */
  recordJobAttempt(metrics: JobMetrics): void {
    const key = `${metrics.queueName}:${metrics.jobId}`;
    this.jobMetrics.set(key, metrics);

    // In production, emit to metrics service (e.g., CloudWatch, Datadog)
    this.emit('job.attempt', {
      queue: metrics.queueName,
      jobId: metrics.jobId,
      traceId: metrics.traceId,
      attempts: metrics.attempts,
      maxAttempts: metrics.maxAttempts,
      nextAttemptAt: metrics.nextAttemptAt?.toISOString(),
      status: metrics.status
    });
  }

  /**
   * Record job completion
   */
  recordJobCompletion(
    queueName: string,
    jobId: string,
    traceId: string,
    processingTimeMs: number,
    attempts: number
  ): void {
    this.processingTimes.push(processingTimeMs);
    
    // Keep only last 1000 samples for percentile calculation
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }

    this.emit('job.completed', {
      queue: queueName,
      jobId,
      traceId,
      processingTimeMs,
      attempts
    });
  }

  /**
   * Record job failure
   */
  recordJobFailure(
    queueName: string,
    jobId: string,
    traceId: string,
    attempts: number,
    maxAttempts: number,
    nextAttemptAt?: Date,
    error?: string
  ): void {
    this.emit('job.failed', {
      queue: queueName,
      jobId,
      traceId,
      attempts,
      maxAttempts,
      nextAttemptAt: nextAttemptAt?.toISOString(),
      willRetry: attempts < maxAttempts,
      error: error?.substring(0, 100) // Truncate error messages
    });
  }

  /**
   * Get queue-level metrics
   */
  getQueueMetrics(queueName: string): QueueMetrics {
    const jobs = Array.from(this.jobMetrics.values())
      .filter(m => m.queueName === queueName);

    const queued = jobs.filter(j => j.status === 'queued').length;
    const processing = jobs.filter(j => j.status === 'processing').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    const total = jobs.length;

    const avgProcessingTimeMs = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;

    const p95ProcessingTimeMs = this.calculatePercentile(this.processingTimes, 0.95);
    const successRate = total > 0 ? completed / total : 0;

    return {
      queueName,
      queued,
      processing,
      completed,
      failed,
      avgProcessingTimeMs,
      p95ProcessingTimeMs,
      successRate
    };
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  /**
   * Emit metrics to monitoring service
   * In production, this would send to CloudWatch, Datadog, etc.
   */
  private emit(metricName: string, dimensions: Record<string, any>): void {
    if (process.env.NODE_ENV === 'production') {
      // Production: Send to metrics service
      console.log(JSON.stringify({
        metric: metricName,
        timestamp: new Date().toISOString(),
        dimensions
      }));
    } else if (process.env.DEBUG_METRICS === 'true') {
      // Development: Log metrics when debugging
      console.log(`[METRIC] ${metricName}:`, dimensions);
    }
  }

  /**
   * Clear old metrics to prevent memory leak
   */
  cleanup(olderThanMs: number = 3600000): void {
    const cutoff = Date.now() - olderThanMs;
    
    for (const [key, metrics] of this.jobMetrics.entries()) {
      if (metrics.nextAttemptAt && metrics.nextAttemptAt.getTime() < cutoff) {
        this.jobMetrics.delete(key);
      }
    }
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// Cleanup old metrics every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => metricsCollector.cleanup(), 3600000);
}