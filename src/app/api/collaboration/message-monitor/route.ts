import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface MessageInfo {
  filename: string;
  content: string;
  timestamp: string;
  priority: 'critical' | 'high' | 'normal';
  processed: boolean;
}

interface MonitorResponse {
  status: 'success' | 'error';
  messages: MessageInfo[];
  lastCheck: string;
  hasNewMessages: boolean;
}

// 메시지 우선순위 분석
function analyzePriority(content: string): 'critical' | 'high' | 'normal' {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('critical') || lowerContent.includes('🚨')) {
    return 'critical';
  }
  
  if (lowerContent.includes('high') || lowerContent.includes('⚠️')) {
    return 'high';
  }
  
  return 'normal';
}

// 메시지 파일 읽기
async function readMessageFiles(): Promise<MessageInfo[]> {
  const repoRoot = process.cwd();
  const messages: MessageInfo[] = [];
  
  try {
    const files = await fs.readdir(repoRoot);
    const messageFiles = files.filter(file => file.startsWith('.collab-msg-'));
    
    for (const filename of messageFiles) {
      try {
        const filePath = path.join(repoRoot, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        
        messages.push({
          filename,
          content: content.trim(),
          timestamp: stats.mtime.toISOString(),
          priority: analyzePriority(content),
          processed: false
        });
      } catch (error) {
        console.error(`Error reading message file ${filename}:`, error);
      }
    }
    
    // 타임스탬프 기준으로 정렬 (최신순)
    messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
  } catch (error) {
    console.error('Error reading message directory:', error);
  }
  
  return messages;
}

// 메시지 처리 상태 업데이트
async function markMessageProcessed(filename: string): Promise<void> {
  const repoRoot = process.cwd();
  const originalPath = path.join(repoRoot, filename);
  const processedPath = path.join(repoRoot, `${filename}.processed`);
  
  try {
    await fs.rename(originalPath, processedPath);
    console.log(`Message processed: ${filename} → ${filename}.processed`);
  } catch (error) {
    console.error(`Error marking message as processed: ${filename}`, error);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<MonitorResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'mark-processed') {
      const filename = searchParams.get('filename');
      if (filename) {
        await markMessageProcessed(filename);
        return NextResponse.json({ 
          status: 'success', 
          message: `Message ${filename} marked as processed` 
        });
      }
    }
    
    // 메시지 파일 읽기
    const messages = await readMessageFiles();
    const hasNewMessages = messages.length > 0;
    
    const response: MonitorResponse = {
      status: 'success',
      messages,
      lastCheck: new Date().toISOString(),
      hasNewMessages
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Message monitor error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Failed to monitor messages',
        messages: [],
        lastCheck: new Date().toISOString(),
        hasNewMessages: false
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, filename } = body;
    
    if (action === 'mark-processed' && filename) {
      await markMessageProcessed(filename);
      return NextResponse.json({ 
        status: 'success', 
        message: `Message ${filename} marked as processed` 
      });
    }
    
    return NextResponse.json(
      { status: 'error', error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Message monitor POST error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
