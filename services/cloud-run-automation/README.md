# 🚀 Cloud Run Automation Service

## 개요
GPT-5 Pro와 연동하여 VDP (Viral DNA Profile) 생성을 자동화하는 Cloud Run 서비스입니다.

## 주요 기능
- **GPT-5 Pro 자동 컨설팅**: 문제 발생 시 자동으로 GPT-5 Pro에게 전략 요청
- **VDP 자동 생성**: YouTube, TikTok, Instagram 3개 플랫폼 자동 처리
- **실시간 모니터링**: 진행 상황 및 결과 실시간 추적
- **주기적 실행**: 30분마다 자동 실행 (cron job)
- **에러 복구**: 실패 시 자동으로 GPT-5 Pro에게 해결책 요청

## API 엔드포인트

### 기본 엔드포인트
- `GET /api/health` - 서비스 헬스체크
- `GET /api/status` - 자동화 상태 확인
- `GET /api/results` - VDP 생성 결과 조회

### 자동화 제어
- `POST /api/start` - 자동화 워크플로우 시작
- `POST /api/reset` - 자동화 상태 재설정

### 직접 호출
- `POST /api/gpt5-ask` - GPT-5 Pro에게 직접 질문
- `POST /api/vdp-generate` - VDP 직접 생성

## 설치 및 실행

### 1. 의존성 설치
```bash
cd services/cloud-run-automation
npm install
```

### 2. 환경변수 설정
```bash
cp env.example .env
# .env 파일에서 OPENAI_API_KEY 설정
```

### 3. 로컬 실행
```bash
npm start
```

### 4. Cloud Run 배포
```bash
npm run deploy
```

## 자동화 워크플로우

### Phase 1: GPT-5 Pro 전략 요청
- 현재 상황 분석
- 3개 플랫폼 VDP 생성 전략 수립
- 기술적 해결책 제시

### Phase 2: VDP 생성 실행
- YouTube: https://www.youtube.com/shorts/aX5y8wz60ws
- TikTok: https://www.tiktok.com/@lovedby4bxnia/video/7529657626947374349
- Instagram: https://www.instagram.com/reel/DLx4668NGGv/

### Phase 3: 결과 보고 및 다음 단계
- 성공/실패 결과 분석
- GPT-5 Pro에게 다음 단계 요청
- 자동 복구 시도

## 사용 예시

### 자동화 시작
```bash
curl -X POST http://localhost:5000/api/start
```

### GPT-5 Pro 직접 질문
```bash
curl -X POST http://localhost:5000/api/gpt5-ask \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "yt-dlp format error 해결 방법",
    "context": "YouTube 다운로드 실패"
  }'
```

### VDP 직접 생성
```bash
curl -X POST http://localhost:5000/api/vdp-generate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/shorts/aX5y8wz60ws",
    "platform": "youtube"
  }'
```

### 상태 확인
```bash
curl http://localhost:5000/api/status
```

## 모니터링

### 로그 확인
```bash
tail -f automation.log
```

### 실시간 상태
```bash
watch -n 5 'curl -s http://localhost:5000/api/status | jq'
```

## 문제 해결

### GPT-5 Pro API 오류
- OPENAI_API_KEY 확인
- API 할당량 확인
- 네트워크 연결 확인

### VDP 생성 실패
- Universal VDP Clone 서비스 상태 확인
- yt-dlp 설치 및 업데이트
- 포맷 오류 시 자동으로 GPT-5 Pro에게 해결책 요청

## 연동 서비스
- **Universal VDP Clone**: VDP 생성 서비스 (포트 4000)
- **GPT-5 Pro**: AI 컨설팅 서비스
- **Cloud Run**: 서버리스 배포 플랫폼

