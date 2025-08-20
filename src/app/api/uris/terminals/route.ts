import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 실제로는 각 터미널의 상태를 가져와야 함
    // 현재는 샘플 데이터로 시뮬레이션
    const terminalStatuses = [
      {
        name: 'Main T1',
        type: 'T1' as const,
        status: 'online' as const,
        cpu_usage: 35,
        memory_usage: 42,
        network_io: 12,
        active_processes: 8,
        last_heartbeat: new Date().toISOString(),
        current_task: '합의 허브 및 컨텍스트 라우팅'
      },
      {
        name: 'Jobs T2',
        type: 'T2' as const,
        status: 'online' as const,
        cpu_usage: 68,
        memory_usage: 75,
        network_io: 25,
        active_processes: 12,
        last_heartbeat: new Date(Date.now() - 5000).toISOString(),
        current_task: '배치 작업 및 워커 관리'
      },
      {
        name: 'T2VDP T3',
        type: 'T3' as const,
        status: 'online' as const,
        cpu_usage: 82,
        memory_usage: 88,
        network_io: 45,
        active_processes: 15,
        last_heartbeat: new Date(Date.now() - 3000).toISOString(),
        current_task: 'VDP 모델 및 추출기 처리'
      },
      {
        name: 'Storage T4',
        type: 'T4' as const,
        status: 'online' as const,
        cpu_usage: 28,
        memory_usage: 35,
        network_io: 8,
        active_processes: 6,
        last_heartbeat: new Date(Date.now() - 10000).toISOString(),
        current_task: '데이터 적재 및 스키마 검증'
      }
    ];

    return NextResponse.json(terminalStatuses);
  } catch (error) {
    console.error('Terminal statuses fetch error:', error);
    return NextResponse.json(
      { error: '터미널 상태를 가져올 수 없습니다' },
      { status: 500 }
    );
  }
}
