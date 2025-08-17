# T2-Extract 추가 룰 개선사항 분석

**날짜**: 2025-08-17  
**분석 대상**: VDP Extractor 서버 안정성 및 운영 개선  
**기준**: 현재 Evidence Pack 병합 + Content ID 핫픽스 적용 후

## 🔍 현재 상태 분석

### ✅ 완료된 개선사항
1. **Evidence Pack 병합기**: 오디오 지문 + 제품/브랜드 증거 통합
2. **Content ID 핫픽스**: BigQuery 필수 필드 보장 (content_id, platform, load_timestamp)
3. **구조화된 로깅**: correlation ID 추적, 성능 메트릭, 단계별 로깅
4. **Ingest Worker**: 폴링 기반 자동 처리 파이프라인

## 🎯 추가 개선 권장사항

### 1. 에러 처리 강화 (HIGH PRIORITY)

#### 현재 문제
- Vertex AI 타임아웃 시 불완전한 VDP 반환
- 네트워크 오류 복구 메커니즘 부족
- Evidence Pack 병합 실패 시 로그만 기록

#### 권장 개선
```javascript
// src/utils/error-handler.js (NEW)
export class VDPError extends Error {
  constructor(message, code, stage, retryable = false) {
    super(message);
    this.code = code;
    this.stage = stage;
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();
  }
}

// 재시도 로직
const withRetry = async (fn, maxAttempts = 3, backoffMs = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts || !error.retryable) throw error;
      await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
    }
  }
};
```

### 2. BigQuery 스키마 검증 (MEDIUM PRIORITY)

#### 현재 상태
- Content ID 핫픽스로 기본 필드는 보장됨
- 복합 필드 구조 검증 없음

#### 권장 개선
```javascript
// src/utils/bigquery-validator.js (NEW)
export function validateVDPForBigQuery(vdp) {
  const errors = [];
  
  // 필수 필드 검증
  if (!vdp.content_id || vdp.content_id === 'unknown') {
    errors.push('content_id must be valid');
  }
  
  // 스키마 구조 검증
  if (vdp.scenes && !Array.isArray(vdp.scenes)) {
    errors.push('scenes must be array');
  }
  
  // RFC-3339 타임스탬프 검증
  if (vdp.load_timestamp && !isValidRFC3339(vdp.load_timestamp)) {
    errors.push('load_timestamp must be RFC-3339');
  }
  
  return errors;
}
```

### 3. 성능 모니터링 자동화 (MEDIUM PRIORITY)

#### 현재 상태
- 로그 기반 성능 메트릭 수집
- 알림 시스템 없음

#### 권장 개선
```javascript
// src/utils/metrics.js (NEW)
class MetricsCollector {
  constructor() {
    this.metrics = new Map();
  }
  
  recordProcessingTime(contentId, duration) {
    // Cloud Monitoring으로 메트릭 전송
    this.sendMetric('vdp_processing_duration', duration, {
      content_id: contentId
    });
  }
  
  recordHookQuality(contentId, strength) {
    this.sendMetric('hook_strength_score', strength, {
      content_id: contentId
    });
  }
}
```

### 4. 설정 관리 중앙화 (LOW PRIORITY)

#### 현재 문제
- 환경 변수 분산 관리
- 런타임 설정 변경 불가

#### 권장 개선
```javascript
// src/config/index.js (NEW)
export const config = {
  vertex: {
    region: process.env.VERTEX_REGION || 'us-central1',
    model: process.env.MODEL_NAME || 'gemini-2.5-pro',
    maxTokens: parseInt(process.env.MAX_OUTPUT_TOKENS) || 16384
  },
  vdp: {
    hookMaxStartSec: parseFloat(process.env.HOOK_MAX_START_SEC) || 3.0,
    hookMinStrength: parseFloat(process.env.HOOK_MIN_STRENGTH) || 0.70,
    densitySceneMin: parseInt(process.env.DENSITY_SCENES_MIN) || 4
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    structured: process.env.NODE_ENV === 'production',
    enableMetrics: process.env.ENABLE_METRICS === 'true'
  }
};
```

## 🚨 운영 룰 강화

### BigQuery 적재 안전성
```bash
# CLAUDE.md 추가 룰
- **BigQuery 필수 필드 검증**: content_id, platform, load_timestamp 사전 검증 필수
- **VDP 스키마 버전 관리**: 스키마 변경 시 backward compatibility 보장
- **타임스탬프 표준화**: RFC-3339 형식 강제, 타임존 UTC 고정
```

### Evidence Pack 통합 안전성
```bash
# CLAUDE.md 추가 룰
- **Evidence Pack 실패 격리**: 병합 실패 시 원본 VDP 유지
- **GCS 접근 재시도**: Evidence Pack 로드 실패 시 3회 재시도
- **부분 증거 허용**: 오디오/제품 증거 중 일부만 있어도 병합 진행
```

### 로깅 및 모니터링
```bash
# CLAUDE.md 추가 룰
- **상관관계 ID 추적**: 모든 요청에 correlation ID 생성/전파
- **성능 임계값**: 처리 시간 >30s 시 WARNING, >60s 시 ERROR
- **Hook 품질 모니터링**: strength_score <0.7 시 품질 알림
```

## 📊 배포 우선순위

### Phase 1: 에러 처리 강화 (즉시)
- VDPError 클래스 도입
- Vertex AI 재시도 로직
- Evidence Pack 실패 격리

### Phase 2: 검증 강화 (1주 내)
- BigQuery 스키마 검증
- RFC-3339 타임스탬프 검증
- VDP 구조 완성도 체크

### Phase 3: 모니터링 자동화 (2주 내)
- Cloud Monitoring 연동
- 성능 임계값 알림
- Hook 품질 트래킹

### Phase 4: 설정 중앙화 (선택적)
- 설정 관리 리팩토링
- 런타임 설정 변경 지원
- 환경별 설정 분리

## 🔧 즉시 적용 가능한 마이크로 개선

### 1. 간단한 에러 분류
```javascript
// 기존 catch 블록 개선
catch (error) {
  const errorType = error.message.includes('timeout') ? 'TIMEOUT' : 
                   error.message.includes('quota') ? 'QUOTA' : 'UNKNOWN';
  logger.vdpError(contentId, error, `vertex_${errorType.toLowerCase()}`, correlationId);
}
```

### 2. Health Check 강화
```javascript
// /health 엔드포인트에 Vertex AI 연결 체크 추가
app.get('/health', async (req, res) => {
  try {
    // Vertex AI 연결 테스트
    const vertex = new VertexAI({
      project: process.env.PROJECT_ID,
      location: process.env.REGION
    });
    
    res.json({ 
      ok: true, 
      vertex_connection: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      ok: false, 
      vertex_connection: 'unhealthy',
      error: error.message 
    });
  }
});
```

## 📋 권장 Action Items

1. **즉시**: 에러 처리 강화 및 Health Check 개선
2. **1주 내**: BigQuery 검증 및 Evidence Pack 안전성 강화  
3. **2주 내**: 성능 모니터링 자동화
4. **월 단위**: 설정 관리 리팩토링

이러한 개선을 통해 T2-Extract 서버의 안정성과 운영성이 크게 향상될 것입니다.