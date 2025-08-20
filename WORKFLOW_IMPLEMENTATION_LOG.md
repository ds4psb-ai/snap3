# GPT-5↔ClaudeCode 워크플로 구현 로그

## 📅 구현 일시
**일자**: 2025-08-20  
**작업자**: ClaudeCode  
**목적**: GPT-5와 ClaudeCode 간 맥락 손실 없는 효율적 협업 체계 구축

---

## 🎯 구현 완료 사항

### 1. 핵심 스크립트 구현
- **파일**: `scripts/generate_summary.sh`
- **기능**: 최근 5커밋 요약 + 변경 통계 생성
- **출력 형태**: 
  ```
  === 최근 5커밋 요약 ===
  ba45bb9: chore: add GPT-5↔ClaudeCode workflow tooling (190 files, +27317/-1327)
  920cab9: 🧬 Evidence 실제 데이터 생성 구현 (8 files, +1091/-7)
  ```

### 2. GitHub Actions 자동화
- **파일**: `.github/workflows/summarize-commits.yml`
- **기능**: PR/Push 시 자동 요약 코멘트 생성
- **트리거**: main 브랜치 push, PR 생성
- **결과**: GitHub에서 자동으로 변경사항 요약 제공

### 3. 운영 문서화
- **파일**: `docs/operational-head-loop.md`
- **내용**: ClaudeCode 중심 워크플로 가이드
- **포함사항**: 터미널별 역할, 사용법, 실제 작업 흐름

### 4. 프롬프트 템플릿
- **파일**: `docs/CONTEXT_PROMPT.md`
- **용도**: GPT-5 요약 요청용 표준 프롬프트

---

## 🏗️ 터미널 구조 최적화

### 실제 사용 환경에 맞춘 재설계
**기존 가정**: Cursor 포함 삼각 체계  
**실제 환경**: 4개 터미널 구조
- **Terminal 1 – Main T1**: ~/snap3 (UI/프록시)
- **Terminal 2 – Jobs T2**: ~/snap3-jobs (Ingest Worker)  
- **Terminal 3 – Main2 T3**: ~/snap3/services/t2extract (T2‑VDP Extractor)
- **Terminal 4 – Storage T4**: ~/snap3-storage (Cloud Run Loader)

### 각 터미널별 역할 정의
- **Main T1**: GPT-5 소통 + 전체 상황 파악
- **Jobs T2**: 워커 모니터링 + 요청 처리 확인  
- **T2VDP T3**: VDP 추출 서비스 점검
- **Storage T4**: 데이터 저장 + BigQuery 확인

---

## 🔄 워크플로 실행 패턴

### A. 상황 파악 루틴
```bash
# Main T1에서 실행
scripts/generate_summary.sh | tee /tmp/ctx.txt
```
→ 결과를 GPT-5 채팅창에 복사 붙여넣기

### B. 작업 진행 루틴
1. GPT-5에서 계획 수립
2. ClaudeCode에게 작업 지시
3. 각 터미널에서 모니터링
4. 작업 완료 후 커밋
5. 업데이트된 요약을 GPT-5에 전달

### C. 문제 해결 루틴
- 각 터미널별 로그 확인
- 서비스 상태 점검
- 전체 상황을 GPT-5에 보고

---

## 📊 구현 성과

### 1. 맥락 손실 방지
- **압축 요약**: 긴 대화 대신 5커밋 요약으로 핵심 정보 전달
- **실시간 업데이트**: 작업 완료 즉시 상황 갱신
- **코드 링크**: 긴 코드 블록 대신 GitHub 라인 링크 활용

### 2. 작업 효율성
- **자동화**: GitHub Actions로 PR/커밋 요약 자동 생성
- **표준화**: 터미널별 역할과 명령어 표준화
- **문서화**: 비개발자도 이해할 수 있는 사용법 가이드

### 3. 품질 향상
- **일관성**: 표준화된 요약 형식
- **추적성**: Git 커밋 기반 변경 이력 추적
- **투명성**: 모든 변경사항의 명확한 기록

---

## 🎮 실제 사용 예시

### 시나리오: "인스타그램 자동 추출 기능 추가"

**1. Main T1에서 상황 파악**
```bash
scripts/generate_summary.sh | tee /tmp/ctx.txt
```

**2. GPT-5에 상황 전달**
```
현재 상황:
=== 최근 5커밋 요약 ===
ba45bb9: chore: add GPT-5↔ClaudeCode workflow tooling (190 files, +27317/-1327)
920cab9: 🧬 Evidence 실제 데이터 생성 구현 (8 files, +1091/-7)

인스타그램 URL 입력시 자동으로 메타데이터를 추출해서 폼을 채우는 기능을 추가하고 싶어
```

**3. GPT-5에서 계획 수립 후 ClaudeCode에 지시**

**4. 작업 완료 후 커밋 & 업데이트**
```bash
git add -A && git commit -m "Instagram 자동 추출 기능 추가"
scripts/generate_summary.sh | tee /tmp/ctx.txt
```

---

## 🔧 기술적 구현 세부사항

### generate_summary.sh 스크립트
- **기능**: Git 로그 파싱 + 변경 통계 계산
- **출력**: 커밋 해시, 메시지, 파일 수, 증감 라인
- **처리**: awk, sed, grep을 활용한 텍스트 파싱

### GitHub Actions 워크플로
- **트리거**: push/pull_request 이벤트
- **단계**: 요약 생성 → PR 코멘트 or 커밋 코멘트 작성
- **API**: peter-evans/create-or-update-comment 액션 활용

### 문서 구조
- **운영 가이드**: 실무진을 위한 단계별 사용법
- **터미널 매핑**: 각 터미널의 명확한 역할 정의
- **명령어 레퍼런스**: 자주 사용하는 명령어 모음

---

## 📈 예상 효과

### 개발 효율성
- **소통 시간 단축**: 긴 설명 대신 압축 요약
- **맥락 유지**: 항상 최신 상태 기반 작업
- **실수 방지**: 표준화된 프로세스

### 품질 향상
- **일관성**: 동일한 형식의 요약과 문서
- **추적성**: 모든 변경사항의 명확한 기록
- **투명성**: 작업 과정의 완전한 가시성

### 확장성
- **재사용**: 다른 프로젝트에도 적용 가능
- **개선**: 사용 패턴에 따른 지속적 개선
- **자동화**: 추가 자동화 기능 확장 가능

---

## 🔮 향후 개선 계획

### 1. 스크립트 고도화
- 더 상세한 변경 통계
- 파일별 변경 요약
- 자동 태그 생성

### 2. 자동화 확장
- Slack/Discord 알림 연동
- 자동 배포 트리거
- 성능 메트릭 수집

### 3. 문서 개선
- 동영상 가이드 제작
- FAQ 섹션 추가
- 트러블슈팅 가이드

---

**구현 완료일**: 2025-08-20  
**상태**: Production Ready  
**테스트 결과**: ✅ 성공적으로 작동 확인