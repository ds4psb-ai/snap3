# 🔄 Cursor ↔ ClaudeCode Git 기반 강력한 협업 시스템

**GPT-5 Pro ↔ ClaudeCode ↔ Cursor 삼각편대를 위한 끈끈하고 강력한 소통 도구**

## 🎯 개요

이 시스템은 Cursor와 ClaudeCode가 Git을 통해 실시간으로 소통하고 협업할 수 있도록 설계된 완전한 솔루션입니다.

### 핵심 기능
- **실시간 동기화**: Git 기반 양방향 동기화
- **브리지 브랜치**: 안전한 협업을 위한 브리지 브랜치 시스템
- **실시간 알림**: 작업 시작/완료 알림 및 메시지 시스템
- **충돌 해결**: 자동 충돌 해결 도구
- **자동 동기화**: 파일 변경 감지 자동 동기화

---

## 🚀 빠른 시작

### 1. 초기 설정

```bash
# 권한 설정
chmod +x scripts/simple-sync.sh
chmod +x scripts/simple-notifier.sh

# 상태 확인
./scripts/simple-sync.sh status
```

### 2. 첫 번째 협업 시작

```bash
# 브리지 브랜치 생성
./scripts/simple-sync.sh create-bridge

# 작업 시작 알림
./scripts/simple-notifier.sh start "VDP Integration" "Cursor" "Starting frontend-backend integration"
```

---

## 📋 상세 사용법

### A. 동기화 시스템 (`simple-sync.sh`)

#### 1. 상태 확인
```bash
# 현재 동기화 상태 확인
./scripts/simple-sync.sh status
```

**출력 예시:**
```
[INFO] Checking sync status...

Git Status:
 M HEAD_SUMMARY.md
?? .github/ISSUE_TEMPLATE/
?? .github/workflows/create-pinned-context.yml

Current Branch: hotfix/vdp-platform-key-evidence

Recent Commits:
d3196a6 feat: implement GPT-5↔ClaudeCode↔Cursor triangular workflow system
ba45bb9 chore: add GPT-5↔ClaudeCode workflow tooling

Remote Status:
origin  https://github.com/ds4psb-ai/snap3.git (fetch)
origin  https://github.com/ds4psb-ai/snap3.git (push)

Changed Files (11):
 M HEAD_SUMMARY.md
?? .github/ISSUE_TEMPLATE/
?? .github/workflows/create-pinned-context.yml
```

#### 2. 양방향 동기화
```bash
# 양방향 동기화 실행
./scripts/simple-sync.sh sync
```

#### 3. 브리지 브랜치 시스템

**브리지 브랜치 생성:**
```bash
./scripts/simple-sync.sh create-bridge
```

**출력 예시:**
```
[INFO] Creating bridge branch: bridge/cursor-claudecode-20250820-163705
Switched to a new branch 'bridge/cursor-claudecode-20250820-163705'
[SUCCESS] Bridge branch created: bridge/cursor-claudecode-20250820-163705
Next steps:
  1. Cursor: Frontend work
  2. ClaudeCode: Backend work
  3. ./scripts/simple-sync.sh merge-bridge
```

**브리지 브랜치 병합:**
```bash
./scripts/simple-sync.sh merge-bridge
```

#### 4. 자동 동기화
```bash
# 자동 동기화 모드 시작 (파일 변경 감지)
./scripts/simple-sync.sh auto-sync
```

#### 5. 충돌 해결
```bash
# 충돌 확인
./scripts/simple-sync.sh conflict-resolve
```

### B. 협업 알림 시스템 (`simple-notifier.sh`)

#### 1. 메시지 전송
```bash
# 일반 메시지 전송
./scripts/simple-notifier.sh send "Cursor" "UI Update" "Instagram extractor UI completed" "high"

# 작업 시작 알림
./scripts/simple-notifier.sh start "API Integration" "ClaudeCode" "Starting backend API development"

# 작업 완료 알림
./scripts/simple-notifier.sh complete "Frontend Development" "Cursor" "All UI components completed and tested"
```

