import { NextRequest, NextResponse } from 'next/server';
import { GCSProvider } from '@/lib/storage/providers/gcs';
import { withErrorHandling } from '@/lib/errors/withErrorHandling';
import { headers } from 'next/headers';

/**
 * GET /api/datasets/export/partition/[dt]
 * Stream JSONL data from a specific partition
 * Supports ETag and 304 Not Modified responses
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ dt: string }> }
) => {
  const { dt } = await params;
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dt)) {
    return NextResponse.json(
      {
        type: 'https://api.snap3.com/problems/invalid-parameter',
        title: 'Invalid Parameter',
        status: 400,
        detail: `Invalid date format: ${dt}. Expected YYYY-MM-DD`,
        instance: request.url,
      },
      { status: 400 }
    );
  }

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

  // Generate ETag based on partition date
  const etag = `"partition-${dt}-v1"`;
  
  // Check If-None-Match header for caching
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { 
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  try {
    // Mock data for development
    if (process.env.NODE_ENV === 'development' && !process.env.GCP_PROJECT_ID) {
      const mockData = [
        {
          content_id: 'C000890',
          platform: 'Instagram',
          origin: 'Real-Footage',
          created_at: `${dt}T10:00:00Z`,
          view_count: 950000,
          digest_id: 'dgst_890_mock',
          trust_score: 0.91,
        },
        {
          content_id: 'C000891',
          platform: 'TikTok',
          origin: 'AI-Generated',
          created_at: `${dt}T11:30:00Z`,
          view_count: 1500000,
          digest_id: 'dgst_891_mock',
          trust_score: 0.87,
        },
        {
          content_id: 'C000892',
          platform: 'YouTube',
          origin: 'Real-Footage',
          created_at: `${dt}T14:15:00Z`,
          view_count: 750000,
          digest_id: 'dgst_892_mock',
          trust_score: 0.93,
        },
      ];

      // Convert to JSONL format
      const jsonlData = mockData.map(item => JSON.stringify(item)).join('\n');
      
      return new NextResponse(jsonlData, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-ndjson',
          'ETag': etag,
          'Cache-Control': 'private, max-age=3600',
          'X-Partition-Date': dt,
          'X-Source': 'mock',
        },
      });
    }

    // Stream from GCS for production
    const gcsProvider = new GCSProvider();
    
    // Create a TransformStream to convert the async generator to a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const line of gcsProvider.streamPartition(dt)) {
            controller.enqueue(new TextEncoder().encode(line + '\n'));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'ETag': etag,
        'Cache-Control': 'private, max-age=3600',
        'X-Partition-Date': dt,
        'X-Source': 'gcs',
      },
    });
  } catch (error: any) {
    console.error('Error exporting partition:', error);
    
    // Return problem details for storage errors
    return NextResponse.json(
      {
        type: 'https://api.snap3.com/problems/export-error',
        title: 'Export Error',
        status: 503,
        detail: `Failed to export partition data for date: ${dt}`,
        instance: request.url,
        code: 'PARTITION_EXPORT_ERROR',
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