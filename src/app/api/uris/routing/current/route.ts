import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 실제로는 현재 라우팅 플로우를 가져와야 함
    // 현재는 샘플 데이터로 시뮬레이션
    const currentFlow = {
      id: 'flow-001',
      context: 'frontend',
      steps: [
        {
          id: 'step-1',
          name: 'Context Detection',
          type: 'context' as const,
          status: 'completed' as const,
          duration: 45,
          agents: ['UCDE'],
          metrics: {
            accuracy: 0.95,
            confidence: 0.92,
            throughput: 50
          },
          timestamp: new Date(Date.now() - 300000).toISOString()
        },
        {
          id: 'step-2',
          name: 'Agent Routing',
          type: 'routing' as const,
          status: 'completed' as const,
          duration: 120,
          agents: ['DAOM'],
          metrics: {
            accuracy: 0.88,
            confidence: 0.85,
            throughput: 35
          },
          timestamp: new Date(Date.now() - 180000).toISOString()
        },
        {
          id: 'step-3',
          name: 'Consensus Building',
          type: 'consensus' as const,
          status: 'active' as const,
          duration: 85,
          agents: ['Cursor', 'ClaudeCode', 'GPT-5'],
          metrics: {
            accuracy: 0.91,
            confidence: 0.87,
            throughput: 28
          },
          timestamp: new Date(Date.now() - 95000).toISOString()
        },
        {
          id: 'step-4',
          name: 'Decision Making',
          type: 'decision' as const,
          status: 'pending' as const,
          duration: 0,
          agents: ['QGaC'],
          timestamp: new Date().toISOString()
        },
        {
          id: 'step-5',
          name: 'Execution',
          type: 'execution' as const,
          status: 'pending' as const,
          duration: 0,
          agents: ['SLIL'],
          timestamp: new Date().toISOString()
        }
      ],
      total_duration: 250,
      success_rate: 0.91,
      created_at: new Date(Date.now() - 300000).toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json(currentFlow);
  } catch (error) {
    console.error('Current routing flow fetch error:', error);
    return NextResponse.json(
      { error: '현재 라우팅 플로우를 가져올 수 없습니다' },
      { status: 500 }
    );
  }
}
