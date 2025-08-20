# GPT-5 Pro ↔ ClaudeCode ↔ Cursor 삼각편대 워크플로

**삼각편대 개발 체계 표준 운영 절차서**

---

## 📋 개요

**GPT‑5 Pro ↔ ClaudeCode ↔ Cursor** 삼각편대로 효율적 개발을 위한 표준 절차와 복붙용 프롬프트 모음집입니다.

### 역할 분담
- **GPT-5 Pro**: HEAD 코치 (전략 수립, 의사결정, 작업 지시)
- **ClaudeCode**: 메인 구현 에이전트 (코드 변경, 핵심 기능 구현)  
- **Cursor**: 보조 구현 에이전트 (리팩터링, 스크립트 강화, 작은 단위 작업)

---

## 0️⃣ 사전 공지

이전 대화에서 올렸던 일부 첨부 파일은 세션이 바뀌면 만료될 수 있습니다. **새 채팅에서 해당 파일을 직접 읽어야 한다면 다시 업로드**해주세요.

---

## 1️⃣ 새 GPT‑5 Pro 채팅 시작 – 3단계 부팅 절차

### 1‑A. 프로젝트 스냅샷 생성

**Main T1** (~/snap3):

```bash
# 1) 최근 변경 요약 생성 → 화면과 파일에 동시 저장
Main T1$ scripts/generate_summary.sh | tee /tmp/ctx.txt

# 2) (선택) HEAD_SUMMARY.md로 아카이빙
Main T1$ scripts/generate_summary.sh > HEAD_SUMMARY.md
```

> `generate_summary.sh`는 내부적으로 `git log --pretty=format:`과 `git diff --stat`를 이용해 최근 변경을 요약해 뽑아올 수 있습니다. 해당 포맷과 옵션은 Git 공식 문서 기반입니다.

### 1‑B. GPT‑5 Pro 새 채팅에 **부팅 프롬프트** 붙여넣기

아래 블록을 **그대로 복붙**하고, `<...>` 자리에 실제 값을 넣어주세요.

```text
=== CONTEXT/HEAD SNAPSHOT (paste from scripts/generate_summary.sh) ===
[여기에 /tmp/ctx.txt 또는 HEAD_SUMMARY.md 내용 전체 복사]
======================================================================

[ROLE]
- 너는 HEAD 코치(GPT‑5 Pro). ClaudeCode(main)과 Cursor(sub)를 지휘한다.
- 결정을 로그로 남기고, 각 하위 에이전트에게 줄 "복붙용 명령어"를 생성한다.

[BOUNDARIES]
- 버킷/리전 등 인프라 정책은 이미 프로젝트 규칙으로 고정됨(별도 변경 지시 없으면 참조만).
- 대화 길어지면 "요약 헤더(최근 커밋 5개 + 결정 사항)"만 갱신해서 사용.

[WHAT I NEED NOW]
1) 지금 HEAD 스냅샷을 읽고, **오늘 목표**/리스크/즉시 실행 태스크를 3~5개로 쪼갠 **실행계획**.
2) ClaudeCode와 Cursor에 줄 **복붙용 명령어**(파일 경로/라인/수용 기준 포함).
3) 완료 체크리스트 + 롤백/우회(Plan B).

[TERMINALS]
- Main T1: ~/snap3 (UI/프록시)
- Jobs T2: ~/snap3-jobs (Ingest Worker)
- Main2 T3: ~/snap3/services/t2extract (VDP Extractor)
- Storage T4: ~/snap3-storage (Cloud Run Loader / BQ)

[OUTPUT FORMAT]
- PLAN
- COMMANDS→ClaudeCode
- COMMANDS→Cursor
- RUNLIST (터미널별 순서)
- RISKS & GUARDS
- DECISIONS-LOG (한 줄 요약)
```

### 1‑C. (선택) GitHub PR에 자동 요약 달기

**GitHub Actions**로 "푸시/PR 시점 요약" 코멘트를 자동 생성하면, 새 채팅에서도 링크 하나로 컨텍스트를 확보할 수 있습니다.

