# SAGA 보상 지점 매핑 분석 - T2-Extract Service
**생성일**: 2025-08-20 11:04 KST  
**서비스**: T3 VDP Extraction Service  
**범위**: 분산 트랜잭션 보상 패턴 식별

## 🎯 SAGA 보상 지점 식별 결과

### **Primary SAGA Transaction Flow**
```
1. VDP 생성 요청 접수
2. Vertex AI 처리 (GenAI VDP 생성)
3. Evidence Pack 처리 (선택적)
4. GCS 저장 (비동기)
5. 응답 반환 (동기/비동기)
```

## 🔍 식별된 보상 지점

### **1. GCS 업로드 보상 지점** (`src/server.js:1377`)
```javascript
// 🚨 SAGA Compensation Point #1
catch (gcsError) {
  console.error(`[VDP_UPLOAD_ERROR] ❌ Failed to save to GCS: ${gcsError.message}`);
  // 실패해도 본문으로는 항상 VDP 반환 (클라이언트가 승격 가능)
  finalVdp.processing_metadata = finalVdp.processing_metadata || {};
  finalVdp.processing_metadata.gcs_saved = false;
}
```

**보상 전략**: 
- **Forward Recovery**: 클라이언트에게 VDP 반환, 수동 재시도 가능
- **Metadata Flagging**: `gcs_saved: false`로 실패 상태 표시
- **Graceful Degradation**: 전체 트랜잭션 실패 방지

### **2. 비동기 GCS 보상 지점** (`src/server.js:1465-1467`)
```javascript
// 🚨 SAGA Compensation Point #2  
setTimeout(async () => {
  try {
    await file.save(JSON.stringify(finalVdp, null, 2), {
      metadata: { contentType: 'application/json' }
    });
    console.log(`[Async Complete] VDP saved to ${outGcsUri}`);
  } catch (err) {
    console.error(`[Async Error] Failed to save to ${outGcsUri}:`, err.message);
    // 🔄 No compensation action - Fire-and-forget pattern
  }
}, 1000);
```

**보상 전략**:
- **Fire-and-Forget**: 실패 시 로깅만 수행
- **No Rollback**: 이미 202 응답 반환 후이므로 보상 불가
- **외부 모니터링 의존**: 실패 시 외부 시스템에서 재처리 필요

### **3. Vertex AI 처리 보상 지점** (암시적)
**위치**: VDP 생성 과정에서 Vertex AI 호출 실패  
**현재 상태**: 명시적 보상 로직 없음  
**권장 보상**: 

```javascript
// 🚨 Missing SAGA Compensation Point #3
try {
  const vdpResult = await vertexAI.generateVDP(input);
} catch (vertexError) {
  // 권장 보상 로직
  return {
    success: false,
    error: "VDP_GENERATION_FAILED", 
    compensationAction: "RETRY_WITH_FALLBACK",
    fallbackService: "backup-vdp-generator"
  };
}
```

## 📊 SAGA 패턴 분석

### **현재 구현 패턴**
| 단계 | 서비스 | 보상 타입 | 보상 완성도 |
|------|--------|-----------|-------------|
| VDP 생성 | Vertex AI | ❌ 없음 | 0% |
| 동기 GCS 저장 | GCS | ✅ Forward Recovery | 80% |
| 비동기 GCS 저장 | GCS | ⚠️ 로깅만 | 20% |
| Evidence Pack | 로컬 처리 | ❌ 없음 | 0% |

### **권장 SAGA 패턴 개선**

