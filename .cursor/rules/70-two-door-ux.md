# Two-Door UX Architecture (Main ↔ Storyboard Detail)

## Core Architecture
- **Two-Door Entry**: Main (Browse & Create) → Storyboard Detail (single destination)
- **Native Experience**: No external embeds or link-outs
- **Veo3 Units**: 8-second generation units with optional jump-cuts

## Main Page Structure
- **Top**: Trending Originals (3 hero Veo3 Originals)
- **Mid**: Creation Studio (compact chatbot with multi-modal input)
- **Bottom**: Category feed (infinite rail of classic Originals)

## Creation Studio (Chat-to-Storyboard)
- **Inputs**: text (≤2k chars), product image (PNG/JPG ≤20MB), video (≤60s), URL
- **CTA**: "Make my Storyboard"
- **Latency**: P95 ≤6s (text/URL), ≤10s (upload)
- **Output**: Storyboard Detail prefilled with Textboard, Hook candidates, Evidence

## Storyboard Detail (Single Destination)
- **Player strip**: muted autoplay + Evidence Dock
- **Hook Lab**: 5-8 hook candidates (0-3s) with pattern-break/clarity/curiosity scores
- **Textboard**: 2-3 cuts, total 8.0s ±0.05s
- **DNA locks vs Parody keys**: immutable structure vs editable fields
- **Product-First Frame**: motion suggestions (dolly_in, parallax, tilt_reveal)
- **Compile & Render**: Preview 8s per scene, Sequence-60 panel

## Veo3 Integration
- **Hard constraints**: durationSec=8, aspectRatio="16:9", resolution∈{"720p","1080p"}
- **Jump-cuts**: 2-3 cuts within 8s unit (e.g., 3s + 5s, or 2.5s + 2.7s + 2.8s)
- **Sequence-60**: up to 8 scenes (60s total) with external crop guidance
- **Async pattern**: POST /preview/veo → 202 + Location:/jobs/{id}

## Evidence-First Features
- **Evidence Dock**: Trust Score (0-100) + 3-5 chips + Digest ID
- **Hook Lab**: Evidence-based hook candidates with radar scores
- **Product-First Frame**: image→video motion guidance
- **VDP privacy**: VDP_FULL internal only, VDP_MIN + Evidence Pack external

## Quality & Compliance
- **Hook ≤3s**: First scene critical importance
- **Muted autoplay**: Browser policy compliance
- **Channel hints**: Reels ≥30fps/≥720p, TikTok ≥516kbps, Shorts ≤3min
- **SynthID**: Watermark disclosure when present

## Auto-attach Triggers
This rule auto-attaches when working on:
- Main page components (Originals rail, Creation Studio, Category feed)
- Storyboard Detail layout and components
- Hook Lab functionality
- Product-First Frame features
- Veo3 integration and constraints
- Evidence Pack generation
- Multi-modal input handling
