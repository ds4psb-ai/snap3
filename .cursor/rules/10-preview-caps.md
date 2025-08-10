# Veo3 Preview Caps + Player Behavior

## Preview Constraints
- **durationSec**: Must be exactly 8 seconds
- **aspectRatio**: Must be "16:9" 
- **resolution**: Must be either "720p" or "1080p"

## Vertical Request Handling
- For 9:16 aspect ratio requests: Render as 16:9 and return UI crop-proxy metadata only
- Do not render actual 9:16 videos

## Embed Policy
- Use **official embeds only**
- No re-hosting or downloading of content
- Reference official embed URLs only

## Async Preview Pattern
- Use `POST /preview/veo` → Returns 202 + Location:/jobs/{id}
- Poll `GET /jobs/{id}` for status
- Support `Retry-After` header

## Error Handling
- Use `application/problem+json` (RFC 9457-like)
- Include `code` from taxonomy in error responses

## Auto-attach Triggers
This rule auto-attaches when touching:
- API endpoints
- Player components  
- Schema definitions
- Video generation logic
