# QA Gate Baseline + Channel-aware Validation

## Core QA Requirements
- **Hook execution**: Must be ≤ 3 seconds (MAJOR)
- **Total duration**: Exactly 8.0s across 2-4 scenes
- **Safe zones**: Ensure content is within safe viewing areas
- **Subtitle legibility**: Text must be readable across devices

## Channel-specific Quality Standards
- **Reels**: ≥720p, ≥30fps, 16:9 aspect ratio
- **TikTok In-Feed/TopView**: bitrate ≥ 516 kbps
- **Shorts**: 16:9 source with crop-proxy metadata support
- **Universal**: muted autoplay + playsinline for iOS/Safari compatibility

## Evidence Pack Validation
- **Trust Score**: confidence scores (0.9~0.98)
- **Evidence Chips**: 3-5 pieces of supporting evidence
- **SynthID Detection**: AI-generated content identification
- **Provenance**: source tracking and attribution

## Storyboard Quality Checks
- **Narrative flow**: Hook → Demonstration → Problem_Solution
- **Visual consistency**: lighting, mood palette, edit grammar
- **Audio quality**: music, tone, ambient sound
- **Product mentions**: accurate identification and timing

## Testing Requirements
- Unit tests for core functionality
- Integration tests for API endpoints (`/ingest`, `/snap3`, `/compile/veo3`)
- End-to-end tests for critical user flows
- Contract tests for OpenAPI 3.1 + JSON Schema 2020-12

## Code Quality
- Follow established coding standards
- Maintain code readability and documentation
- Ensure proper error boundaries
- VDP privacy compliance (VDP_FULL internal only)

## Auto-attach Triggers
This rule auto-attaches when working on:
- QA-related components (`/qa/validate`)
- Testing files
- Performance optimization
- Accessibility features
- Storyboard/Textboard validation
- Evidence Pack generation
