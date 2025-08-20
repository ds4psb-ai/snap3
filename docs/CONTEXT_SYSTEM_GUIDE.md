# 🎯 GPT-5 Pro 컨텍스트 시스템 가이드

## 📋 개요

새로운 GPT-5 Pro 채팅 세션에서 **링크 하나로 전체 프로젝트 컨텍스트를 즉시 확보**할 수 있는 자동화 시스템입니다.

### 🎯 목표
- **맥락 손실 방지**: 이전 대화 히스토리 없이도 현재 상태 파악
- **빠른 온보딩**: 새 채팅에서 10초 내 작업 시작 가능
- **일관된 협업**: 표준화된 컨텍스트로 GPT-5↔ClaudeCode↔Cursor 협업

---

## 🚀 사용법

### 1. 자동 생성된 컨텍스트 활용

#### A. GitHub PR/커밋 댓글 활용
```bash
# 1. 작업 완료 후 커밋/PR 생성
git add -A && git commit -m "feat: add new feature"
git push origin feature-branch

# 2. GitHub에서 자동 생성된 컨텍스트 댓글 확인
# 3. 전체 댓글 내용을 새 GPT-5 채팅에 복사
```

#### B. GitHub Discussions 활용
```bash
# 1. 메인 브랜치에 푸시되면 자동으로 Discussion 생성
# 2. https://github.com/your-repo/discussions 에서 최신 컨텍스트 확인
# 3. Discussion 전체 내용을 새 GPT-5 채팅에 복사
```

### 2. 수동 컨텍스트 생성

#### A. 기본 컨텍스트 생성
```bash
# Main T1에서 실행
cd ~/snap3
scripts/generate_context_for_gpt5.sh
```

#### B. 상세 컨텍스트 생성
```bash
# 파일 목록 + diff 포함
scripts/generate_context_for_gpt5.sh --include-files --include-diff

# 파일로 저장
scripts/generate_context_for_gpt5.sh --include-files --output /tmp/gpt5_context.md
```

#### C. 기존 요약 스크립트 활용
```bash
# 간단한 5커밋 요약
scripts/generate_summary.sh | tee /tmp/ctx.txt
```

---

## 🔄 워크플로우 패턴

### 패턴 1: GitHub 기반 (추천)
```
1. 작업 완료 → 커밋/PR 생성
2. GitHub Actions가 자동으로 컨텍스트 댓글 생성
3. 댓글 링크를 새 GPT-5 채팅에 공유
4. GPT-5가 전체 컨텍스트 확보 → 작업 지시
```

### 패턴 2: 로컬 스크립트 기반
```
1. scripts/generate_context_for_gpt5.sh 실행
2. 출력 전체를 새 GPT-5 채팅에 복사
3. "Use this context for ClaudeCode collaboration" 추가
4. GPT-5가 컨텍스트 분석 → 작업 지시
```

### 패턴 3: 하이브리드 (최적)
```
1. 로컬에서 scripts/generate_context_for_gpt5.sh --output context.md
2. GitHub에서 최신 PR/Discussion 링크 확인
3. 둘 다 GPT-5에 제공하여 최대 컨텍스트 확보
```

---

## 📊 컨텍스트 포함 내용

### 🔄 자동 수집 정보
- **최근 5커밋 요약**: 변경사항과 통계
- **현재 브랜치 상태**: 수정된 파일, staged 변경사항
- **환경 상태**: 핵심 환경변수, 로그 상태
- **터미널 힌트**: 4터미널 구조별 체크 명령어

### 📋 수동 추가 가능 정보
- **변경된 파일 목록**: `--include-files` 옵션
- **Diff 미리보기**: `--include-diff` 옵션
- **프로젝트 메타정보**: 아키텍처, 핵심 설정
- **Quick Start 가이드**: GPT-5 사용법

### 🔗 링크 정보
- **GitHub 레포지토리**: 메인 페이지, 커밋, PR 링크
- **워크플로우 가이드**: 삼각편대 협업 문서
- **액션 로그**: CI/CD 실행 상태

---

