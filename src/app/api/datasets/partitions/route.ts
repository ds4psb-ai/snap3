import { NextRequest, NextResponse } from 'next/server';
import { GCSProvider } from '@/lib/storage/providers/gcs';
import { withErrorHandling } from '@/lib/errors/withErrorHandling';

/**
 * GET /api/datasets/partitions
 * List available dataset partitions from GCS bucket
 * Returns: Array of partition dates (YYYY-MM-DD format)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Check for API key authentication if needed
  const apiKey = request.headers.get('x-api-key');
  if (process.env.REQUIRE_API_KEY === 'true' && apiKey !== process.env.API_KEY) {
    return NextResponse.json(
      {
        type: 'https://api.snap3.com/problems/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid or missing API key',
        instance: request.url,
      },
      { status: 401 }
    );
  }

  try {
    const gcsProvider = new GCSProvider();
    const partitions = await gcsProvider.listPartitions();

    // Mock data fallback for development
    if (partitions.length === 0 && process.env.NODE_ENV === 'development') {
      const mockPartitions = [
        '2024-12-20',
        '2024-12-19',
        '2024-12-18',
        '2024-12-17',
        '2024-12-16',
      ];
      
      return NextResponse.json({
        partitions: mockPartitions,
        count: mockPartitions.length,
        bucket: 'snap3-gold',
        source: 'mock',
      });
    }

    return NextResponse.json({
      partitions,
      count: partitions.length,
      bucket: 'snap3-gold',
      source: 'gcs',
    });
  } catch (error: any) {
    console.error('Error listing partitions:', error);
    
    // Return problem details for GCS errors
    return NextResponse.json(
      {
        type: 'https://api.snap3.com/problems/storage-error',
        title: 'Storage Access Error',
        status: 503,
        detail: 'Failed to list dataset partitions from storage',
        instance: request.url,
        code: 'STORAGE_ACCESS_ERROR',
        retry_after: 60,
      },
      { 
        status: 503,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }
});