# AI Engineering Playbook — Quick Command Reference

## Terminal–Command Mapping (Must)
| Terminal      | 허용 커맨드/작업                                   |
|---------------|-----------------------------------------------------|
| **Main T1**   | UI 라우팅, 검증(AJV), 다운로드 보기                 |
| **Jobs T2**   | youtube-stats-comments.sh 실행, 메타 JSON 산출      |
| **Main2 T2**  | /api/vdp/extract-vertex 트리거(US 메인)             |
| **Storage T4**| gsutil 업/다운/폴링, Pub/Sub 소비                   |

> 일치하지 않으면 실행 금지 + 정정요구(Wrong-Terminal Protection).

## Command → API Mapping (Authoritative)
모든 비자명한 작업은 slash command로 시작하여 결정론적 계획을 실행하고 planId, taskFingerprint, 테스트 아티팩트를 방출합니다. 명령은 Idempotency-Key를 통해 멱등성을 보장합니다.

## 생성 & 분석
### `/ingest` — 사용자 입력 등록
- **API**: `POST /ideas/ingest`
- **Body 예시**:
```json
{
  "projectId": "proj_123", 
  "input": {
    "type": "text", 
    "text": "Make a 8s ad about AquaPeak cream"
  }, 
  "assets": [{
    "type": "image", 
    "uri": "upload://product.png"
  }]
}
```
- **반환**: `{ "ideaId": "idea_abc" }`
- **참고**: 출처 저장; 써드파티 미디어 재호스팅 금지. Evidence 분리 유지.

### `/storyboard` — Story/Tone/Wild Textboards + Hook 후보 생성
- **API**: `POST /storyboards` (input = ideaId + 옵션)
- **반환**: 3개 Textboards (2-3 컷, ≤8.0s 총합), Hook Lab 최고 후보, Evidence Pack v1.0, VDP_MIN

## 컴파일 & 프리뷰
### `/compile` — Textboard를 Veo3 프롬프트로 변환
- **API**: `POST /compile/veo3`
- **모드**: `text_to_video` 또는 `image_to_video` (첫프레임 제품)
- **검증**: 16:9 + 8s + {720p|1080p} 강제. 불일치 시 타입드 에러 반환.

### `/preview` — 프리뷰 렌더링 (비동기 작업)
- **API**: `POST /preview/veo` → 202 + `Location: /jobs/{id}`
- **폴링**: `GET /jobs/{id}`로 mediaUrl + synthId 확인
- **할당량**: ≤2 videos/request; ~10 RPM/project; RateLimit-* 헤더 노출

## QA & 익스포트
### `/qa` — Hook 창, 페이싱, safezones, 공개 검증
- **API**: `POST /qa/validate` → `{ pass, trustScore, issues[], evidenceChips[] }`
- **Hook ≤3s는 MAJOR**; 플랫폼 힌트는 극단적이지 않은 한 권고사항

### `/export` — 아티팩트 다운로드
- **Brief**: `GET /export/brief/{id}` → Brief + Evidence (PDF/HTML)
- **JSON**: `GET /export/json/{id}` → VideoGen IR + Veo3 Prompt (JSON)
- **Evidence는 항상 Digest/Trust 칩 포함**; 원시 VDP 절대 안 됨

## 빌링
### `/estimate` — 계획된 작업의 예상 Credit(CR) 비용 표시
- **API**: `POST /billing/estimate` → `{ estimatedCostCR, breakdown }`
- **동작**: 클라이언트는 크레딧 hold/commit 안 함; 서버가 실행 시 내부적으로 hold→commit 수행 (예: `/preview/veo` 내에서)

## Quick Reference — 전체 명령어 목록
```bash
/ingest input:<text|url|upload://...> [image:upload://product.png]
/storyboard idea:<id> [locale:ko-KR] [persona:GenZ]  
/estimate op:<preview|image> params:{res:720p,mode:text_to_video}
/compile variant:<story|tone|wild> mode:<text_to_video|image_to_video> res:<720p|1080p> ar:16:9 dur:8
/preview prompt:<id> [batch:1]
/status job:<id>
/qa target:<tiktok|reels|shorts> video:<url> [assumeSponsored:true]
/export brief:<id> | json:<id>
```

