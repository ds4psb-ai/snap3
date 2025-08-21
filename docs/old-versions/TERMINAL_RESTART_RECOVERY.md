# 🔄 터미널 재시작 복구 가이드

**생성 시간**: 2025-08-21T01:07 (한국시간 10:07)  
**상황**: 터미널 재시작 예정  
**목적**: 콘텍스트 손실 없이 작업 복구  

---

## 📊 현재 진행 상황 (65% 완료)

### ✅ 완료된 작업들
1. **메타데이터 추출 완벽 구현**
   - Instagram: 336K likes, 3.3K comments 실제 데이터 ✅
   - TikTok: 1.5M views, 226K likes 실제 데이터 ✅
   - API: `/api/extract-social-metadata` 완전 작동 ✅

2. **통합 파이프라인 구축**
   - `/api/submit` 단일 엔드포인트 3플랫폼 지원 ✅
   - 플랫폼별 디렉토리 저장 (`ingest/requests/{platform}/`) ✅
   - Evidence OFF 모드 구현 완료 ✅

3. **VDP 생성 부분 성공**
   - Instagram VDP 1개 생성 성공 ✅
   - Hook Genome 분석 완료 (strength: 0.95) ✅
   - 기본 VDP 구조 확인 ✅

### ❌ 현재 막힌 지점
1. **T3 VDP 서비스 연동 문제**
   - 서비스 실행되나 `/api/health` 접근 불가
   - TikTok/YouTube VDP 생성 미완료
   - 메타데이터가 VDP에 포함되지 않음

2. **성능 이슈**
   - VDP 생성 시간 12분+ (목표: 30-60초)
   - 비동기 처리 타임아웃 발생

---

## 🚀 터미널 재시작 후 즉시 실행할 명령어들

### 1. 디렉토리 이동 및 환경 확인
```bash
cd /Users/ted/snap3
pwd
ls -la
```

### 2. 서버 상태 확인
```bash
# T1 메인 서버 상태
curl -s http://localhost:8080/api/health && echo "T1 OK" || echo "T1 DOWN"

# T3 VDP 서버 상태  
curl -s http://localhost:8082/api/health && echo "T3 OK" || echo "T3 DOWN"

# 실행 중인 프로세스 확인
ps aux | grep -E "(node|npm)" | grep -v grep
```

### 3. 서버 재시작 (필요시)
```bash
# T1 서버 재시작
cd /Users/ted/snap3
export PROJECT_ID="tough-variety-466003-c5"
export RAW_BUCKET="tough-variety-raw-central1"
export PLATFORM_SEGMENTED_PATH="true"
node simple-web-server.js &

# T3 서버 재시작
cd /Users/ted/snap3/services/t2-extract
export PROJECT_ID="tough-variety-466003-c5"
export LOCATION="us-central1"
export RAW_BUCKET="tough-variety-raw-central1" 
export PLATFORM_SEGMENTED_PATH="true"
PORT=8082 npm start &
```

### 4. 현재 상태 즉시 파악
```bash
# 생성된 VDP 파일 확인
gsutil ls gs://tough-variety-raw-central1/raw/vdp/instagram/ | grep "DM5lA9LgVXb"
gsutil ls gs://tough-variety-raw-central1/raw/vdp/tiktok/ | grep "7522521344920030478" || echo "TikTok VDP 없음"
gsutil ls gs://tough-variety-raw-central1/raw/vdp/youtube/ | grep "DVUv8E8YLXg" || echo "YouTube VDP 없음"

# 최근 요청 상태 확인
gsutil ls gs://tough-variety-raw-central1/ingest/requests/instagram/ | tail -2
gsutil ls gs://tough-variety-raw-central1/ingest/requests/tiktok/ | tail -2  
gsutil ls gs://tough-variety-raw-central1/ingest/requests/youtube/ | tail -2
```

---

## 🎯 즉시 이어서 할 작업 순서

