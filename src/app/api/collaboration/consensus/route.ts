import { NextRequest, NextResponse } from 'next/server';

interface ConsensusResult {
  score: number;
  status: 'pending' | 'agreed' | 'disagreed' | 'error';
  lastUpdate: string;
  participants: string[];
}

export async function GET(request: NextRequest) {
  try {
    // 실제로는 합의 시스템에서 가져옴
    const consensusStatus: ConsensusResult = {
      score: 0.91,
      status: 'agreed',
      lastUpdate: new Date().toISOString(),
      participants: ['GPT-5 Pro', 'ClaudeCode', 'Cursor']
    };

    return NextResponse.json({
      consensus: consensusStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Consensus API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consensus status' },
      { status: 500 }
    );
  }
}
