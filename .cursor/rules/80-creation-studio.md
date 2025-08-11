# Creation Studio (Chat-to-Storyboard)

## Multi-Modal Input System
- **Text input**: ≤2k characters, natural language brief
- **Product image**: PNG/JPG ≤20MB, becomes first frame for product scenes
- **Video upload**: ≤60s reference clip
- **URL input**: reference link for inspiration
- **Single message**: One input type per submission

## Creation Studio Flow
- **Input validation**: File size, format, content type checks
- **Normalization**: URL/file/text processing
- **VDP analysis**: Private VDP_FULL processing
- **Snap3 Turbo**: Textboard generation (Story/Tone/Wild variants)
- **Hook Lab**: 5-8 hook candidates with scores
- **Evidence Pack**: Trust Score + 3-5 chips + Digest ID
- **Output**: Storyboard Detail URL with prefilled content

## Performance Requirements
- **Latency targets**: P95 ≤6s (text/URL), ≤10s (upload)
- **Error handling**: RFC 9457 Problem Details with actionable hints
- **Idempotency**: Idempotency-Key for duplicate request handling
- **Rate limiting**: Graceful handling with Retry-After headers

## Product-First Frame Integration
- **Scene marking**: Automatically mark scenes as requires_product
- **First frame**: Uploaded image becomes frame 0
- **Motion suggestions**: dolly_in, parallax, tilt_reveal options
- **Image→video prompts**: Compile with motion directives

## Hook Lab Integration
- **Hook generation**: 5-8 candidates with 0-3s timestamps
- **Scoring system**: pattern-break, clarity, curiosity (0-1 scale)
- **Top-3 display**: Inline on Textboard header
- **Instant updates**: Hook replacement updates Textboard immediately

## Evidence Pack Generation
- **Trust Score**: 0-100 confidence rating
- **Evidence chips**: 3-5 supporting evidence pieces
- **Digest ID**: Merkle proof for VDP linkage
- **Provenance**: Source tracking and attribution
- **SynthID detection**: AI-generated content identification

## Error Handling
- **MISSING_FIRST_FRAME**: Product scene without image
- **INVALID_DURATION**: Scene >8s or total ≠8.0s
- **UNSUPPORTED_AR_FOR_PREVIEW**: Non-16:9 aspect ratio
- **PROVIDER_QUOTA_EXCEEDED**: Rate limit exceeded
- **PROVIDER_POLICY_BLOCKED**: Content policy violation

## Auto-attach Triggers
This rule auto-attaches when working on:
- Multi-modal input handling
- File upload and validation
- VDP integration and processing
- Snap3 Turbo workflow
- Hook Lab functionality
- Evidence Pack generation
- Performance optimization
- Error handling and recovery