#### 2. 메시지 확인
```bash
# 새로운 메시지 확인
./scripts/simple-notifier.sh check

# 모든 메시지 목록
./scripts/simple-notifier.sh list
```

**출력 예시:**
```
[INFO] Checking collaboration messages...

New collaboration messages:
================================

File: ./.collab-msg-1755675395805
--------------------------------
# Collaboration Message

**ID**: 1755675395805
**Agent**: Cursor
**Action**: Git Collaboration System
**Priority**: high
**Timestamp**: 2025-08-20 07:36:35 UTC

## Details
Successfully implemented Git-based collaboration system for Cursor and ClaudeCode

## Next Steps
- [ ] ClaudeCode review
- [ ] Cursor review
- [ ] GPT-5 Pro review
- [ ] Task completed

## Status
- Status: Pending
- Created: 2025-08-20 07:36:35 UTC
- Agent: Cursor
--------------------------------

To respond:
  ./scripts/simple-notifier.sh respond <message-id> <response-text>
```

#### 3. 메시지 응답
```bash
# 메시지 응답
./scripts/simple-notifier.sh respond "1755675395805" "API integration completed successfully" "ClaudeCode"
```

#### 4. 메시지 정리
```bash
# 오래된 메시지 정리 (7일 이상)
./scripts/simple-notifier.sh clear
```

---

## 🔄 실제 협업 워크플로우

### 시나리오 1: Instagram/TikTok 추출기 VDP 통합

#### 1단계: 브리지 브랜치 생성
```bash
# Cursor에서
./scripts/simple-sync.sh create-bridge
./scripts/simple-notifier.sh start "VDP Integration" "Cursor" "Creating bridge branch for Instagram/TikTok extractor integration"
```

#### 2단계: 프론트엔드 작업 (Cursor)
```bash
# 작업 진행
npm run dev
# Instagram/TikTok 추출기 UI 개발

# 작업 완료 알림
./scripts/simple-notifier.sh complete "Frontend Development" "Cursor" "Instagram/TikTok extractor UI completed with VDP integration"
```

#### 3단계: 백엔드 작업 (ClaudeCode)
```bash
# ClaudeCode에서 메시지 확인
./scripts/simple-notifier.sh check

# 백엔드 API 개발
# VDP 인제스트 API 구현

# 작업 완료 알림
./scripts/simple-notifier.sh complete "Backend API" "ClaudeCode" "VDP ingest API completed and tested"
```

#### 4단계: 통합 및 병합
```bash
# 통합 테스트
npm test

# 브리지 브랜치 병합
./scripts/simple-sync.sh merge-bridge

# GPT-5 Pro에게 결과 보고
./scripts/simple-notifier.sh send "Cursor" "Integration Complete" "VDP integration completed successfully" "high"
```

### 시나리오 2: 실시간 협업

#### 자동 동기화 모드
```bash
# Cursor에서 자동 동기화 시작
./scripts/simple-sync.sh auto-sync

# 파일 변경 시 자동으로 커밋 및 푸시
# ClaudeCode에서 git pull로 즉시 변경사항 확인
```

#### 실시간 메시징
```bash
# Cursor에서 즉시 알림
./scripts/simple-notifier.sh send "Cursor" "Bug Found" "Instagram API returning 500 error" "high"

# ClaudeCode에서 즉시 확인 및 응답
./scripts/simple-notifier.sh respond "1755675395805" "Investigating Instagram API issue" "ClaudeCode"
```

---

## 🛠️ 고급 기능

### A. 브리지 브랜치 전략

브리지 브랜치는 Cursor와 ClaudeCode가 안전하게 협업할 수 있는 임시 작업 공간입니다.

**브리지 브랜치 구조:**
```
main
├── bridge/cursor-claudecode-20250820-163705 (브리지 브랜치)
│   ├── .bridge-info (브리지 정보)
│   ├── cursor-changes/ (Cursor 변경사항)
│   └── claudecode-changes/ (ClaudeCode 변경사항)
└── develop
```

