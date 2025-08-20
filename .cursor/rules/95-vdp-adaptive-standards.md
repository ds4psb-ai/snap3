# VDP Adaptive Standards & Google VDP Integration

## Adaptive Mode Requirements

### S-Mode (Short ≤9s)
- **minScenes**: 1
- **minShots**: 1  
- **minShotsPerScene**: 1
- **minKfPerShot**: 2
- **hookStartMaxFactor**: 0.4 (≤0.4×duration)
- **minCompositionNotes**: 2

### M-Mode (Medium 10-20s)
- **minScenes**: 3
- **minShots**: 6
- **minShotsPerScene**: 2
- **minKfPerShot**: 3
- **hookStartMaxFactor**: 1.0 (≤3s)
- **minCompositionNotes**: 2

### L-Mode (Long >20s)
- **minScenes**: 5
- **minShots**: 10
- **minShotsPerScene**: 2
- **minKfPerShot**: 3
- **hookStartMaxFactor**: 1.0 (≤3s)
- **minCompositionNotes**: 2

## Google VDP Quality Standards

### Camera Metadata Completeness
**Required Enums** (no "unknown" values):
- `camera.shot` ∈ {ECU, CU, MCU, MS, MLS, WS, EWS}
- `camera.angle` ∈ {eye, high, low, overhead, dutch}
- `camera.move` ∈ {static, pan, tilt, dolly, truck, handheld, crane, zoom}

### Composition Notes Requirements (2+ per shot)
**Required categories**:
1. **Shooting technique**: "static ECU with centered framing"
2. **Lighting/color**: "natural daylight, warm tones"
3. **Framing**: "rule of thirds, subject left-positioned"

### Audio Events Structure
**Required fields**:
- `timestamp`: precise seconds (float)
- `event`: music_starts|music_stops|narration_starts|critical_sfx
- `intensity`: High|Medium|Low
- `description`: specific audio change description

## Two-Pass Generation System

### Pass-1: Initial VDP Generation
- Gemini 2.5 Pro based basic VDP structure
- Hook Genome integration (start_sec, pattern_code, strength_score)
- Basic scenes/shots/keyframes structure

### Pass-2: Google VDP Standard Validation & Enhancement
**needsRepair() multi-layer validation**:
1. **Total validation**: total scenes/shots/keyframes count
2. **Scene validation**: shots per scene ≥ minShotsPerScene
3. **Shot validation**: composition.notes count ≥ minCompositionNotes
4. **Metadata validation**: camera completeness (no "unknown")

**repairDensity() mode-specific enhancement**:
- Auto-generate missing structural elements
- Add detailed information per Google VDP standards
- Maintain Hook Genome consistency

## Error Codes
- `GOOGLE_VDP_DENSITY_FAILED` — Mode density insufficient. Run Pass-2 enhancement
- `COMPOSITION_NOTES_INSUFFICIENT` — <2 composition.notes per shot. Add shooting technique descriptions
- `CAMERA_METADATA_INCOMPLETE` — "unknown" camera values. Complete metadata required

## Auto-attach Triggers
This rule auto-attaches when working on:
- VDP generation and processing
- Google VDP quality standards implementation
- Adaptive mode requirements
- Two-pass generation system
- Camera metadata validation
- Composition notes generation
- Audio events structuring
- Hook Genome integration
- VDP schema validation
- Quality gate implementation

## Reference Files
- @VDP_ADAPTIVE_STANDARDS.md
- @vdp.schema.json
- @scripts/validate-hook-gate.sh
- @scripts/validate-vdp-schema.sh