## Data Contracts
- **Textboard** (2-3 컷 ≤8.0s): 최소 스토리보드 → 컴파일러 입력
- **VideoGen IR** (제공업체 무관) → Veo3 Prompt (제공업체 준비됨). 컴파일 시 AR/duration/resolution 검증
- **Evidence Pack v1.0**: 3-5 칩, Trust Score (0-100), Digest ID + 출처, 컴플라이언스 힌트 (KR/#광고; 채널 fps/bitrate/length), 워터마크/자격증명 신호 (SynthID/C2PA)
- **VDP_MIN만** (digest/배지/beats); VDP_FULL은 절대 엔클레이브를 벗어나지 않음

## Credits & 비용 (통합)
- **Credit 단위**: CR (프리뷰/이미지 생성 전반의 단일 통화)
- **청구 작업** (예시):
  - Veo3 Preview (text→video 또는 image→video): 해상도별 CR 소비 (서버가 정확한 요율 결정; `/billing/estimate` 사용)
  - Flux Kontext (최신) 이미지 생성 (필요 시 첫프레임 구성): CR 소비; estimate breakdown에 표시
- **클라이언트 패턴**:
  - `/billing/estimate` (선택적) → 사용자에게 비용 표시
  - `/compile/veo3` → `/preview/veo` (서버가 내부 hold/commit 수행)
  - 재시도 가능한 오류 실패 시, retry_after 및 백오프 따름

## Quality Gates & 에러 모델
### QA 규칙 (요약)
- **HOOK ≤3s** (8s 프리뷰에서 MAJOR), 페이싱 창, 자막 가독성, safezone 겹침, KR 공개, autoplay-safe, 플러스 채널 힌트 (TikTok bitrate ≥516kbps; Reels ≥30fps/≥720p; Shorts ≤3분 지침)

### 타입드 에러 (RFC 9457)
- `UNSUPPORTED_AR_FOR_PREVIEW` — 프리뷰는 16:9여야 함
- `INVALID_DURATION` — ≤8s여야 함; 수정 후 재검증
- `MISSING_FIRST_FRAME` — 제품 첫프레임 이미지 제공
- `PROVIDER_POLICY_BLOCKED` — 허용되지 않는 매개변수 제거 후 재제출
- `PROVIDER_QUOTA_EXCEEDED` / `RATE_LIMITED` — Retry-After 사용하여 백오프; RateLimit-* 헤더도 준수

**Problem Details 페이로드** (표준): type, title, status, detail, instance, 플러스 벤더 필드: code, retry_after, doc_url

## 표준 워크플로우 (CLI/ChatOps 레시피)
### "아이디어에서 프리뷰까지" (해피 패스)
1. `/ingest` → ideaId 저장
2. `/storyboard idea:<id>` → Textboards + Evidence + VDP_MIN 획득
3. (선택적) `/estimate op:preview variant:story res:1080p`
4. `/compile variant:story mode:text_to_video ar:16:9 dur:8 res:1080p`
5. `/preview prompt:<id>` → job {id}; `/jobs/{id}` 폴링 → mediaUrl, synthId
6. `/qa target:reels video:<mediaUrl>` → issues & Trust Score
7. `/export brief:<id>` 또는 `/export json:<id>`

### "Product-First (첫프레임)"
1. `/ingest` with assets:[product image]
2. `/storyboard` (해당되는 경우 제품 장면 마킹)
3. `/compile mode:image_to_video firstFrame:upload://product.png`
4. `/preview` → `/jobs/{id}`
5. `/qa` → 필요 시 safezone/captions 수정; 필요하면 재프리뷰

**참고**: 첫프레임에 구성이 필요한 경우, 서버가 Flux Kontext (최신)를 호출하여 정적 이미지 생성/조정; CR이 소비되고 `/billing/estimate`에 나타남. 그런 다음 Veo3 image→video가 해당 정적 이미지를 8초간 애니메이션화.

## 프라이버시, 출처 및 신뢰
- **VDP 경계**: VDP_FULL의 계산과 저장을 비공개 엔클레이브에 유지; Digest/Evidence/Preview/QA만 경계를 넘음
- **워터마크 & 자격증명**: 프리뷰에서 SynthID 존재 표시; 자산에 존재하는 경우 C2PA 표시; 둘 다 지원 신호
- **Digest 검증**: 모든 아티팩트는 Digest ID 인쇄; `/trust/verify` (내부)는 감사를 위한 포함 증명 반환 가능

## 구현 참고사항 (엔지니어링용)
- **OpenAPI 3.1 파일이 진실의 원천**; 여기서 클라이언트/서버를 생성하고 스키마 참조를 JSON Schema 2020-12와 동기화 유지
- **자동재생 정책**: mute를 기본으로 하는 플레이어 구축; 클릭/탭에서만 음소거 해제; 들릴 수 있는 자동재생 절대 가정 안 함
- **속도 제한**: Retry-After 준수; RateLimit-* 노출
- **멱등성**: 모든 안전하지 않은 POST에 Idempotency-Key 전송; 서버는 30일간 중복 제거
- **테스트 게이트**: unit + schema + contract + QA lint가 병합 전에 통과해야 함; 프리뷰/익스포트에 Evidence (칩 + Trust 점수) 첨부

---
*이 Playbook은 최종화된 API 및 스키마 세트와 완전히 정렬됨; deprecated 경로 제거, 크레딧/빌링 동작 (Flux Kontext 이미지 생성 포함) 통합, 8초 스토리보드 우선 워크플로우 end-to-end 잠금.*

