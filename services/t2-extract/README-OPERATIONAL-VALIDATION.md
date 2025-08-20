# 운영 점검 시스템 - t2-extract 서비스

**목적**: 플랫폼 3종 (YouTube/Instagram/TikTok) 대량 적재 전 "한 번에" 전체 시스템 검증

## 🚀 빠른 시작

### 통합 검증 실행 (권장)
```bash
cd ~/snap3/services/t2-extract
./run-all-checks.sh
```

### 개별 검증 실행
```bash
# 1. 운영 환경 검증
./operational-check.sh

# 2. 플랫폼별 API 검증
./test-platform-validation.sh
```

## 📋 검증 항목

### Phase 1: 운영 환경 검증 (operational-check.sh)
1. **Cloud Run 서비스 상태** - 서비스 배포 및 리비전 확인
2. **환경 변수** - 필수 환경 변수 설정 확인
3. **ID 토큰 생성** - 인증 시스템 동작 확인
4. **서비스 헬스체크** - API 엔드포인트 응답 확인
5. **GCS 버킷 접근** - RAW/GOLD 버킷 권한 확인
6. **BigQuery 연결** - 테이블 접근 및 데이터 확인
7. **최근 VDP 데이터** - 당일 처리된 데이터 확인
8. **Hook Genome 통합** - Hook 분석 기능 확인
9. **Evidence Pack 통합** - 증거 패키지 생성 확인

### Phase 2: 플랫폼별 검증 (test-platform-validation.sh)
1. **YouTube API 검증** - YouTube 플랫폼 VDP 생성 테스트
2. **Instagram API 검증** - Instagram 플랫폼 VDP 생성 테스트
3. **TikTok API 검증** - TikTok 플랫폼 VDP 생성 테스트

## 🎯 결과 해석

### 점수 체계
- **10/10 (운영 검증)**: 완벽한 운영 준비 상태
- **8-9/10**: 운영 가능 (경미한 이슈)
- **6-7/10**: 주의 필요 (일부 기능 문제)
- **5 이하**: 운영 불가 (긴급 조치 필요)

### 플랫폼 검증
- **3/3 플랫폼**: 모든 플랫폼 처리 가능
- **2/3 플랫폼**: 일부 플랫폼 이슈 존재
- **1/3 이하**: 플랫폼 통합 실패

## ✅ 성공 시나리오

```bash
🎯 Overall Score: 10/10 (100.0%)
✅ SYSTEM READY FOR PRODUCTION LOAD
   ✓ Ready for multi-platform batch processing
   ✓ All critical systems operational

📱 Testing YouTube Platform...
  ✅ YouTube Test PASSED
📱 Testing Instagram Platform...
  ✅ Instagram Test PASSED
📱 Testing TikTok Platform...
  ✅ TikTok Test PASSED

🎉 ALL PLATFORMS VALIDATED
✅ Ready for multi-platform production processing
```

## ⚠️ 문제 발생 시 대응

### 일반적인 문제들

#### 1. 인증 실패
```bash
# 증상: ID token generation failed
# 해결:
gcloud auth login
gcloud auth application-default login
```

#### 2. 서비스 접근 실패
```bash
# 증상: Service not found or inaccessible
# 확인:
gcloud run services list --region=us-central1
gcloud config get-value project
```

#### 3. 환경 변수 누락
```bash
# 해결: 필수 환경 변수 설정
gcloud run services update t2-vdp \
  --region=us-central1 \
  --set-env-vars=PLATFORM_SEGMENTED_PATH=true \
  --set-env-vars=RAW_BUCKET=tough-variety-raw-central1 \
  --set-env-vars=EVIDENCE_MODE=true
```

#### 4. 버킷 접근 권한 문제
```bash
# 확인: 서비스 계정 권한
gcloud projects get-iam-policy tough-variety-466003-c5
gsutil iam get gs://tough-variety-raw-central1
```

### 로그 확인 명령어
```bash
# Cloud Run 서비스 로그
gcloud run services logs read t2-vdp --region=us-central1 --limit=50

# 최근 배포 확인
gcloud run revisions list --service=t2-vdp --region=us-central1 --limit=5

# 서비스 상태 상세 정보
gcloud run services describe t2-vdp --region=us-central1
```

## 📊 성능 기준

### API 응답 시간
- **Health Check**: < 500ms
- **VDP Generation**: < 30s (timeout)
- **Platform Validation**: < 10s per platform

### 데이터 품질 기준
- **VDP 필수 필드**: 100% 완성도
- **Hook Genome**: 최소 70% 포함
- **Evidence Pack**: 최소 70% 포함

## 🔄 정기 점검 일정

### 일일 점검 (간단)
```bash
# 빠른 헬스체크만
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://t2-vdp-355516763169.us-central1.run.app/health
```

### 주간 점검 (전체)
```bash
# 전체 검증 실행
./run-all-checks.sh
```

### 대량 처리 전 점검 (필수)
```bash
# 반드시 전체 검증 + 추가 확인
./run-all-checks.sh
# 추가로 BigQuery 데이터 확인
bq query --use_legacy_sql=false "SELECT COUNT(*) FROM \`tough-variety-466003-c5.vdp_dataset.vdp_gold\` WHERE load_date = CURRENT_DATE()"
```

## 📝 체크리스트 템플릿

### 배포 전 체크리스트
- [ ] `./run-all-checks.sh` 실행 완료
- [ ] 운영 점검 8/10 이상 통과
- [ ] 플랫폼 검증 3/3 통과
- [ ] 환경 변수 최신 상태 확인
- [ ] 백업 및 롤백 계획 준비
- [ ] 모니터링 알림 설정 확인

### 대량 처리 전 체크리스트
- [ ] 모든 검증 통과 확인
- [ ] BigQuery 테이블 용량 확인
- [ ] GCS 버킷 용량 확인
- [ ] 처리 창구 시간대 확인
- [ ] 장애 대응팀 대기 상태 확인

## 🏗️ 파일 구조

```
/Users/ted/snap3/services/t2-extract/
├── OPERATIONAL_CHECKLIST.md          # 상세 운영 가이드
├── operational-check.sh               # 운영 환경 검증 스크립트
├── test-platform-validation.sh       # 플랫폼별 API 검증 스크립트
├── run-all-checks.sh                 # 통합 실행 스크립트
├── README-OPERATIONAL-VALIDATION.md  # 이 문서
└── logs/                             # 검증 로그 디렉토리
    └── validation-YYYYMMDD-HHMMSS.log
```

## 📞 지원 및 문의

### 긴급 상황 (운영 중단 위험)
1. 즉시 `./run-all-checks.sh` 실행하여 상태 확인
2. 로그 파일 확보: `logs/validation-*.log`
3. Cloud Run 서비스 로그 확인
4. 필요시 이전 리비전으로 롤백

### 일반 문의
- 검증 스크립트 개선 사항
- 새로운 플랫폼 추가
- 모니터링 확장

---

**Last Updated**: 2025-08-19  
**Version**: 1.4.0  
**Compatible with**: t2-extract v1.4.0, VDP Pipeline v1.4.0