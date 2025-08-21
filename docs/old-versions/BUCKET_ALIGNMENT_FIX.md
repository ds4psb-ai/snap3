# 버킷 미스매치 근본 해결 방안

## 🚨 문제점
- **T1 서버**: `tough-variety-raw-central1` 버킷에 저장
- **T2 워커**: `tough-variety-raw` 버킷 모니터링
- **결과**: 인제스트 요청이 워커에게 전달되지 않음

## 🛠️ 해결 옵션

### Option 1: T1 서버 버킷 변경 (권장)
T1 서버가 워커와 같은 버킷 사용:
```bash
# T1 서버 환경변수 변경
export RAW_BUCKET="tough-variety-raw"
# 서버 재시작 필요
```

### Option 2: T2 워커 버킷 변경
T2 워커가 T1과 같은 버킷 모니터링:
```bash
# T2 워커 환경변수 변경 (워커 터미널에서)
export RAW_BUCKET="tough-variety-raw-central1"
```

### Option 3: 임시 자동 복사 스크립트
```bash
# 주기적으로 파일 복사하는 스크립트
while true; do
  gsutil -m cp "gs://tough-variety-raw-central1/ingest/requests/*/*.json" "gs://tough-variety-raw/ingest/requests/" 2>/dev/null
  sleep 30
done
```

## 💡 권장사항
**Option 1 (T1 서버 변경)**을 권장:
- Regional Alignment는 유지 (둘 다 us-central1)
- T2 워커 설정 변경 불필요
- 단일 버킷으로 관리 단순화

## 📝 구현 단계
1. T1 서버 환경변수 변경: `RAW_BUCKET="tough-variety-raw"`
2. T1 서버 재시작
3. 테스트 인제스트 요청으로 검증