* 워크플로우 트리거/표현식 문법: GitHub 공식문서 참조. ([GitHub Docs](https://docs.github.com/actions/learn-github-actions/events-that-trigger-workflows))
* 코멘트 작성 액션: `peter-evans/create-or-update-comment`의 README 예제를 따릅니다.

`.github/workflows/summarize-commits.yml` (요지)

```yaml
name: Summarize Commits
on:
  push:
    branches: [main]
  pull_request:

jobs:
  diff-summary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate commit diff summary
        id: summary
        run: |
          echo "### 변경점 요약 for $GITHUB_SHA" > summary.md
          git log -n 1 --pretty=format:"- 커밋: %h %s" >> summary.md
          echo "" >> summary.md
          git diff ${{ github.sha }}^ ${{ github.sha }} --stat >> summary.md
          echo "" >> summary.md
          git diff ${{ github.sha }}^ ${{ github.sha }} --patch-with-stat | head -n 30 >> summary.md
      - name: Create or update PR comment
        uses: peter-evans/create-or-update-comment@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          issue-number: ${{ github.event.pull_request.number }}
          body: ${{ steps.summary.outputs.comment || format('{0}', hashFiles('summary.md')) }}
```

> 트리거/표현식은 GitHub Actions 가이드에 맞춰 작성합니다. 필요하면 `workflow_dispatch`도 추가하세요.

---

## 2️⃣ **ClaudeCode**에 줄 스타터 프롬프트(복붙용)

```text
[ROLE]
너는 main 레포의 구현 에이전트(ClaudeCode). 
HEAD 코치(GPT‑5)가 제공한 스냅샷과 지시를 반영해 **코드 변경**을 수행한다.

[HOW TO WORK]
- 커밋 메시지는 Conventional Commits 규칙 준수: feat|fix|chore|refactor|docs 등 (스코프 포함, 본문에 BREAKING/Refs 등 트레일러) 
- 변경 후 scripts/generate_summary.sh를 재실행해 HEAD 요약 업데이트

[INPUTS]
- 최근 5커밋 요약/지시사항: (GPT‑5 메시지 붙여넣기)
- 참고 라인 링크: (예: src/foo.ts#L45-L90)

[ACCEPTANCE CRITERIA]
- 모든 터미널 지시 명령이 그대로 동작
- 스키마/경로/버킷 규칙 불변
- 실패 시 명확한 오류 메시지와 조기 실패(페일‑패스트)

[TASK#1 예시]
- 파일: src/app/api/ingest/route.ts
- 목표: instagram/tiktok/youtube 인풋 정규화(소문자 platform, 필수 필드 검증), use_vertex=true 강제, payload에 content_key/correlation_id/load_timestamp 포함
- 수용 기준: e2e 테스트 통과 + scripts/ops-health-check.sh 녹색

[DELIVERABLE]
- 변경 파일 목록
- 커밋 메시지(Conventional Commits)
- 테스트/검증 로그 요약
```

> 커밋 포맷은 **Conventional Commits 1.0.0** 스펙을 그대로 따릅니다. 명확한 히스토리와 자동 릴리스/체인지로그에 유리합니다.

---

## 3️⃣ **Cursor**에 줄 스타터 프롬프트(복붙용)

```text
[ROLE]
너는 보조 구현 에이전트(Cursor). 
ClaudeCode가 맡은 메인 변경과 충돌하지 않도록 **작은 단위 리팩터링/스크립트 강화**만 수행한다.

[WHAT TO DO NOW]
- scripts/generate_summary.sh v2로 개선:
  - 각 커밋 해시에 대해: `git log -1 --pretty=format:"%h %s"` 사용
  - 변경량: `git diff <commit>^ <commit> --stat`의 마지막 라인만 파싱
  - 출력 템플릿:
    `<hash>: <subject> (<N> files, +<adds>/-<dels>)`
- post-commit 훅 추가(.git/hooks/post-commit): 커밋 후 자동으로 HEAD_SUMMARY.md 갱신

[ACCEPTANCE]
- bash 스크립트 POSIX 호환
- macOS/리눅스에서 동일 동작
- 에러 시 set -euo pipefail로 조기 실패
```

> `git log`의 `--pretty=format:` 자리표시자와 훅 사용법은 Git 공식 문서가 기준입니다. `post-commit` 훅은 레포 로컬 `.git/hooks/post-commit`에 배치합니다.

**예시: generate_summary.sh v2 요지**

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "=== 최근 5커밋 요약 ==="
for c in $(git log -n 5 --pretty=format:%h); do
  subj=$(git log -1 --pretty=format:%s "$c")
  stats=$(git diff "$c^" "$c" --stat | tail -1)   # N files changed, +X/-Y
  echo "$c: $subj ($stats)"
done
echo "======================="
```

* `--pretty=format`/`%h %s`는 공식 포맷 문서에 정의됨.
* `--stat`는 diff 계열 명령의 변경 요약(파일 수/추가/삭제)을 제공.

---

## 4️⃣ **운영 RUNLIST – 터미널별 병렬/순차 실행**

### (A) 준비(순차)

**Main T1**

```bash
Main T1$ scripts/generate_summary.sh | tee /tmp/ctx.txt
# 새 GPT‑5 채팅에 부팅 프롬프트 + /tmp/ctx.txt 내용 붙여넣기
```

**Jobs T2**

```bash
Jobs T2$ ./worker-ingest-v2.sh --health   # 헬스만
Jobs T2$ ./worker-ingest-v2.sh            # 실제 처리
```

**Main2 T3**

```bash
Main2 T3$ ./operational-check.sh
Main2 T3$ npm start   # 로컬 VDP extractor 필요 시
```

**Storage T4**

```bash
Storage T4$ ./scripts/quick-validation.sh
Storage T4$ ./vdp-enrich-complete.sh --hours 6 --dry-run
```

### (B) 개발/검증(병렬)

* **ClaudeCode**: API/스키마/페이로드 변경
* **Cursor**: 툴링/스크립트/훅 보강
* **Main T1**: UI/프록시 점검, 필요 시 간단 서버 기동
* **Jobs T2**: 큐/로그 모니터링(`tail -f worker.log`)
* **Storage T4**: BQ 적재 스팟 체크

### (C) 마무리(순차)

**Main T1**

```bash
Main T1$ git add -A && git commit -m "chore: sync HEAD snapshot & docs"
Main T1$ scripts/generate_summary.sh > HEAD_SUMMARY.md
```

**(선택) GitHub Actions가 PR/푸시 시 요약 코멘트 자동 생성**

---

## 5️⃣ **품질·회복력 가드레일 (필수 Quick‑Wins)**

1. **스키마 검증**: VDP 결과 업로드 전 AJV로 검증
   * `ajv.validate(schema, data)` 실패 시 즉시 중단/로그. 공식 가이드 참고.

2. **임시파일 정리 보장**: `try/finally` 패턴으로 `/tmp/*` 확실히 삭제(크래시/예외 대비)

3. **중복 방지 영속화**: `~/.vdp/processed-ids.json`에 누적 기록(워커 재시작에도 유지)

4. **요약 갱신 루틴**: 커밋 후 `post-commit` 훅으로 자동 `HEAD_SUMMARY.md` 갱신(훅은 Git 표준)

5. **Conventional Commits**: 커밋 메시지 표준화(feat/fix/chore…), 체인지로그/릴리즈 자동화에 유리.

---

## 6️⃣ **ClaudeCode/ Cursor에 추가로 넣어둘 "작업 카드 템플릿"**

```text
[TASK CARD]
- Title: (한 줄)
- Goal: (무엇을, 왜)
- Scope: (파일/경로/라인)
- Non-Goals: (이번에 안 하는 것)
- Acceptance:
  1) 스키마/엔드포인트/버킷 규칙 통과
  2) scripts/ops-health-check.sh → 🟢
  3) e2e ingest(yt/reels/tt) 1건씩 성공
- Tests/Checks:
  - ./scripts/quick-validation.sh
  - ./scripts/operational-check.sh --quick-scan
- Rollback:
  - 변경 파일/커밋 해시
  - 우회 스위치 (예: EVIDENCE_OFF)
```

---

## 7️⃣ **자주 묻는 질문**

### Q: "왜 요약을 붙여넣어야 하나요?"
대화 맥락이 길어질수록 핵심 변경만 상단에 두는 게 가장 안정적입니다. `git log --pretty`/`git diff --stat`로 **변경의 본질**만 들고 오는 게 포인트입니다.

### Q: "PR에 자동 코멘트는 어떻게?"
GitHub Actions에서 `push`/`pull_request` 트리거로 요약 파일 생성 후, `peter‑evans/create-or-update-comment`로 코멘트 남기면 끝입니다. 트리거/표현식/컨텍스트 문법은 공식 문서에 상세합니다.

### Q: "커밋 메시지 규칙은?"
Conventional Commits 1.0.0: `feat(ui): ...`, `fix(worker): ...`, `chore(ci): ...` 같은 형식으로, 자동 릴리즈/체인지로그에 최적화됩니다.

---

## 🎯 마지막 한 줄 정리

* **새 GPT‑5 Pro 채팅 시작 시**: `generate_summary.sh` 출력 + "부팅 프롬프트"를 **맨 위에 붙여넣고** 시작.
* **ClaudeCode/ Cursor**에는 위의 **복붙용 스타터 프롬프트**를 그대로 던지세요(수용 기준/파일 경로/라인까지 명시).
* PR/푸시 자동 요약(액션/훅)까지 켜두면, 다음 세션에서도 **맥락 로딩**이 10초 컷.

필요하면 이 문서 자체를 **docs/CONTEXT_PROMPT.md**로 저장해서 팀 표준으로 써도 좋습니다.

---

**문서 생성일**: 2025-08-20  
**버전**: v1.0.0  
**상태**: Production Ready  
**참고**: [GitHub Actions 공식문서](https://docs.github.com/actions/learn-github-actions/events-that-trigger-workflows)