## 🛠️ 고급 활용

### 1. 워크플로우 커스터마이징

#### GitHub Actions 트리거 수정
```yaml
# .github/workflows/summarize-commits.yml
on:
  push:
    branches: [ main, develop ]  # 브랜치 추가
    paths-ignore:
      - '*.md'  # 문서 변경 시 스킵
  workflow_dispatch:  # 수동 실행 가능
```

#### 컨텍스트 스크립트 확장
```bash
# scripts/generate_context_for_gpt5.sh 수정
# 프로젝트별 특수 정보 추가 가능
```

### 2. 다중 프로젝트 지원

#### 프로젝트별 스크립트
```bash
# 각 프로젝트에 복사하여 사용
cp scripts/generate_context_for_gpt5.sh ../other-project/scripts/
```

#### 공통 설정 파일
```bash
# .context_config 파일로 프로젝트별 설정 관리
echo "PROJECT_TYPE=VDP_Pipeline" > .context_config
echo "KEY_SERVICES=ingest,extract,storage" >> .context_config
```

### 3. 통합 개발 환경

#### VSCode 통합
```json
// .vscode/tasks.json
{
  "label": "Generate GPT-5 Context",
  "type": "shell",
  "command": "./scripts/generate_context_for_gpt5.sh",
  "args": ["--include-files", "--output", "/tmp/gpt5_context.md"]
}
```

#### Alias 설정
```bash
# ~/.bashrc or ~/.zshrc
alias gpt5ctx='scripts/generate_context_for_gpt5.sh --include-files'
alias gpt5full='scripts/generate_context_for_gpt5.sh --include-files --include-diff'
```

---

## 🔧 문제 해결

### 문제 1: GitHub Actions 권한 오류
```bash
# 해결: Repository Settings → Actions → General
# Workflow permissions → Read and write permissions 활성화
```

### 문제 2: 스크립트 실행 권한 오류
```bash
chmod +x scripts/generate_context_for_gpt5.sh
```

### 문제 3: Discussion 생성 실패
```bash
# 해결: Repository Settings → Features → Discussions 활성화
# 또는 Issue로 자동 대체됨
```

### 문제 4: 컨텍스트가 너무 길어짐
```bash
# 해결: 옵션 조정
scripts/generate_context_for_gpt5.sh  # 기본 (최소한)
# --include-files, --include-diff 제거
```

---

## 📈 성능 최적화

### 1. 스크립트 최적화
- **병렬 처리**: Git 명령어 병렬 실행
- **캐싱**: 자주 사용하는 정보 캐시
- **선택적 로딩**: 필요한 정보만 포함

### 2. GitHub Actions 최적화
- **조건부 실행**: 중요한 변경사항만 트리거
- **Artifact 활용**: 대용량 컨텍스트 파일 저장
- **병렬 Job**: 여러 포맷 동시 생성

### 3. 사용 패턴 최적화
- **템플릿 활용**: 자주 사용하는 컨텍스트 템플릿화
- **점진적 업데이트**: 변경사항만 추가
- **우선순위**: 핵심 정보 먼저 로드

---

## 📚 참고 자료

### 관련 문서
- [삼각편대 워크플로우 가이드](GPT5_CLAUDECODE_CURSOR_TRIANGULAR_WORKFLOW.md)
- [워크플로우 구현 로그](../WORKFLOW_IMPLEMENTATION_LOG.md)
- [Instagram 추출기 구현 로그](../INSTAGRAM_EXTRACTOR_COMPLETE_LOG.md)

### GitHub Actions
- [peter-evans/create-or-update-comment](https://github.com/peter-evans/create-or-update-comment)
- [actions/upload-artifact](https://github.com/actions/upload-artifact)
- [GitHub Discussions API](https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions)

### Git 참고
- [Git Log Format](https://git-scm.com/docs/git-log#_pretty_formats)
- [Git Diff Options](https://git-scm.com/docs/git-diff)
- [Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)

---

**문서 버전**: v1.0.0  
**최종 업데이트**: 2025-08-20  
**상태**: Production Ready