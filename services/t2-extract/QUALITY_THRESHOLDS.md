# VDP Quality Thresholds Configuration

## Overview

The T2-Extract service implements configurable quality thresholds to ensure VDP (Video Data Package) generation meets or exceeds baseline quality standards. These thresholds are designed to maintain consistency with "OLD" quality levels while providing flexibility for future adjustments.

## Configuration Variables

### Density Thresholds

#### `DENSITY_SCENES_MIN` (Default: 4)
- **Purpose**: Minimum number of scenes required in VDP analysis
- **Rationale**: Ensures comprehensive narrative segmentation 
- **Impact**: Scenes below this threshold trigger retry with enhanced prompts
- **Adjustment Guidelines**: 
  - Increase for more detailed analysis (5-6 for complex content)
  - Decrease only for very short-form content (3 minimum recommended)

#### `DENSITY_MIN_SHOTS_PER_SCENE` (Default: 2)
- **Purpose**: Minimum shots per scene for adequate visual analysis
- **Rationale**: Provides sufficient granularity for camera movement and composition analysis
- **Impact**: Combined with `DENSITY_SCENES_MIN` to calculate total shot minimum
- **Calculated Minimum**: `DENSITY_SCENES_MIN × DENSITY_MIN_SHOTS_PER_SCENE = 8 total shots`
- **Adjustment Guidelines**:
  - Increase to 3+ for visually complex content
  - Keep at 2 for simple, static scenes

#### `DENSITY_MIN_KF_PER_SHOT` (Default: 3)
- **Purpose**: Minimum keyframes per shot for temporal analysis
- **Rationale**: Captures start/middle/end states of each visual sequence
- **Impact**: Ensures detailed temporal breakdown for each shot
- **Calculated Minimum**: `8 shots × 3 keyframes = 24 total keyframes`
- **Adjustment Guidelines**:
  - Increase to 4+ for fast-paced, dynamic content
  - Keep at 3 for standard analysis depth

### Hook Gate Thresholds

#### `HOOK_MAX_START_SEC` (Default: 3.0)
- **Purpose**: Maximum allowable hook start time (seconds)
- **Rationale**: Ensures hooks engage viewers within critical opening window
- **Impact**: VDP fails quality gates if hook starts after this threshold
- **Adjustment Guidelines**:
  - Platform-specific adjustments:
    - TikTok: Consider 2.5s for faster attention cycles
    - YouTube Shorts: 3.0s standard
    - Instagram Reels: 2.5-3.0s depending on content type

#### `HOOK_MIN_STRENGTH` (Default: 0.70)
- **Purpose**: Minimum hook strength score (0.0-1.0 scale)
- **Rationale**: Ensures hooks have sufficient engagement potential
- **Impact**: VDP fails quality gates if hook strength below threshold
- **Adjustment Guidelines**:
  - Increase to 0.75-0.80 for premium content standards
  - Decrease to 0.65 only for experimental or niche content

## Quality Calculation Matrix

### Current Baseline (Default Configuration)
```
Minimum Requirements:
├── Scenes: 4
├── Total Shots: 8 (4 scenes × 2 shots/scene)
├── Total Keyframes: 24 (8 shots × 3 keyframes/shot)
├── Hook Start: ≤ 3.0 seconds
└── Hook Strength: ≥ 0.70

Quality Validation:
├── Scene-level: Each scene must have ≥2 shots
├── Shot-level: Each shot must have ≥3 keyframes
├── Composition: Each shot must have composition.notes
└── Narrative: Each scene summary ≥90 characters
```

### Performance Impact

| Configuration | Total Checks | Processing Impact | Quality Level |
|---------------|--------------|-------------------|---------------|
| Minimal (3,2,2) | 12 keyframes | Low | Basic |
| Standard (4,2,3) | 24 keyframes | Medium | Production |
| Enhanced (5,3,4) | 60 keyframes | High | Premium |

## Adjustment Strategies

### Conservative Adjustments
- Change one variable at a time
- Test with representative content samples
- Monitor processing time impact
- Validate against existing VDP quality standards

### Content-Type Specific Tuning

#### High-Energy Content (Sports, Action)
```bash
export DENSITY_SCENES_MIN=5
export DENSITY_MIN_SHOTS_PER_SCENE=3
export DENSITY_MIN_KF_PER_SHOT=4
export HOOK_MAX_START_SEC=2.5
```

#### Educational/Tutorial Content
```bash
export DENSITY_SCENES_MIN=4
export DENSITY_MIN_SHOTS_PER_SCENE=2
export DENSITY_MIN_KF_PER_SHOT=3
export HOOK_MAX_START_SEC=3.5
```

#### Quick Entertainment (Memes, Reactions)
```bash
export DENSITY_SCENES_MIN=3
export DENSITY_MIN_SHOTS_PER_SCENE=2
export DENSITY_MIN_KF_PER_SHOT=3
export HOOK_MAX_START_SEC=2.0
```

## Monitoring and Validation

### Quality Metrics to Track
- `verbosity_floor_passed` rate
- Average retry count per VDP
- Hook quality gate pass rate
- Processing time impact

### Warning Indicators
- Retry rate > 20%
- Processing time > 60s average
- Hook gate failure rate > 10%
- Verbosity floor failure > 15%

## Implementation Notes

### Auto-Fix Retry Logic
When verbosity floor validation fails, the system automatically:
1. Enhances prompt with specific density requirements
2. Includes calculated target values in prompt
3. Retries once with stricter instructions
4. Logs quality metrics for monitoring

### Quality Gate Integration
```javascript
// Calculated minimums used throughout codebase
const targetShots = DENSITY_SCENES_MIN * DENSITY_MIN_SHOTS_PER_SCENE;
const targetKeyframes = targetShots * DENSITY_MIN_KF_PER_SHOT;

// Validation logic
const verbosityPassed = scenes.length >= DENSITY_SCENES_MIN && 
                       shotCount >= targetShots && 
                       keyframeCount >= targetKeyframes;
```

## Future Considerations

### Dynamic Threshold Adjustment
- Platform-specific configurations
- Content-type based automatic adjustment
- A/B testing framework for threshold optimization
- Machine learning based threshold recommendations

### Advanced Quality Metrics
- Semantic coherence scoring
- Visual complexity assessment
- Temporal flow analysis
- Cross-platform optimization

## Related Documentation
- `/schemas/vdp-2.0-enhanced.schema.json` - VDP structure requirements
- `/prompts/hook_genome_enhanced_v2.ko.txt` - Hook analysis prompts
- `CLAUDE.md` - Overall service architecture and quality gates