**브리지 브랜치 생명주기:**
1. **생성**: `create-bridge` 명령으로 생성
2. **개발**: Cursor와 ClaudeCode가 병렬 작업
3. **통합**: 양쪽 작업 완료 후 통합 테스트
4. **병합**: `merge-bridge` 명령으로 main에 병합
5. **정리**: 브리지 브랜치 자동 삭제

### B. 충돌 해결 전략

**자동 충돌 해결 규칙:**
- **프론트엔드 파일** (`.tsx`, `.jsx`, `.css`, `.html`): Cursor 변경사항 우선
- **백엔드 파일** (`.ts`, `.js`, `.py`, `.go`): ClaudeCode 변경사항 우선
- **설정 파일** (`.json`, `.yaml`, `.md`): 수동 해결 필요

**충돌 해결 프로세스:**
1. 충돌 감지: `conflict-resolve` 명령
2. 자동 해결 시도: `--auto` 옵션
3. 수동 검토: 필요한 경우 수동 수정
4. 해결 완료: 커밋 및 푸시

### C. 메시지 우선순위 시스템

**우선순위 레벨:**
- **low**: 정보성 메시지
- **normal**: 일반 작업 알림
- **high**: 중요 작업 완료/이슈
- **urgent**: 긴급 이슈/버그

**우선순위별 처리:**
- **urgent**: 즉시 확인 및 응답 필요
- **high**: 1시간 내 응답 권장
- **normal**: 24시간 내 응답
- **low**: 참고용

---

## 📊 모니터링 및 관리

### A. 상태 모니터링

```bash
# 동기화 상태 확인
./scripts/simple-sync.sh status

# 메시지 상태 확인
./scripts/simple-notifier.sh list

# Git 로그 확인
git log --oneline -10
```

### B. 성능 최적화

**자동 동기화 최적화:**
- 파일 변경 감지 간격: 30초
- 배치 커밋: 여러 파일 변경 시 한 번에 커밋
- 메모리 사용량: 최소화된 로그 출력

**네트워크 최적화:**
- Git fetch 최적화: 필요한 경우만 fetch
- 압축 전송: Git 압축 사용
- 연결 재사용: Git 연결 풀링

### C. 백업 및 복구

**자동 백업:**
- 브리지 브랜치: 자동 백업 (7일 보관)
- 메시지 파일: Git 히스토리에 보관
- 설정 파일: 버전 관리

**복구 절차:**
1. 브리지 브랜치 복구: `git branch -r | grep bridge`
2. 메시지 복구: `.collab-msg-*` 파일 복원
3. 설정 복구: 스크립트 재설치

---

## 🚨 문제 해결

### A. 일반적인 문제

#### 1. 동기화 실패
```bash
# 원인: 네트워크 문제, 충돌, 권한 문제
# 해결:
git fetch origin
git status
./scripts/simple-sync.sh conflict-resolve
```

#### 2. 메시지 전송 실패
```bash
# 원인: Git 커밋 실패, 푸시 실패
# 해결:
git status
git add .
git commit -m "Manual fix"
git push origin $(git branch --show-current)
```

#### 3. 브리지 브랜치 문제
```bash
# 원인: 브리지 브랜치 손상, 병합 실패
# 해결:
git checkout main
git branch -D bridge/cursor-claudecode-*
./scripts/simple-sync.sh create-bridge
```

### B. 성능 문제

#### 1. 자동 동기화 느림
```bash
# 해결: 간격 조정
# scripts/simple-sync.sh의 sleep 30을 sleep 60으로 변경
```

#### 2. 메시지 파일 많음
```bash
# 해결: 정기적 정리
./scripts/simple-notifier.sh clear
```

### C. 보안 문제

#### 1. 권한 문제
```bash
# 해결: 권한 재설정
chmod +x scripts/simple-sync.sh
chmod +x scripts/simple-notifier.sh
```

#### 2. 민감 정보 노출
```bash
# 해결: .gitignore에 민감 파일 추가
echo ".collab-msg-*" >> .gitignore
```

---

## 📈 모범 사례

### A. 효율적인 협업

1. **명확한 작업 분담**
   - Cursor: 프론트엔드, UI/UX
   - ClaudeCode: 백엔드, API, 데이터 처리
   - GPT-5 Pro: 전략, 조율, 검토

