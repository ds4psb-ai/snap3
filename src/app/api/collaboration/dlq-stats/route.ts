import { NextRequest, NextResponse } from 'next/server';

interface DLQStats {
  failedJobs: number;
  errorTypes: Record<string, number>;
  lastError: string;
  recoveryRate: number;
}

export async function GET(request: NextRequest) {
  try {
    // 실제로는 DLQ 시스템에서 가져옴
    const dlqStats: DLQStats = {
      failedJobs: 2,
      errorTypes: {
        'timeout': 1,
        'validation_error': 1,
        'network_error': 0
      },
      lastError: '2025-08-20T20:25:00Z',
      recoveryRate: 0.85
    };

    return NextResponse.json({
      dlq: dlqStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('DLQ stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DLQ stats' },
      { status: 500 }
    );
  }
}
