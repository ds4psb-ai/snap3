import { NextRequest, NextResponse } from 'next/server';
import { BigQueryClient } from '@/lib/bigquery/client';
import { withErrorHandling } from '@/lib/errors/withErrorHandling';

/**
 * POST /api/datasets/search
 * Search datasets using BigQuery with various filters
 * 
 * Request body:
 * {
 *   contentId?: string,
 *   platform?: 'Instagram' | 'TikTok' | 'YouTube',
 *   origin?: 'Real-Footage' | 'AI-Generated',
 *   startDate?: string (YYYY-MM-DD),
 *   endDate?: string (YYYY-MM-DD),
 *   minViews?: number,
 *   maxDuration?: number
 * }
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
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
    const body = await request.json();
    
    // Validate search parameters
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        {
          type: 'https://api.snap3.com/problems/invalid-request',
          title: 'Invalid Request',
          status: 400,
          detail: 'At least one search parameter is required',
          instance: request.url,
        },
        { status: 400 }
      );
    }

    // Mock data for development
    if (process.env.NODE_ENV === 'development' && !process.env.GCP_PROJECT_ID) {
      const mockResults = [
        {
          content_id: 'C000888',
          platform: body.platform || 'Instagram',
          origin: body.origin || 'Real-Footage',
          created_at: '2024-12-15T10:30:00Z',
          view_count: 1250000,
          like_count: 85000,
          comment_count: 3200,
          share_count: 1500,
          duration_seconds: 8,
          aspect_ratio: '9:16',
          digest_id: 'dgst_888_abc123',
          trust_score: 0.92,
          hashtags: ['#tech', '#innovation', '#ai'],
          product_mentions: ['Product A', 'Service B'],
        },
        {
          content_id: 'C000889',
          platform: body.platform || 'TikTok',
          origin: body.origin || 'AI-Generated',
          created_at: '2024-12-14T15:45:00Z',
          view_count: 2300000,
          like_count: 125000,
          comment_count: 5600,
          share_count: 3200,
          duration_seconds: 8,
          aspect_ratio: '9:16',
          digest_id: 'dgst_889_def456',
          trust_score: 0.88,
          hashtags: ['#viral', '#trend', '#fyp'],
          product_mentions: ['Product C'],
        },
      ];

      return NextResponse.json({
        results: mockResults,
        count: mockResults.length,
        query: body,
        source: 'mock',
      });
    }

    // Use BigQuery for production
    const bqClient = new BigQueryClient();
    const results = await bqClient.advancedSearch(body);

    return NextResponse.json({
      results,
      count: results.length,
      query: body,
      source: 'bigquery',
    });
  } catch (error: any) {
    console.error('Error searching datasets:', error);
    
    // Return problem details for BigQuery errors
    return NextResponse.json(
      {
        type: 'https://api.snap3.com/problems/query-error',
        title: 'Query Execution Error',
        status: 503,
        detail: 'Failed to execute search query on datasets',
        instance: request.url,
        code: 'QUERY_EXECUTION_ERROR',
        retry_after: 30,
      },
      { 
        status: 503,
        headers: {
          'Retry-After': '30',
        },
      }
    );
  }
});