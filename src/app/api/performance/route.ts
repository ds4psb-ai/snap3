import { NextRequest, NextResponse } from 'next/server';

/**
 * Performance Monitoring API
 * 실시간 성능 지표 수집 및 제공
 */

interface PerformanceMetric {
  timestamp: string;
  type: 'metadata_extraction' | 'ui_response' | 'bridge_connection';
  platform?: 'instagram' | 'tiktok';
  duration: number;
  success: boolean;
  details?: any;
}

// 메모리 기반 메트릭 저장 (실제 환경에서는 Redis 등 사용)
let performanceMetrics: PerformanceMetric[] = [];

export async function POST(request: NextRequest) {
  try {
    const metric: PerformanceMetric = await request.json();
    
    // 메트릭 검증
    if (!metric.timestamp || !metric.type || typeof metric.duration !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metric format' },
        { status: 400 }
      );
    }
    
    // 메트릭 저장
    performanceMetrics.push(metric);
    
    // 최근 1000개만 유지 (메모리 관리)
    if (performanceMetrics.length > 1000) {
      performanceMetrics = performanceMetrics.slice(-1000);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Performance metric collection error:', error);
    return NextResponse.json(
      { error: 'Failed to collect metric' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const platform = searchParams.get('platform');
  const limit = parseInt(searchParams.get('limit') || '100');
  
  try {
    let filteredMetrics = performanceMetrics;
    
    // 타입 필터링
    if (type) {
      filteredMetrics = filteredMetrics.filter(m => m.type === type);
    }
    
    // 플랫폼 필터링
    if (platform) {
      filteredMetrics = filteredMetrics.filter(m => m.platform === platform);
    }
    
    // 최신 순으로 정렬 및 제한
    const recentMetrics = filteredMetrics
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    
    // 통계 계산
    const stats = calculateStats(filteredMetrics);
    
    return NextResponse.json({
      metrics: recentMetrics,
      stats,
      total: filteredMetrics.length
    });
    
  } catch (error) {
    console.error('Performance metrics retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

function calculateStats(metrics: PerformanceMetric[]) {
  if (metrics.length === 0) {
    return {
      avgDuration: 0,
      successRate: 0,
      p50: 0,
      p95: 0,
      count: 0
    };
  }
  
  const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
  const successfulRequests = metrics.filter(m => m.success).length;
  
  return {
    avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
    successRate: (successfulRequests / metrics.length) * 100,
    p50: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.floor(durations.length * 0.95)],
    count: metrics.length
  };
}
