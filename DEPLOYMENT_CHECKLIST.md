# 🚨 배포 전 필수 체크리스트

## Regional Alignment 검증

### 1. 환경변수 확인
```bash
echo "PROJECT_ID: $PROJECT_ID"
echo "REGION: $REGION" 
echo "RAW_BUCKET: $RAW_BUCKET"
```

**기대 결과:**
```
PROJECT_ID: tough-variety-466003-c5
REGION: us-central1
RAW_BUCKET: tough-variety-raw-central1
```

### 2. 배포 전 리전 검증
❌ **절대 금지**: us-west1 (지연 발생)  
✅ **필수**: us-central1 (Event 기반 파이프라인 최적화)

### 3. 주요 서비스 배포 명령어

#### T2-Extract 서비스
```bash
cd /Users/ted/snap3/services/t2-extract
./deploy-cloud-run.sh
```

#### VDP-Extractor 서비스  
```bash
cd /Users/ted/snap3/services/vdp-extractor
./deploy-cloud-run.sh us-central1 tough-variety-466003-c5
```

### 4. 배포 후 검증
```bash
# 서비스 URL 확인
gcloud run services list --region=us-central1

# 헬스 체크
curl https://t2-vdp-355516763169.us-central1.run.app/health
```

## 실수 방지 가이드

### 터미널 실수 방지
모든 터미널에서 아래 명령어를 실행하여 환경변수를 설정:
```bash
export PROJECT_ID="tough-variety-466003-c5"
export REGION="us-central1"
export RAW_BUCKET="tough-variety-raw-central1"
```

### 자동 검증 스크립트
```bash
#!/bin/bash
if [[ "$REGION" != "us-central1" ]]; then
    echo "❌ 오류: REGION이 us-central1이 아닙니다. 현재값: $REGION"
    exit 1
fi
echo "✅ 리전 검증 통과: $REGION"
```

## 수정된 파일 목록

### CLAUDE.md
- Regional Alignment Policy 추가
- 환경변수 설정 가이드 추가
- 배포 시 주의사항 명시

### 배포 스크립트
- `/services/vdp-extractor/deploy-cloud-run.sh`: us-central1로 기본값 변경
- `/services/t2-extract/deploy-cloud-run.sh`: us-central1 고정 설정

### 모든 스크립트 파일
- 모든 us-west1 참조를 us-central1로 일괄 변경
- 서비스 URL 업데이트: `*.us-central1.run.app`

### 설정 파일
- `download_full_vdp.js`: 호스트명 us-central1로 변경
- `services/unified-api/src/handlers/vdp-submit.js`: T2_EXTRACT_URL 업데이트

## 긴급 상황 대응

### us-west1으로 잘못 배포한 경우
1. 즉시 서비스 중단
2. us-central1로 재배포
3. DNS/로드밸런서 업데이트
4. Event 기반 파이프라인 재연결

### 리전 불일치 증상
- Event 기반 파이프라인 지연 (>500ms)
- Cloud Run과 GCS 간 높은 지연시간
- Vertex AI 호출 타임아웃

---

**마지막 업데이트**: 2025-08-17  
**검토자**: Claude Code AI Assistant  
**적용 범위**: 모든 VDP 관련 서비스