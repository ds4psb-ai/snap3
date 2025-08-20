import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // HEAD_SUMMARY.md 파일 읽기
    const summaryPath = path.join(process.cwd(), 'HEAD_SUMMARY.md');
    
    let content = '';
    let updated_at = new Date().toISOString();
    
    try {
      const fileContent = await fs.readFile(summaryPath, 'utf-8');
      content = fileContent;
      
      // 파일 수정 시간 가져오기
      const stats = await fs.stat(summaryPath);
      updated_at = stats.mtime.toISOString();
    } catch (fileError) {
      // 파일이 없거나 읽을 수 없는 경우 기본 내용 제공
      content = `# 프로젝트 현황

## 현재 상태
- 프로젝트: Snap3 VDP Platform
- 상태: 재귀개선 Sprint 진행 중
- 단계: T+0~30분 (SummaryDock 구현)

## 최근 활동
- GPT-5 전문가 재귀개선 시스템 설계 완료
- ClaudeCode: DLQ 퍼블리셔 + AJV 스키마 게이트 구현 중
- Cursor: SummaryDock 요약 패널 구현 중

## 다음 단계
- T+30~60분: Circuit Breaker + PlatformWizard
- T+60~90분: Saga 구조 + 스키마 검증 UI

---
*HEAD_SUMMARY.md 파일을 찾을 수 없습니다. 기본 내용을 표시합니다.*`;
    }
    
    return NextResponse.json({
      content,
      updated_at,
      source: 'HEAD_SUMMARY.md'
    });
    
  } catch (error) {
    console.error('Summary API error:', error);
    
    return NextResponse.json(
      {
        content: '프로젝트 현황을 불러올 수 없습니다.',
        updated_at: new Date().toISOString(),
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
