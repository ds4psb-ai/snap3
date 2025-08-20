# 🧠 GPT-5↔ClaudeCode 양방향 효율 체계

## 핵심 원리

**맥락 손실 없이** 빠른 개발을 위한 **ClaudeCode 중심 실행 지침서**

---

## 🚀 10분 세팅 (완료)

- ✅ `scripts/generate_summary.sh` - 최근 5커밋 요약 생성
- ✅ `.github/workflows/summarize-commits.yml` - 자동 요약 워크플로  
- ✅ `docs/CONTEXT_PROMPT.md` - 요약 전용 프롬프트
- ✅ `docs/operational-head-loop.md` - 운영 가이드

---

## 📋 운영 루틴 (ClaudeCode 중심)

### (A) 새 세션 시작 시

```bash
ClaudeCode(main)$ scripts/generate_summary.sh | tee /tmp/ctx.txt
```

→ `/tmp/ctx.txt` 내용 **전부 복사** → GPT-5 채팅 **맨 위**에 붙여넣기

### (B) 작업 완료 후

```bash
ClaudeCode(main)$ git add -A && git commit -m "feat: 구현 완료"
ClaudeCode(main)$ scripts/generate_summary.sh | tee /tmp/ctx.txt
```

→ HEAD에게 "업데이트: 방금 커밋 반영된 요약이야" 전달

### (C) 긴 코드는 링크로만

- GitHub 파일 뷰에서 **라인 드래그** → **Y키** (permalink) → `#L45-L60` 앵커
- 예: `[src/foo.ts#L45-L60](https://github.com/owner/repo/blob/SHA/src/foo.ts#L45-L60)`

---

## 🎯 핵심 규칙

1. **대화 길어지면** → 요약 새로 생성 → 채팅 맨 위 교체
2. **긴 코드** → 링크만, 텍스트 블록 금지  
3. **PR/Push시** → GitHub 자동 요약 확인 → 필요한 부분만 채팅 전달

---

## ⚡ 바로 실행 루틴

```bash
# 평소 루틴 (ClaudeCode만)
ClaudeCode(main)$ scripts/generate_summary.sh | tee /tmp/ctx.txt   # 상황 요약
# ...작업 진행...
ClaudeCode(main)$ git add -A && git commit -m "feat: 구현 X"      # 작업 커밋
ClaudeCode(main)$ scripts/generate_summary.sh | tee /tmp/ctx.txt   # 업데이트 요약
ClaudeCode(main)$ git push origin HEAD                            # 푸시 (자동 요약)
```

**결과**: HEAD는 항상 최신 5커밋 + 필요 코드 라인으로 정확한 맥락 유지