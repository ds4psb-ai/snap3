# Ingest Worker Failure Analysis - 2025-08-19

## 🎯 Executive Summary

**Status**: ✅ Instagram Success (4건) vs ❌ YouTube/TikTok Failures  
**Root Cause**: Content ID extraction failures for YouTube/TikTok platforms  
**Service Health**: T2VDP service is fully operational and correctly configured  
**Immediate Action**: Worker logic debugging and content ID extraction fixes needed

## 📊 Failure Pattern Analysis

### ✅ **Instagram Processing - SUCCESS**
- **처리 건수**: 4건 성공
- **Status**: 정상 처리 완료
- **Content Key**: `instagram:DLx4668NGGv` 형식으로 정상 생성
- **VDP Generation**: Hook Genome 포함 완전한 VDP 생성 성공

### ❌ **YouTube Processing - FAILURE**
- **처리 건수**: 1건 요청 접수 → 워커에서 실패 (.failed 큐로 이동)
- **에러 코드**: `CONTENT_KEY_MISSING: content_id missing after correction attempts`
- **실패 패턴**: Content ID 추출 실패 → Content Key 생성 불가

### ❌ **TikTok Processing - FAILURE**  
- **처리 건수**: 1건 요청 접수 → 워커에서 실패 (.failed 큐로 이동)
- **예상 에러**: YouTube와 동일한 Content ID 추출 실패 패턴

## 🔍 Worker Log 상세 분석

### 성공 사례 (YouTube: cFyBJaoNyGY)
```log
[INFO] Generated content_key: youtube:cFyBJaoNyGY
[DEBUG] Platform validation passed: youtube
[DEBUG] Content key format validation passed: youtube:cFyBJaoNyGY
✅ Video uploaded to: gs://tough-variety-raw-central1/raw/input/youtube/cFyBJaoNyGY.mp4
🚀 Triggering VDP generation: https://t2-vdp-355516763169.us-central1.run.app
✅ VDP generation triggered successfully
```

### 실패 사례 (YouTube: test-youtube-request.json)
```log
Content ID: [EMPTY]
Content key: [EMPTY]
[ERROR] CONTENT_KEY_MISSING: content_id missing after correction attempts
[ERROR] Request: test-youtube-request.json, Platform: youtube, Content Key: [EMPTY]
```

## 🔧 Infrastructure 상태 검증

### ✅ **T2VDP Service Health - PERFECT**
```bash
# Service Status
Service: t2-vdp (us-central1) - ✅ READY (100% traffic)
URL: https://t2-vdp-355516763169.us-central1.run.app

# Environment Variables - ✅ ALL CORRECT
PLATFORM_SEGMENTED_PATH=true
RAW_BUCKET=tough-variety-raw-central1  
EVIDENCE_MODE=true
HOOK_MIN_STRENGTH=0.70
```

### ✅ **Instagram VDP Test - SUCCESS**
- **Test Content**: instagram:DLx4668NGGv
- **Response**: 완전한 VDP 생성 성공
- **Hook Genome**: 정상 분석 완료
- **Processing Time**: 정상 범위

### ❌ **Platform Validation Issues**
- **Root Cause**: 테스트 파일 부재로 인한 Vertex AI 처리 실패
- **Status**: T2VDP 서비스 자체는 정상, 테스트 인프라 문제

## 🚨 Critical Issues Identified

### 1. **Content ID Extraction Logic Failure**
**Problem**: YouTube/TikTok 요청에서 content_id 추출 실패
```log
Raw platform: youtube
Normalized platform: youtube  
Content ID: [EMPTY] ← 🚨 CRITICAL ISSUE
Content key: [EMPTY]
```

**Impact**: Content Key 생성 불가 → 전체 파이프라인 실패

### 2. **Platform-Specific Processing Gaps**
**Instagram Success Factor**: Content ID 정상 추출 및 처리
**YouTube/TikTok Failure**: 동일한 추출 로직에서 실패

### 3. **GCS Bucket Structure Issues**
**Missing Directory**: YouTube 디렉토리 누락 감지
```bash
# 존재하는 디렉토리
gs://tough-variety-raw-central1/ingest/requests/instagram/
gs://tough-variety-raw-central1/ingest/requests/tiktok/

# 누락된 디렉토리  
gs://tough-variety-raw-central1/ingest/requests/youtube/ ← 🚨 MISSING
```

