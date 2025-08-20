import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 실제로는 최근 라우팅 플로우들을 가져와야 함
    // 현재는 샘플 데이터로 시뮬레이션
    const recentFlows = [
      {
        id: 'flow-002',
        context: 'backend',
        steps: [
          { id: 's1', status: 'completed' as const },
          { id: 's2', status: 'completed' as const },
          { id: 's3', status: 'completed' as const },
          { id: 's4', status: 'completed' as const },
          { id: 's5', status: 'completed' as const }
        ],
        total_duration: 320,
        success_rate: 0.94,
        created_at: new Date(Date.now() - 600000).toISOString(),
        updated_at: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 'flow-003',
        context: 'devops',
        steps: [
          { id: 's1', status: 'completed' as const },
          { id: 's2', status: 'completed' as const },
          { id: 's3', status: 'completed' as const },
          { id: 's4', status: 'completed' as const },
          { id: 's5', status: 'completed' as const }
        ],
        total_duration: 280,
        success_rate: 0.89,
        created_at: new Date(Date.now() - 900000).toISOString(),
        updated_at: new Date(Date.now() - 600000).toISOString()
      },
      {
        id: 'flow-004',
        context: 'security',
        steps: [
          { id: 's1', status: 'completed' as const },
          { id: 's2', status: 'completed' as const },
          { id: 's3', status: 'completed' as const },
          { id: 's4', status: 'completed' as const },
          { id: 's5', status: 'completed' as const }
        ],
        total_duration: 450,
        success_rate: 0.96,
        created_at: new Date(Date.now() - 1200000).toISOString(),
        updated_at: new Date(Date.now() - 900000).toISOString()
      },
      {
        id: 'flow-005',
        context: 'performance',
        steps: [
          { id: 's1', status: 'completed' as const },
          { id: 's2', status: 'completed' as const },
          { id: 's3', status: 'completed' as const },
          { id: 's4', status: 'completed' as const },
          { id: 's5', status: 'completed' as const }
        ],
        total_duration: 380,
        success_rate: 0.87,
        created_at: new Date(Date.now() - 1500000).toISOString(),
        updated_at: new Date(Date.now() - 1200000).toISOString()
      },
      {
        id: 'flow-006',
        context: 'architecture',
        steps: [
          { id: 's1', status: 'completed' as const },
          { id: 's2', status: 'completed' as const },
          { id: 's3', status: 'completed' as const },
          { id: 's4', status: 'completed' as const },
          { id: 's5', status: 'completed' as const }
        ],
        total_duration: 520,
        success_rate: 0.92,
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 1500000).toISOString()
      }
    ];

    return NextResponse.json(recentFlows);
  } catch (error) {
    console.error('Recent routing flows fetch error:', error);
    return NextResponse.json(
      { error: '최근 라우팅 플로우를 가져올 수 없습니다' },
      { status: 500 }
    );
  }
}
