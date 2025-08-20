import { NextRequest, NextResponse } from 'next/server';
import { agentRouter } from '../../../ai-collab/agent-router';

export async function POST(request: NextRequest) {
  try {
    const { fileChanges, commitMessage, correlationId } = await request.json();
    
    const context = agentRouter.detectContext(fileChanges || [], commitMessage);
    const decision = await agentRouter.routeDecision(context, correlationId || `AR-${Date.now()}`);
    
    return NextResponse.json(decision);
  } catch (error) {
    return NextResponse.json({
      error: 'Agent routing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}