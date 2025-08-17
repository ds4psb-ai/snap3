# Two-Pass VDP Generation Implementation

## Overview

The T2-Extract service now implements a sophisticated **two-pass VDP generation system** that ensures high-quality, density-compliant Video Data Packages through intelligent outline generation and detail expansion.

## Architecture

### Pass 1: Outline Generation (씬/타임라인/후킹)
- **Purpose**: Generate initial VDP structure with scene segmentation, timeline, and hook analysis
- **Focus**: Overall narrative flow, hook genome extraction, basic scene boundaries
- **Output**: Foundational VDP with core analysis but potentially sparse detail

### Pass 2: Density Floor Enforcement (씬별 상세확장)
- **Purpose**: Expand insufficient areas to meet density requirements
- **Focus**: Shot-level detail, keyframe expansion, composition analysis
- **Output**: Production-ready VDP meeting all quality thresholds

## Core Functions

### `computeDensity(vdp)`
Analyzes VDP structure and returns detailed metrics:

```javascript
function computeDensity(vdp) {
  const scenes = Array.isArray(vdp?.scenes) ? vdp.scenes : [];
  const numScenes = scenes.length;
  let shots = 0, kf = 0;
  for (const s of scenes) {
    const shotsArr = Array.isArray(s?.shots) ? s.shots : [];
    shots += shotsArr.length;
    for (const sh of shotsArr) {
      kf += Array.isArray(sh?.keyframes) ? sh.keyframes.length : 0;
    }
  }
  return { numScenes, shots, kf };
}
```

**Returns**: `{ numScenes, shots, kf }` - Complete density metrics

### `ensureDensityFloor({ model, vdp, targets, meta })`
Intelligent expansion system that:

1. **Analyzes current density** against configurable targets
2. **Determines expansion needs** for scenes, shots, and keyframes
3. **Generates targeted repair prompt** with current VDP context
4. **Executes expansion** via Vertex AI with enhanced instructions
5. **Validates results** and returns enhanced VDP

## Quality Targets

### Configurable Density Thresholds
```javascript
const targets = {
  minScenes: DENSITY_SCENES_MIN,           // Default: 4
  minShotsPerScene: DENSITY_MIN_SHOTS_PER_SCENE,  // Default: 2
  minKFPerShot: DENSITY_MIN_KF_PER_SHOT,   // Default: 3
};
```

### Calculated Minimums
- **Total Shots**: `minScenes × minShotsPerScene = 8`
- **Total Keyframes**: `totalShots × minKFPerShot = 24`
- **Composition Notes**: Required for each shot
- **Audio Events**: Required for each scene

## Implementation Flow

### Standard Processing Pipeline
```
1. 🎬 Pass 1: Initial VDP Generation
   ├── Text parsing with hook genome prompt
   ├── Basic scene segmentation
   ├── Hook quality analysis
   └── Legacy verbosity validation

2. 🔍 Pass 2: Density Analysis
   ├── computeDensity(vdp) 
   ├── Compare against targets
   ├── Determine expansion needs
   └── Branch: sufficient ✅ or expand ⚡

3. ⚡ Density Floor Enforcement (if needed)
   ├── Generate repair prompt with current VDP
   ├── Execute targeted expansion via Vertex AI
   ├── Parse and validate expanded VDP
   └── Return enhanced result

4. ✅ Final Quality Validation
   ├── Hook genome validation (≤3s, ≥0.70)
   ├── Final density verification
   ├── Metadata enrichment
   └── Response formatting
```

## Enhanced Logging

### Pass 1 Logging
```
[Pass 1] 🎬 Initial VDP generated for: {content_id}
[Pass 1] ⚠️ Legacy verbosity check failed: {issues}
```

### Pass 2 Logging
```
[Pass 2] 🔍 Starting density floor enforcement...
[Density Check] ✅ VDP meets density requirements: {scenes} scenes, {shots} shots, {kf} keyframes
[Density Floor] 🔄 Expanding VDP - Current: {current}, Required: {targets}
[Density Repair] 📊 After expansion: {final_metrics}
[Density Floor] ✅ Successfully expanded VDP to meet requirements
```

### Final Success Logging
```
[Two-Pass VDP] ✅ Final Success: {content_id} - Hook: {pattern_code} ({strength_score})
[Two-Pass Quality] Final density: {scenes} scenes, {shots} shots, {kf} keyframes, {notes} notes
```

