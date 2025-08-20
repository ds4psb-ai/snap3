#!/bin/bash

echo "⏰ n8n 배치 스케줄러 설정 가이드"
echo "================================="
echo ""
echo "n8n에서 Cron 스케줄러를 설정하는 방법:"
echo ""
echo "1. n8n 웹 인터페이스 접속: http://localhost:5678"
echo ""
echo "2. 새 워크플로우 생성:"
echo "   - 'New Workflow' 클릭"
echo "   - 이름: 'Metadata Collection Scheduler'"
echo ""
echo "3. Cron 노드 추가:"
echo "   - 노드 팔레트에서 'Cron' 검색"
echo "   - 'Schedule Trigger' 노드 추가"
echo ""
echo "4. Cron 설정:"
echo "   - 15분마다: '*/15 * * * *'"
echo "   - 1시간마다: '0 * * * *'"  
echo "   - 매일 자정: '0 0 * * *'"
echo ""
echo "5. HTTP Request 노드 추가:"
echo "   - URL: http://localhost:3000/api/batch/collect-metadata"
echo "   - Method: POST"
echo "   - Headers: Content-Type: application/json"
echo ""
echo "6. 배치 수집 API 엔드포인트 (구현 필요):"
echo "   POST /api/batch/collect-metadata"
echo "   - 대기열의 URL들을 처리"
echo "   - VDP 업데이트"
echo "   - 메타데이터 새로 고침"
echo ""
echo "🔄 권장 스케줄:"
echo "   - 실시간: 사용자 요청시 즉시"
echo "   - 배치: 15분마다 대기열 처리"
echo "   - 갱신: 1시간마다 기존 데이터 업데이트"
echo "   - 정리: 매일 자정에 오래된 데이터 정리"

# 배치 처리용 API 엔드포인트 예시
echo ""
echo "📝 구현할 배치 API 예시:"
echo ""
cat << 'EOF'
// src/app/api/batch/collect-metadata/route.ts
export async function POST() {
  const pendingUrls = await getPendingUrls();
  
  for (const url of pendingUrls) {
    try {
      const result = await n8nClient.collectMetadata(url);
      await updateVdpMetadata(url, result);
    } catch (error) {
      await logBatchError(url, error);
    }
  }
  
  return NextResponse.json({
    processed: pendingUrls.length,
    timestamp: new Date().toISOString()
  });
}
EOF