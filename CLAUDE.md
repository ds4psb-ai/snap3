# CLAUDE.md — Control Tower (Plan Mode 전용)

## 작업 디렉토리 설정
Claude Code 실행 시 자동으로 이 디렉토리에서 시작:
- Working Directory: `/Users/ted/snap3`

## 역할 / 루프
- **역할**
  - **Claude Code**: 플래너/오케스트레이터 (Plan → Apply → Test → Review). *기본은 Plan Mode*.
  - **Cursor**: IDE/디프/테스트 러너. (*파일 수정은 승인된 체크리스트에 한함*).
  - **GPT-5 Pro**: 세컨드 체커(리뷰/레드팀).
- **루프**
  1) **Plan** — 스펙 매핑/작업계획/테스트 목록 산출 (*코드/파일 수정 금지*).
  2) **Approve** — 테스트/스키마/계약/QA 게이트 존재 확인 후 승인.
  3) **Apply** — 승인된 경로만 수정. VDP_FULL 비노출 준수.
  4) **Test** — 단위 + JSON Schema + OpenAPI 계약 + QA 린트 전부 그린.
  5) **Review** — QA 패스 + Evidence 첨부 후에만 병합(merge).

---

## MUST
- **VDP_FULL은 내부 전용**. 외부 표면에는 **VDP_MIN + Evidence**만.
- **Veo3 프리뷰 캡**: `duration=8s`, `aspect=16:9`, `resolution∈{720p,1080p}`.
- **세로(9:16) 요청 시**: 16:9로 렌더하고 **UI crop‑proxy**(9:16 오버레이 좌표만 메타로 제공).
- **공식 임베드만 사용**(예: YouTube Player). **다운로드/리호스팅 금지**.
- 프리뷰 플레이어는 **muted autoplay + playsinline** 기본.
- **비동기 프리뷰 잡**: `POST /preview/veo` → **202 Accepted** + `Location: /jobs/{id}`; `GET /jobs/{id}` 폴링.
- **오류 응답**: **RFC 9457 Problem Details(JSON)** + 타입드 에러 코드.
- **테스트 우선**: table‑driven 단위 테스트 + JSON Schema(2020‑12) + OpenAPI 3.1 계약 테스트 + QA 린트.
- **QA Gate 패스 전 병합 금지**.

## NEVER
- `/internal/vdp_full/**` 읽기/쓰기, **원본 VDP 노출**.
- 비공식/스크래핑 임베드, 써드파티 다운로드 기능, **무단 크롤/스크레이프**.
- 승인되지 않은 파일 경로 수정, 비인가 네트워크 오퍼레이션(curl/wget/ssh/scp 등).

---

## 엔드포인트(초안)
- `POST /ingest` — URL/텍스트/업로드 정규화 + 임베드 적합성 기록
- `POST /snap3/turbo` — Textboard(2–4 씬) + Evidence (총합 8s 준수)
- `POST /compile/veo3` — Veo3 Prompt JSON 검증(8s/16:9/720p|1080p)
- `POST /preview/veo` — **202 Accepted** + `Location: /jobs/{id}`
- `GET /jobs/{id}` — 잡 상태/미디어 URL/SynthID 여부
- `POST /qa/validate` — Hook≤3s, safezones, 자막 가독성, fps/bitrate 힌트
- `GET /export/brief/{id}` — Brief PDF(+Evidence, Digest only)
- `GET /export/json/{id}` — VideoGen IR + Veo3 Prompt JSON(+Evidence)

### 스키마(요약)
- **VDP_MIN** — digestId; category; hookSec; tempoBucket; source.embedEligible
- **EvidencePack** — digestId; trustScore; evidenceChips[3–5]; synthIdDetected; provenance
- **Textboard** — scenes[2–4]{role; durationSec; visual; audio}; total=8.0s
- **VideoGenIR** — durationSec=8; aspect=16:9; resolution(720p|1080p); cuts[2–3]
- **Veo3Prompt** — durationSec=8; aspect=16:9; resolution(720p|1080p); shots[2–3]
- **QAReport** — target; pass; issues[{code;severity;fix}]

---