### Step 1: 메타데이터 추출 재확인 (2분)
```bash
# Instagram 메타데이터 추출 테스트
curl -X POST http://localhost:8080/api/extract-social-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.instagram.com/reel/DM5lA9LgVXb/",
    "platform": "instagram"
  }'

# TikTok 메타데이터 추출 테스트
curl -X POST http://localhost:8080/api/extract-social-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.tiktok.com/@dollydoesvlogs/video/7522521344920030478",
    "platform": "tiktok"
  }'
```

### Step 2: 생성된 Instagram VDP 분석 (1분)
```bash
# Instagram VDP 내용 확인 - 메타데이터 포함 여부 체크
gsutil cat gs://tough-variety-raw-central1/raw/vdp/instagram/DM5lA9LgVXb.NEW.universal.json | jq '{
  content_id: .content_id,
  platform: .metadata.platform,
  like_count: .metadata.like_count,
  comment_count: .metadata.comment_count,
  hook_strength: .overall_analysis.hookGenome.strength_score,
  processing_source: .processing_metadata.source
}'
```

### Step 3: T3 서비스 문제 해결 시도 (5분)
```bash
# T3 서비스 엔드포인트 확인
curl -s http://localhost:8082/ && echo "T3 루트 접근 가능"
curl -s http://localhost:8082/api/ && echo "T3 API 경로 접근 가능"

# T3 로그 확인
ps aux | grep "node src/server.js"

# 대안: T1에서 직접 VDP 생성 시도
curl -X POST http://localhost:8080/api/vdp/extract-main \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.tiktok.com/@dollydoesvlogs/video/7522521344920030478",
    "platform": "tiktok"
  }'
```

### Step 4: GPT-5 솔루션 적용 (상황에 따라)
- GPT-5 Pro CTO 답변 확인: `/Users/ted/snap3/DEBUG_STATUS_FOR_GPT5.md`
- 제안된 솔루션 즉시 적용
- 무한 디버그 탈출 전략 실행

---

## 📂 중요 파일 위치

### 현재 상태 문서
- **디버그 현황**: `/Users/ted/snap3/DEBUG_STATUS_FOR_GPT5.md`
- **복구 가이드**: `/Users/ted/snap3/TERMINAL_RESTART_RECOVERY.md` (이 파일)

### 핵심 코드 파일
- **메인 서버**: `/Users/ted/snap3/simple-web-server.js`
- **워커 스크립트**: `/Users/ted/snap3/jobs/worker-ingest-v2.sh`
- **T3 서비스**: `/Users/ted/snap3/services/t2-extract/`

### 테스트 URL들 (실제 검증완료)
- **Instagram**: `https://www.instagram.com/reel/DM5lA9LgVXb/`
- **TikTok**: `https://www.tiktok.com/@dollydoesvlogs/video/7522521344920030478`
- **YouTube**: `https://www.youtube.com/shorts/DVUv8E8YLXg`

---

## 🎯 성공 기준 (목표 상기)

### 즉시 달성해야 할 것들
1. **TikTok VDP 생성**: 1.5M views, 226K likes 메타데이터 포함
2. **YouTube VDP 생성**: 기본 메타데이터 포함
3. **메타데이터 보존**: 추출된 실제 데이터가 VDP에 포함
4. **처리 시간 단축**: 30-60초 내 완료

### 최종 목표
- **90%+ 자동화**: 사용자 입력 최소화
- **3플랫폼 일관성**: 동일한 VDP 구조
- **영상해석 완료**: Hook Genome + 씬 분석
- **실제 메타데이터**: Mock 데이터 없음

---

## 💡 터미널 재시작 후 체크리스트

- [ ] 디렉토리 위치 확인 (`/Users/ted/snap3`)
- [ ] 서버 상태 확인 (T1: 8080, T3: 8082)
- [ ] 환경변수 설정 확인
- [ ] 기존 VDP 파일 존재 확인
- [ ] 메타데이터 추출 API 작동 확인
- [ ] GPT-5 솔루션 적용 준비
- [ ] 콘텍스트 복구 완료

**이 가이드로 터미널 재시작 후 5분 내에 작업 복구 가능합니다.**