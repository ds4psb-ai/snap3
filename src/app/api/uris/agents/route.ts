import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 실제로는 각 에이전트의 상태를 가져와야 함
    // 현재는 샘플 데이터로 시뮬레이션
    const agentStatuses = [
      {
        name: 'Cursor',
        type: 'Cursor' as const,
        status: 'active' as const,
        current_task: 'UI/UX 구현 및 시각화',
        performance_score: 0.95,
        response_time: 150,
        success_rate: 0.98,
        last_activity: new Date().toISOString()
      },
      {
        name: 'ClaudeCode',
        type: 'ClaudeCode' as const,
        status: 'active' as const,
        current_task: '백엔드 시스템 구현',
        performance_score: 0.92,
        response_time: 320,
        success_rate: 0.95,
        last_activity: new Date(Date.now() - 30000).toISOString()
      },
      {
        name: 'GPT-5',
        type: 'GPT-5' as const,
        status: 'active' as const,
        current_task: '전략 분석 및 최적화',
        performance_score: 0.88,
        response_time: 450,
        success_rate: 0.93,
        last_activity: new Date(Date.now() - 60000).toISOString()
      }
    ];

    return NextResponse.json(agentStatuses);
  } catch (error) {
    console.error('Agent statuses fetch error:', error);
    return NextResponse.json(
      { error: '에이전트 상태를 가져올 수 없습니다' },
      { status: 500 }
    );
  }
}
