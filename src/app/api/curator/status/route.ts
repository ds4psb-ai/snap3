import { NextRequest, NextResponse } from 'next/server';

interface PipelineStatus {
  t1: {
    status: 'idle' | 'uploading' | 'completed' | 'failed';
    uploads: Array<{
      filename: string;
      uploadTime: string;
      linkCount: number;
      gcsPath: string;
    }>;
  };
  t2: {
    status: 'idle' | 'processing' | 'completed' | 'failed';
    jobs: Array<{
      jobId: string;
      sourceFile: string;
      processed: number;
      total: number;
      successRate: number;
      goldPath: string;
      startTime: string;
      endTime?: string;
    }>;
  };
  t3: {
    status: 'idle' | 'loading' | 'completed' | 'failed';
    loads: Array<{
      tableId: string;
      recordsLoaded: number;
      searchIndexed: boolean;
      exportReady: boolean;
      loadTime: string;
    }>;
  };
  overall: {
    totalUploads: number;
    totalLinks: number;
    totalProcessed: number;
    successRate: number;
    lastActivity: string;
  };
}

/**
 * Curator Status API - Monitor T1→T2→T3 Pipeline
 */
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, this would query actual job status from database/storage
    // For now, return mock status data for development
    
    const status: PipelineStatus = {
      t1: {
        status: 'completed',
        uploads: [
          {
            filename: 'sample-links.csv',
            uploadTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
            linkCount: 15,
            gcsPath: 'tough-variety-raw/sample-links.csv'
          }
        ]
      },
      t2: {
        status: 'completed',
        jobs: [
          {
            jobId: 't2-1705891234567-abc123def',
            sourceFile: 'sample-links.csv',
            processed: 15,
            total: 15,
            successRate: 100,
            goldPath: 'tough-variety-gold/sample-links-1705891234567.jsonl',
            startTime: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
            endTime: new Date(Date.now() - 180000).toISOString() // 3 minutes ago
          }
        ]
      },
      t3: {
        status: 'completed',
        loads: [
          {
            tableId: `vdp_shortform_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
            recordsLoaded: 15,
            searchIndexed: true,
            exportReady: true,
            loadTime: new Date(Date.now() - 120000).toISOString() // 2 minutes ago
          }
        ]
      },
      overall: {
        totalUploads: 1,
        totalLinks: 15,
        totalProcessed: 15,
        successRate: 100,
        lastActivity: new Date(Date.now() - 120000).toISOString()
      }
    };
    
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('Status API Error:', error);
    
    return NextResponse.json(
      {
        type: 'https://api.snap3.example/problems/status-fetch-failed',
        title: 'Status fetch failed',
        status: 500,
        detail: error instanceof Error ? error.message : 'Unknown status error',
        instance: '/api/curator/status',
        code: 'STATUS_FETCH_FAILED'
      },
      { status: 500 }
    )
// TODO: Set headers using res.headers.set() pattern;
  }
}