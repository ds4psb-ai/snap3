import { NextRequest, NextResponse } from 'next/server';

interface TerminalState {
  id: 'T1' | 'T2' | 'T3' | 'T4';
  name: string;
  port: number;
  status: 'online' | 'offline' | 'error' | 'starting';
  lastHeartbeat: string;
  load: number;
  memory: number;
}

export async function GET(request: NextRequest) {
  try {
    // 실제로는 각 터미널의 헬스체크 API를 호출
    const terminalStates: TerminalState[] = [
      {
        id: 'T1',
        name: 'Main Terminal',
        port: 3000,
        status: 'online',
        lastHeartbeat: new Date().toISOString(),
        load: 45,
        memory: 68
      },
      {
        id: 'T2',
        name: 'Jobs Terminal',
        port: 8080,
        status: 'online',
        lastHeartbeat: new Date(Date.now() - 5000).toISOString(),
        load: 72,
        memory: 85
      },
      {
        id: 'T3',
        name: 'T2VDP Terminal',
        port: 8082,
        status: 'starting',
        lastHeartbeat: new Date(Date.now() - 15000).toISOString(),
        load: 0,
        memory: 0
      },
      {
        id: 'T4',
        name: 'Storage Terminal',
        port: 8083,
        status: 'online',
        lastHeartbeat: new Date(Date.now() - 2000).toISOString(),
        load: 23,
        memory: 42
      }
    ];

    return NextResponse.json({
      terminals: terminalStates,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Terminal status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch terminal status' },
      { status: 500 }
    );
  }
}