2. **정기적인 동기화**
   - 매일 오전: 상태 확인
   - 작업 시작/완료: 즉시 알림
   - 주간: 브리지 브랜치 정리

3. **명확한 커뮤니케이션**
   - 구체적인 메시지 작성
   - 우선순위 적절히 설정
   - 즉시 응답 문화

### B. 품질 관리

1. **코드 리뷰**
   - 브리지 브랜치에서 상호 리뷰
   - GPT-5 Pro 최종 검토
   - 테스트 통과 후 병합

2. **문서화**
   - 변경사항 문서화
   - API 문서 업데이트
   - 사용법 가이드 작성

3. **테스트**
   - 단위 테스트
   - 통합 테스트
   - 사용자 테스트

---

## 🔗 통합 및 확장

### A. GitHub Actions 통합

```yaml
# .github/workflows/collaboration-sync.yml
name: Collaboration Sync
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  sync-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check collaboration status
        run: |
          ./scripts/simple-sync.sh status
          ./scripts/simple-notifier.sh check
```

### B. Slack/Discord 통합

```bash
# 웹훅을 통한 알림 전송
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"text": "🤝 New collaboration message from Cursor"}'
```

### C. 모니터링 대시보드

```bash
# 상태 대시보드 생성
./scripts/simple-sync.sh status > dashboard.md
./scripts/simple-notifier.sh list >> dashboard.md
```

---

## 📚 참고 자료

### A. 관련 문서
- [GPT-5 Pro ↔ ClaudeCode ↔ Cursor 삼각편대 워크플로우](./GPT5_CLAUDECODE_CURSOR_TRIANGULAR_WORKFLOW.md)
- [Cursor 삼각편대 통합 가이드](./CURSOR_TRIANGULAR_INTEGRATION.md)
- [Git 협업 모범 사례](https://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project)

### B. 유용한 명령어
```bash
# Git 상태 확인
git status
git log --oneline -10
git branch -a

# 협업 상태 확인
./scripts/simple-sync.sh status
./scripts/simple-notifier.sh list

# 도움말
./scripts/simple-sync.sh help
./scripts/simple-notifier.sh --help
```

---

## 🎉 결론

이 Git 기반 협업 시스템을 통해 Cursor와 ClaudeCode는:

1. **실시간으로 소통**할 수 있습니다
2. **안전하게 협업**할 수 있습니다
3. **효율적으로 작업**할 수 있습니다
4. **품질을 보장**할 수 있습니다

**🎯 이제 GPT-5 Pro가 링크 하나로 ClaudeCode와 Cursor를 완벽하게 조율할 수 있는 강력한 협업 시스템이 완성되었습니다!**

---

## ✅ 실제 테스트 결과

### 테스트 완료 사항:
1. ✅ **동기화 시스템**: `simple-sync.sh` 정상 작동
2. ✅ **협업 알림**: `simple-notifier.sh` 정상 작동
3. ✅ **메시지 전송**: Cursor → ClaudeCode 메시지 전송 성공
4. ✅ **메시지 응답**: ClaudeCode → Cursor 응답 성공
5. ✅ **브리지 브랜치**: 브리지 브랜치 생성 성공
6. ✅ **Git 통합**: 모든 변경사항이 Git을 통해 자동 동기화

### 실제 사용 예시:
```bash
# 메시지 전송 (성공)
./scripts/simple-notifier.sh send "Cursor" "Git Collaboration System" "Successfully implemented Git-based collaboration system" "high"

# 메시지 확인 (성공)
./scripts/simple-notifier.sh check

# 응답 전송 (성공)
./scripts/simple-notifier.sh respond "1755675395805" "Received collaboration system. Ready to test bridge branch functionality." "ClaudeCode"

# 브리지 브랜치 생성 (성공)
./scripts/simple-sync.sh create-bridge
```

---

**📝 마지막 업데이트**: 2025-08-20
**🔄 버전**: 1.0.0 (테스트 완료)
**👥 작성자**: Cursor ↔ ClaudeCode 협업 시스템