## Typed Errors (taxonomy & one‑line fix)
- `UNSUPPORTED_AR_FOR_PREVIEW` — Asked 9:16; preview is 16:9. **Render 16:9; return crop‑proxy** or switch AR.
- `INVALID_DURATION` — Preview must be **8s**. Fix to 8s and re‑validate.
- `MISSING_FIRST_FRAME` — Upload product/first frame image; re‑compile.
- `PROVIDER_QUOTA_EXCEEDED` — Honor `Retry‑After`; reduce batch size.
- `PROVIDER_POLICY_BLOCKED` — Remove flagged params; resubmit.
- `EMBED_DENIED` — Use **official embeds only**; link out if needed.
- `RATE_LIMITED` — Backoff per headers.
- `QA_RULE_VIOLATION` — Fix Hook≤3s, safezones, fps/bitrate; re‑run QA.

> 모든 에러는 `application/problem+json`(RFC 9457)로 응답하고, `code` 필드는 위 enum에서만 선택.

---

## UI / Player 규칙
- **autoplay는 muted + playsinline**일 때만 기본 허용. iOS/Safari 호환 유지.
- 세로 요청 미리보기는 **16:9 원본 위 9:16 crop‑proxy**를 오버레이(내보내기=항상 16:9).
- SynthID/워터마크 감지 시 **배지 노출**(provenance 표기).

---

## QA Gate (MVP)
- **Hook ≤ 3s** (MAJOR), 씬 길이 합 **정확히 8.0s**
- 자막 가독성(크기/라인 길이/명암비), **safezones** 미침범
- 채널 힌트:
  - Reels: **≥720p, ≥30fps**
  - TikTok In‑Feed/TopView: **bitrate ≥ 516 kbps** 이상 권고
  - Shorts: 16:9 소스 허용(프리뷰는 crop‑proxy 안내)
- 출력: `{ pass, trustScore, issues[] (code/severity/fix), evidenceChips[] }`

---

## 보안/스토리지
- **Supabase RLS 필수**. 업로드/프리뷰 공유는 **서명 URL**만.
- 서비스 롤키는 **서버 전용**(클라이언트 노출 금지).
- 스토리지 접근은 `StorageProvider` 인터페이스 뒤에 캡슐화(벤더 교체 가능).

---

## 계약/테스트
- **OpenAPI 3.1** + **JSON Schema 2020‑12** — 스키마/예제 라운드트립.
- **Veo3Prompt 하드 제약**: `duration=8` / `aspect="16:9"` / `resolution∈{720p,1080p}`.
- **비동기 잡 패턴**: 202 + `Location` + 폴링(`GET /jobs/{id}`); `Retry‑After` 지원.
- CI는 **unit + schema + contract + QA lint** 전부 그린일 때만 패스.

---

## 공개/표시(Disclosure) — 지역별 최소 카피(1줄)
- **KR**: `#광고 #유료광고포함 — 본 영상은 경제적 대가를 포함합니다.`
- **US(FTC)**: `Sponsored — I received compensation for this content.`
- **EU(Transparency/AI)**: `Includes AI-generated content.` (채널 정책/법령에 맞춰 보조 배지/워터마크 추가)

---

## Workflows (명령/훅)
- `/tests:all` — 단위 + 스키마 + 계약 + QA 린트
- `/compile:veo3` — Veo3 Prompt JSON 생성/검증(8s/16:9/720p|1080p)
- `/qa:validate` — Hook/safezones/fps/bitrate 검사
- `/export:brief` — Brief PDF + Evidence 첨부
- `/docs:index` — OpenAPI/스키마 문서화 업데이트

---

## 편집/가드레일
- **allow edit**: `apps/**`, `packages/**`, `src/**`
- **deny**: `/internal/vdp_full/**`, 리호스팅/다운로드 코드, 비인가 네트워크 호출
- **플레이어**: 자동재생은 기본 **mute**; 공식 임베드만; 재인코딩 금지(프리뷰 제외)

---

## PR 머지 조건
- 모든 테스트/린트/계약/QA **그린**.
- 프리뷰 캡(8s/16:9/720p|1080p) **위반 없음**.
- Evidence & Digest 첨부, **VDP_FULL 외부 노출 없음**.