# VDP Evidence Pack Integration - Change Log

**날짜**: 2025-08-17  
**버전**: v1.0.0  
**담당자**: Claude Code  
**목적**: Vertex 생성 VDP에 Evidence Pack 병합 기능 추가

## 📋 변경 사항 요약

### 🆕 신규 파일 생성

#### 1. `src/utils/gcs-json.js`
**역할**: Google Cloud Storage JSON 파일 로더  
**추가된 기능**:
```javascript
export async function readJsonFromGcs(gcsUri)
```
- GCS URI 파싱 및 검증 (`gs://bucket/path` 형식)
- Storage API를 통한 JSON 파일 다운로드
- UTF-8 디코딩 및 JSON 파싱
- 에러 핸들링 (Invalid URI, 파일 접근 실패)

#### 2. `src/utils/apply-evidence.js`
**역할**: Evidence Pack 병합 엔진  
**추가된 기능**:
```javascript
export function applyEvidencePack(vdp, packs)
```
- **오디오 지문 병합**: `packs.audio.audio` → `vdp.audio` (기존 필드 보존)
- **제품/브랜드 병합**: `packs.product.product_mentions` → `vdp.product_mentions`
- **브랜드 메트릭 병합**: `packs.product.brand_detection_metrics` → `vdp.brand_detection_metrics`
- **처리 메타데이터 추가**: `processing_metadata.evidence_packs` 상태 추적
- **Deep Clone**: `structuredClone()` 사용으로 원본 VDP 보호

### 🔧 기존 파일 수정

#### `src/server.js` - 메인 VDP 엔드포인트 수정
**위치**: `/api/vdp/extract-vertex` 핸들러 내부

**변경 지점 1**: Evidence Pack 병합 로직 추가 (라인 968-995)
```javascript
// 6.5) Evidence Pack Merger - Merge audio fingerprints and product evidence
let finalVdp = vdp;
try {
  const evidencePacks = {};
  const meta = req.body?.meta || {};
  
  if (meta.audioFpGcsUri) {
    const { readJsonFromGcs } = await import('./utils/gcs-json.js');
    evidencePacks.audio = await readJsonFromGcs(meta.audioFpGcsUri);
  }
  
  if (meta.productEvidenceGcsUri) {
    const { readJsonFromGcs } = await import('./utils/gcs-json.js');
    evidencePacks.product = await readJsonFromGcs(meta.productEvidenceGcsUri);
  }
  
  if (evidencePacks.audio || evidencePacks.product) {
    const { applyEvidencePack } = await import('./utils/apply-evidence.js');
    finalVdp = applyEvidencePack(vdp, evidencePacks);
    console.log('[VDP Evidence] Evidence merged:', {
      audio: !!evidencePacks.audio,
      product: !!evidencePacks.product
    });
  }
} catch (evidenceError) {
  console.error('[VDP Evidence] Evidence merge failed:', evidenceError?.message);
  // Continue with original VDP if evidence merge fails
}
```

**변경 지점 2**: 모든 VDP 참조를 `finalVdp`로 변경
- **GCS 저장**: `saveJsonToGcs(outGcsUri, finalVdp)`
- **토큰 효율성 분석**: `JSON.stringify(finalVdp)`
- **메타데이터 업데이트**: `finalVdp.processing_metadata`
- **최종 응답**: `res.json(finalVdp)`
- **비동기 저장**: `JSON.stringify(finalVdp, null, 2)`

**변경 지점 3**: 변수명 충돌 해결
- `vdpMode` → `finalVdpMode` (라인 1028)
- 관련 로그 메시지 업데이트

## 🚀 배포 정보

**배포 대상**: Cloud Run `t2-vdp` 서비스  
**리전**: us-central1  
**배포 시간**: 2025-08-17 12:30 (KST)  
**서비스 URL**: `https://t2-vdp-355516763169.us-central1.run.app`

**배포 결과**:
- ✅ 헬스 체크 통과 (`/health` → `{"ok": true}`)
- ✅ 문법 검증 완료 (`node --check src/server.js`)
- ✅ 로컬 테스트 통과 (Evidence Pack 병합 검증)

## 📐 API 변경사항

### 기존 API 호환성
**완전 하위 호환**: 기존 클라이언트는 수정 없이 동작

### 신규 메타데이터 필드
```javascript
{
  "gcsUri": "gs://bucket/video.mp4",
  "meta": {
    // 기존 필드들...
    "audioFpGcsUri": "gs://bucket/audio-fingerprint.json",      // NEW
    "productEvidenceGcsUri": "gs://bucket/product-evidence.json" // NEW
  }
}
```

### 응답 구조 변경
```javascript
{
  // 기존 VDP 구조...
  "audio": {
    // 기존 audio 필드 + Evidence Pack의 오디오 지문
    "fingerprint": "...",
    "confidence": 0.95,
    "cluster_id": "CL_001"
  },
  "product_mentions": [...],           // NEW from Evidence Pack
  "brand_detection_metrics": {...},    // NEW from Evidence Pack
  "processing_metadata": {
    // 기존 메타데이터...
    "evidence_packs": {                // NEW
      "audio_fp": true,
      "product_evidence": true
    }
  }
}
```

## 🔄 워크플로우 변경

### 기존 플로우
```
Client → T2-Extract → Vertex AI → VDP → GCS/Response
```

### 신규 플로우 (Evidence Pack 통합)
```
T2 Jobs → Evidence Pack → GCS
         ↓
Client → T2-Extract → Vertex AI → VDP → Evidence Pack Merger → Enhanced VDP → GCS/Response
```

## 🧪 테스트 검증

### 로컬 테스트
```bash
node test-evidence-merger.js
# ✅ Audio fingerprint merged: true
# ✅ Existing audio preserved: true  
# ✅ Product mentions added: 1
# ✅ Brand metrics added: true
# ✅ Processing metadata added: true
```

### 배포 후 테스트
```bash
curl -s https://t2-vdp-355516763169.us-central1.run.app/health
# ✅ {"ok": true}
```

## 🚨 장애 대응

### Error Handling
1. **Evidence Pack 로드 실패**: 원본 VDP로 계속 진행
2. **병합 프로세스 실패**: 로그 기록 후 원본 VDP 반환
3. **GCS 접근 오류**: 상세 에러 로그 + graceful fallback

### 모니터링 포인트
- `[VDP Evidence] Evidence merged:` 로그로 병합 성공 추적
- `[VDP Evidence] Evidence merge failed:` 로그로 실패 케이스 모니터링
- `processing_metadata.evidence_packs` 필드로 병합 상태 확인

## 📚 관련 문서

- **CLAUDE.md**: T2 Jobs Evidence Pack 생성 워크플로우
- **DEPLOYMENT.md**: Cloud Run 배포 가이드
- **TROUBLESHOOTING.md**: JSON 파싱 및 Vertex AI 이슈

## 🔮 향후 계획

1. **Evidence Pack 확장**: 소셜 메트릭, 감정 분석 등 추가 데이터
2. **배치 처리**: 다중 Evidence Pack 병합 지원
3. **캐싱**: GCS Evidence Pack 캐싱으로 성능 최적화
4. **검증**: Evidence Pack 스키마 검증 로직 추가

---

**변경사항 승인**: ✅ 모든 테스트 통과  
**운영 영향도**: 🟢 Zero-downtime 배포 완료  
**롤백 준비**: ✅ 이전 리비전 보존됨 (`t2-vdp-00017-xyz`)