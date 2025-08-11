# Storyboard-first UX Architecture

## Core Principles
- **Storyboard-first UX**: Textboard(2-4 scenes) + Evidence Pack 중심 아키텍처
- **VDP privacy by design**: VDP_FULL 내부 전용, VDP_MIN + Evidence Pack만 노출
- **Explainability defaults**: 모든 생성물에 Evidence Pack 첨부

## Textboard Structure
- **Scenes**: 2-4 scenes with total duration = 8.0s
- **Narrative flow**: Hook → Demonstration → Problem_Solution
- **Scene components**: role, durationSec, visual, audio
- **Rhetoric devices**: storytelling, curiosity_gap, pathos, relatability

## Evidence Pack Requirements
- **Trust Score**: confidence scores (0.9~0.98)
- **Evidence Chips**: 3-5 pieces of supporting evidence
- **SynthID Detection**: AI-generated content identification
- **Provenance**: source tracking and attribution
- **Notable comments**: actual user feedback + translation

## VDP Integration
- **VDP_FULL**: Internal analysis only (overall_analysis, scenes[], product_mentions[])
- **VDP_MIN**: External exposure (digestId, category, hookSec, tempoBucket, source.embedEligible)
- **Evidence Pack**: Bridge between internal analysis and external presentation

## API Endpoints
- `POST /ingest`: URL/text/upload normalization + embed eligibility
- `POST /snap3/turbo`: Textboard(2-4 scenes) + Evidence Pack generation
- `POST /compile/veo3`: Veo3 Prompt JSON validation (8s/16:9/720p|1080p)
- `POST /preview/veo`: Async job pattern with Evidence Pack
- `POST /qa/validate`: Storyboard quality + channel requirements
- `GET /export/brief/{id}`: Brief PDF + Evidence Pack
- `GET /export/json/{id}`: VideoGen IR + Veo3 Prompt + Evidence

## Quality Validation
- **Hook ≤ 3s**: First scene critical importance
- **Narrative coherence**: Clear story progression
- **Visual consistency**: lighting, mood palette, edit grammar
- **Audio quality**: music, tone, ambient sound
- **Channel compliance**: platform-specific requirements

## Auto-attach Triggers
This rule auto-attaches when working on:
- Storyboard/Textboard components
- Evidence Pack generation
- VDP integration logic
- Narrative flow validation
- API endpoints (`/ingest`, `/snap3`, `/compile/veo3`)
- Export functionality