#### **1. Orchestration-based SAGA (권장)**
```javascript
class VDPSagaOrchestrator {
  async executeVDPSaga(request) {
    const context = { 
      stepCompleted: [],
      compensationStack: [] 
    };
    
    try {
      // Step 1: VDP Generation
      const vdp = await this.generateVDP(request);
      context.stepCompleted.push('VDP_GENERATED');
      context.compensationStack.push(() => this.cleanupVDP(vdp.id));
      
      // Step 2: GCS Upload
      const gcsPath = await this.uploadToGCS(vdp);
      context.stepCompleted.push('GCS_UPLOADED');
      context.compensationStack.push(() => this.deleteFromGCS(gcsPath));
      
      // Step 3: BigQuery Load (if needed)
      await this.loadToBigQuery(vdp);
      context.stepCompleted.push('BQ_LOADED');
      
      return { success: true, data: vdp };
      
    } catch (error) {
      await this.executeCompensation(context);
      throw error;
    }
  }
}
```

#### **2. Choreography-based SAGA (대안)**
```javascript
// Event-driven compensation
eventBus.on('VDP_GENERATION_FAILED', async (event) => {
  await cleanupPartialVDP(event.vdpId);
});

eventBus.on('GCS_UPLOAD_FAILED', async (event) => {
  await markVDPForRetry(event.vdpId);
  await notifyAdmin(event.error);
});
```

## 🚨 Critical Issues & Recommendations

### **Issue #1: 비동기 보상 불가능**
**문제**: 202 응답 후 비동기 GCS 저장 실패 시 보상 불가  
**해결책**: 
```javascript
// 상태 기반 보상 테이블
const compensationTable = {
  'ASYNC_GCS_FAILED': {
    action: 'SCHEDULE_RETRY',
    maxRetries: 3,
    backoffMs: [1000, 5000, 15000]
  }
};
```

### **Issue #2: Vertex AI 실패 시 전체 실패**
**문제**: Vertex AI 실패 시 명시적 보상 없음  
**해결책**:
```javascript
const fallbackChain = [
  'vertex-ai-primary',
  'vertex-ai-backup', 
  'openai-fallback',
  'cached-similar-vdp'
];
```

### **Issue #3: Evidence Pack 고아 상태**
**문제**: VDP 생성 실패 시 Evidence Pack 정리 안됨  
**해결책**:
```javascript
// TTL 기반 자동 정리
evidencePack.metadata.ttl = Date.now() + (24 * 60 * 60 * 1000);
```

## 🔧 구현 우선순위

### **Phase 1: 즉시 구현 (1-2일)**
1. **Vertex AI 보상 로직** - 실패 시 캐시된 유사 VDP 반환
2. **동기 GCS 재시도** - 3회 재시도 + 지수 백오프
3. **상태 메타데이터 강화** - 각 단계별 성공/실패 상태 기록

### **Phase 2: 단기 구현 (1주)**  
1. **비동기 보상 큐** - 실패한 비동기 작업 재시도 시스템
2. **Health Check 보상** - 서비스 상태 기반 보상 전략
3. **Monitoring Integration** - SAGA 실패 알림 시스템

### **Phase 3: 장기 구현 (2-4주)**
1. **완전한 Orchestrator** - 중앙 집중식 SAGA 관리
2. **Event-Driven Compensation** - 이벤트 기반 보상 패턴
3. **Cross-Service SAGA** - Worker와 T2-Extract 간 분산 트랜잭션

## 📊 모니터링 메트릭

### **SAGA 성공률 측정**
```javascript
const sagaMetrics = {
  'total_saga_executions': Counter,
  'saga_success_rate': Histogram,
  'compensation_triggered': Counter,
  'compensation_success_rate': Histogram
};
```

### **보상 실행 추적**
```javascript
const compensationMetrics = {
  'gcs_compensation_count': Counter,
  'vertex_fallback_count': Counter, 
  'evidence_cleanup_count': Counter,
  'retry_success_rate': Histogram
};
```

---

**분석 완료**: T3 SAGA 보상 지점 2개 식별, 1개 권장 추가  
**다음 단계**: Phase 1 보상 로직 구현  
**메트릭**: T3 VDP 모니터링 19회 실행 완료 (RSS: 44-49MB 안정)