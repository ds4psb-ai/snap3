import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 실제로는 T3 터미널에서 메트릭을 가져와야 함
    // 현재는 샘플 데이터로 시뮬레이션
    const urisStatus = {
      context: 'frontend',
      decision: 'PROCEED' as const,
      consensus_score: 0.85,
      active_agents: ['Cursor', 'ClaudeCode', 'GPT-5'],
      routing_path: ['Context Detection', 'Agent Routing', 'Consensus', 'Decision', 'Execution'],
      performance_metrics: {
        p95_response_time: 274,
        error_rate: 0.02,
        throughput: 45
      },
      quality_gates: {
        circuit_breaker: 'CLOSED' as const,
        dlq_count: 0,
        saga_compensations: 0
      },
      last_updated: new Date().toISOString()
    };

    return NextResponse.json(urisStatus);
  } catch (error) {
    console.error('URIS status fetch error:', error);
    return NextResponse.json(
      { error: 'URIS status를 가져올 수 없습니다' },
      { status: 500 }
    );
  }
}