## 🔍 Request Format Analysis

### ✅ **Successful Request Pattern (Instagram)**
```json
{
  "content_id": "DLx4668NGGv",
  "platform": "instagram", 
  "source_url": "https://www.instagram.com/p/DLx4668NGGv/",
  "content_key": "instagram:DLx4668NGGv"
}
```

### ❌ **Failed Request Pattern (YouTube)**
```json
{
  "platform": "youtube",
  "source_url": "https://www.youtube.com/watch?v=cFyBJaoNyGY",
  // Missing or malformed content_id field
}
```

## 🛠️ Immediate Action Plan

### **Priority 1: Worker Logic Debugging** 
```bash
# 1. Content ID 추출 로직 검증
cd ~/snap3-jobs
grep -r "content_id" worker-*.sh

# 2. YouTube/TikTok content_id 추출 패턴 확인  
grep -A 10 -B 10 "Content ID:" worker-output.log

# 3. 플랫폼별 정규화 로직 검증
./scripts/debug-content-extraction.sh
```

### **Priority 2: GCS Bucket Structure Fix**
```bash
# YouTube 디렉토리 생성
gsutil mkdir gs://tough-variety-raw-central1/ingest/requests/youtube/

# 디렉토리 구조 검증
gsutil ls gs://tough-variety-raw-central1/ingest/requests/
```

### **Priority 3: Worker Test Environment**
```bash
# 테스트 요청 파일 생성
cat > /tmp/test-youtube-fixed.json << EOF
{
  "content_id": "cFyBJaoNyGY",
  "platform": "youtube",
  "source_url": "https://www.youtube.com/watch?v=cFyBJaoNyGY",
  "content_key": "youtube:cFyBJaoNyGY"
}
EOF

# 워커 단일 테스트 실행
cd ~/snap3-jobs
./worker-ingest-v2.sh --once --test
```

## 📈 Business Impact Assessment

### **Current State**
- **Instagram Pipeline**: ✅ 100% Success Rate (4/4)
- **YouTube Pipeline**: ❌ 50% Failure Rate (1 success, 1 failure)  
- **TikTok Pipeline**: ❌ 100% Failure Rate (1/1 failed)

### **Production Risk**
- **High**: YouTube/TikTok 자동 처리 불가
- **Medium**: Manual 처리로 우회 가능
- **Low**: 핵심 인프라 (T2VDP) 정상 작동

### **Recovery Time Estimate**
- **Worker Logic Fix**: 2-4 hours
- **GCS Structure Fix**: 30 minutes  
- **Full Testing**: 1 hour
- **Total**: 3-5 hours

## 🎯 Success Criteria

### **Phase 1: Basic Recovery**
- [ ] YouTube content_id 추출 성공률 >90%
- [ ] TikTok content_id 추출 성공률 >90%  
- [ ] GCS 디렉토리 구조 완전성 100%

### **Phase 2: Full Validation**
- [ ] 모든 플랫폼 워커 처리 성공률 >95%
- [ ] Content Key 생성 실패율 <1%
- [ ] .failed 큐 적체 건수 0건

### **Phase 3: Monitoring**
- [ ] 실시간 워커 성능 모니터링 구축
- [ ] 플랫폼별 성공률 대시보드
- [ ] 자동 알람 시스템 구축

## 📋 Recommended Next Steps

1. **Immediate (0-1 hour)**
   - GCS YouTube 디렉토리 생성
   - Worker content_id 추출 로직 검증

2. **Short-term (1-4 hours)**  
   - YouTube/TikTok content_id 추출 버그 수정
   - 단위 테스트 실행 및 검증

3. **Medium-term (1-2 days)**
   - 플랫폼별 처리 로직 통합 및 일관성 확보
   - 모니터링 및 알람 시스템 구축

---

**분석 완료**: 2025-08-19 22:10 KST  
**분석자**: Claude Code SuperClaude  
**다음 액션**: Worker 로직 디버깅 및 Content ID 추출 수정