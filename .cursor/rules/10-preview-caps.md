# Veo3 Preview Caps + Storyboard Architecture

## Core Architecture
- **Storyboard-first UX**: Textboard(2-4 scenes) + Evidence Pack 중심
- **VDP privacy by design**: VDP_FULL 내부 전용, VDP_MIN + Evidence Pack만 노출
- **Provider-aligned prompts**: Veo3 제약사항 엄격 준수

## Veo3 Hard Constraints
- **durationSec**: Must be exactly 8 seconds
- **aspectRatio**: Must be "16:9" 
- **resolution**: Must be either "720p" or "1080p"
- **total scenes**: 2-4 scenes with total duration = 8.0s
- **jump-cuts**: 2-3 cuts within 8s unit (e.g., 3s + 5s, or 2.5s + 2.7s + 2.8s)
- **sequence-60**: up to 8 scenes (60s total) with external crop guidance

## Vertical Request Handling
- For 9:16 aspect ratio requests: Render as 16:9 and return UI crop-proxy metadata only
- Do not render actual 9:16 videos
- Provide crop coordinates for 9:16 overlay

## Embed Policy
- Use **official embeds only** (YouTube Player, etc.)
- No re-hosting or downloading of content
- Reference official embed URLs only

## Async Preview Pattern
- Use `POST /preview/veo` → Returns 202 + Location:/jobs/{id}
- Poll `GET /jobs/{id}` for status
- Support `Retry-After` header
- Include Evidence Pack in response
- Credit debits: Pre-submit estimate, post-submit receipt
- Flux Kontext integration: First-frame generation for product scenes

## Error Handling
- Use `application/problem+json` (RFC 9457)
- Include `code` from taxonomy in error responses
- Provide one-line fixes for each error type

## Channel-aware Quality
- **Reels**: ≥720p, ≥30fps
- **TikTok**: bitrate ≥ 516 kbps
- **Shorts**: 16:9 source with crop-proxy metadata

## Auto-attach Triggers
This rule auto-attaches when touching:
- API endpoints (`/ingest`, `/snap3`, `/compile/veo3`, `/preview/veo`)
- Player components  
- Schema definitions
- Video generation logic
- Storyboard/Textboard components