## Metadata Enhancement

### Processing Metadata
```javascript
vdp.processing_metadata = {
  schema_version: "2.0-enhanced-v2-two-pass",
  two_pass_vdp_quality: {
    scenes_count: finalDensity.numScenes,
    shots_count: finalDensity.shots,
    keyframes_count: finalDensity.kf,
    composition_notes: compositionNotes,
    density_targets: targets,
    density_floor_passed: boolean
  },
  generation_metadata: {
    mode: "two_pass_text_parsing",
    pass_1: "outline_generation",
    pass_2: "density_floor_enforcement"
  }
}
```

## Error Handling & Recovery

### Expansion Failure Recovery
- **Parse errors**: Return original VDP with warning
- **Density still insufficient**: Log warning but proceed
- **Vertex AI timeout**: Graceful degradation to Pass 1 result
- **JSON malformation**: Retry once, then fallback

### Quality Gate Integration
Hook quality gates remain enforced regardless of density expansion:
- `start_sec ≤ 3.0`
- `strength_score ≥ 0.70`
- `pattern_code` present (string or array)

## Performance Considerations

### Optimization Strategies
1. **Smart Expansion**: Only expand what's needed (scenes, shots, or keyframes)
2. **Context Preservation**: Maintain existing hook genome and narrative structure
3. **Single API Call**: Both passes use same Vertex AI model instance
4. **Early Exit**: Skip Pass 2 if density already sufficient

### Resource Impact
- **Additional Vertex AI Call**: Only when density insufficient (~20-30% of cases)
- **Processing Time**: +5-15s when expansion needed
- **Token Usage**: +2-5K tokens for repair prompt and response
- **Memory**: Minimal additional overhead

## Configuration Examples

### High-Quality Mode
```bash
export DENSITY_SCENES_MIN=5
export DENSITY_MIN_SHOTS_PER_SCENE=3
export DENSITY_MIN_KF_PER_SHOT=4
# Results in: 15 shots, 60 keyframes minimum
```

### Balanced Mode (Default)
```bash
export DENSITY_SCENES_MIN=4
export DENSITY_MIN_SHOTS_PER_SCENE=2
export DENSITY_MIN_KF_PER_SHOT=3
# Results in: 8 shots, 24 keyframes minimum
```

### Fast Mode
```bash
export DENSITY_SCENES_MIN=3
export DENSITY_MIN_SHOTS_PER_SCENE=2
export DENSITY_MIN_KF_PER_SHOT=2
# Results in: 6 shots, 12 keyframes minimum
```

## Testing & Validation

### Test Script
Use `test-two-pass-density.js` to validate density logic:
```bash
node test-two-pass-density.js
```

### Integration Testing
```bash
# Test server startup
node src/server.js

# Test API endpoint
curl -X POST http://localhost:8080/api/vdp/extract-vertex \
  -H "Content-Type: application/json" \
  -d '{"gcsUri": "gs://bucket/video.mp4", "meta": {"platform": "youtube"}}'
```

## Benefits

### Quality Assurance
- **Consistent density** across all VDP outputs
- **Detailed analysis** for complex content
- **Robust hook detection** with temporal precision
- **Production-ready** shot breakdowns

### Reliability
- **Configurable thresholds** for different use cases
- **Automatic retry** for insufficient detail
- **Graceful degradation** on failures
- **Comprehensive logging** for debugging

### Performance
- **Smart expansion** only when needed
- **Single model instance** for both passes
- **Early exit optimization** for sufficient VDPs
- **Metadata tracking** for optimization

## Future Enhancements

### Planned Improvements
- **Parallel processing** for multiple VDP requests
- **Adaptive thresholds** based on content type
- **Quality scoring** beyond density metrics
- **A/B testing framework** for threshold optimization

### Advanced Features
- **Scene-specific targets** (hook vs. development vs. resolution)
- **Platform-aware expansion** (TikTok vs. YouTube vs. Instagram)
- **ML-driven density prediction** 
- **Cross-VDP learning** and pattern recognition

## Related Documentation
- `QUALITY_THRESHOLDS.md` - Configuration and tuning guide
- `schemas/vdp-2.0-enhanced.schema.json` - VDP structure specification
- `prompts/hook_genome_enhanced_v2.ko.txt` - Hook analysis prompts