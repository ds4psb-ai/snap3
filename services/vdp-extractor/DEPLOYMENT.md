# VDP Extractor Service - 배포 가이드

GitHub VDP 추출기를 snap3 프로젝트에 포팅한 독립적인 VDP 추출 서비스입니다.

## 🚀 빠른 시작 (Cloud Run 배포)

### 1. 환경 설정
```bash
# API 키 설정
export GEMINI_API_KEY="your_gemini_api_key_here"
export YOUTUBE_API_KEY="your_youtube_api_key_here"
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

### 2. Cloud Run 배포 (서울 리전)
```bash
cd /Users/ted/snap3/services/vdp-extractor

# 서울 리전 배포
gcloud run deploy vdp-extractor \
  --source=. \
  --allow-unauthenticated \
  --region=asia-northeast3 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300s \
  --set-env-vars=GEMINI_API_KEY=${GEMINI_API_KEY},YOUTUBE_API_KEY=${YOUTUBE_API_KEY},RAW_BUCKET=tough-variety-raw
```

### 3. Cloud Run 배포 (미국 서부)
```bash
# 미국 서부 리전 배포
gcloud run deploy vdp-extractor \
  --source=. \
  --allow-unauthenticated \
  --region=us-central1 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300s \
  --set-env-vars=GEMINI_API_KEY=${GEMINI_API_KEY},YOUTUBE_API_KEY=${YOUTUBE_API_KEY},RAW_BUCKET=tough-variety-raw
```

### 4. 자동 배포 스크립트 사용
```bash
# 배포 스크립트 실행 (미국 서부)
./deploy-cloud-run.sh us-central1

# 배포 스크립트 실행 (서울)
./deploy-cloud-run.sh asia-northeast3

# Cloud Build 사용
./deploy-cloud-run.sh us-central1 your-project-id --cloud-build
```

## 📋 배포 후 API 엔드포인트

배포가 완료되면 다음과 같은 URL 구조로 API에 접근할 수 있습니다:

```
https://vdp-extractor-<hash>-<region>.run.app
```

### 주요 엔드포인트:
- **Health Check**: `/health`
- **Service Info**: `/api/v1/info`
- **VDP 추출**: `/api/v1/extract`
- **배치 추출**: `/api/v1/extract/batch`
- **메트릭스**: `/api/v1/metrics`

## 🧪 배포 테스트

### 1. Health Check
```bash
curl "https://your-service-url/health"
```

### 2. Basic VDP 추출 테스트
```bash
curl -X POST "https://your-service-url/api/v1/extract" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### 3. Deep Analysis 테스트
```bash
curl -X POST "https://your-service-url/api/v1/extract" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "options":{
      "deepAnalysis":true,
      "maxComments":5,
      "includeContentAnalysis":true,
      "includeViralFactors":true
    }
  }'
```

### 4. Batch 처리 테스트
```bash
curl -X POST "https://your-service-url/api/v1/extract/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "urls":[
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/WrnM0FRLnqA"
    ],
    "options":{"maxComments":3}
  }'
```

## 🔧 로컬 개발

### 1. 환경 설정
```bash
cd /Users/ted/snap3/services/vdp-extractor
npm install
cp .env.example .env
# .env 파일에 API 키 설정
```

### 2. 개발 서버 시작
```bash
npm run dev
```

### 3. 테스트 실행
```bash
# 기본 테스트
node test-service.js

# 또는 빌드 후 프로덕션 모드
npm run build
npm start
```

## 🏗️ 프로덕션 설정

### 환경 변수 설정
```bash
# 필수 환경 변수
GEMINI_API_KEY=your_gemini_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here

# 선택적 환경 변수
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
MAX_CONCURRENT_JOBS=5
```

### Cloud Run 설정
- **메모리**: 2Gi (추천)
- **CPU**: 2 (추천)
- **최대 인스턴스**: 10
- **동시성**: 10
- **타임아웃**: 300초

## 📊 성능 및 모니터링

### 메트릭스 확인
```bash
curl "https://your-service-url/api/v1/metrics"
```

### 로그 확인
```bash
gcloud run logs tail vdp-extractor --region=us-central1
```

### 서비스 상태 확인
```bash
curl "https://your-service-url/api/v1/info"
```

## 🔗 snap3 프로젝트 통합

### VDP 스키마 호환성
- **SimpleVDP**: 기존 snap3 VDP 스키마와 호환
- **ViralDNAProfile**: 확장된 분석 데이터 포함
- **자동 변환**: SimpleVDP ↔ ViralDNAProfile 변환 지원

### 통합 예시
```javascript
// snap3 애플리케이션에서 사용
const vdpResponse = await fetch('https://your-vdp-service/api/v1/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.youtube.com/watch?v=VIDEO_ID',
    options: { deepAnalysis: true }
  })
});

const vdp = await vdpResponse.json();
// snap3 데이터베이스에 저장
await snap3.vdp.store(vdp.data);
```

## 🚨 트러블슈팅

### 일반적인 문제들

1. **API 키 오류**
   ```
   Error: Gemini API key is required
   ```
   → 환경 변수 `GEMINI_API_KEY` 설정 확인

2. **YouTube API 할당량 초과**
   ```
   Error: Quota exceeded for YouTube Data API
   ```
   → YouTube API 콘솔에서 할당량 확인

3. **메모리 부족**
   ```
   Error: Out of memory
   ```
   → Cloud Run 메모리를 2Gi 이상으로 설정

4. **타임아웃 오류**
   ```
   Error: Request timeout
   ```
   → Cloud Run 타임아웃을 300초로 설정

### 디버깅
```bash
# 로컬에서 디버그 모드 실행
LOG_LEVEL=debug npm run dev

# Cloud Run 로그 확인
gcloud run logs tail vdp-extractor --region=us-central1 --follow
```

## 📦 배포 아티팩트

배포 완료 후 다음 파일들이 생성됩니다:
- `deployment-info.txt`: 배포 정보 요약
- Docker 이미지: `gcr.io/PROJECT_ID/vdp-extractor`
- Cloud Run 서비스: `vdp-extractor`

## 🔄 업데이트 및 재배포

```bash
# 코드 변경 후 재배포
./deploy-cloud-run.sh us-central1

# 또는 gcloud 직접 사용
gcloud run deploy vdp-extractor --source=. --region=us-central1
```

## 📈 확장성

- **Auto Scaling**: Cloud Run의 자동 스케일링 활용
- **Concurrency**: 요청당 10개 동시 처리
- **Rate Limiting**: IP당 15분에 100요청 제한
- **Batch Processing**: 최대 50개 URL 동시 처리

## 🔐 보안

- **HTTPS Only**: 모든 통신 암호화
- **CORS 설정**: 허용된 도메인만 접근
- **Rate Limiting**: DDoS 방지
- **Input Validation**: 모든 입력 검증
- **Error Sanitization**: 민감한 정보 노출 방지