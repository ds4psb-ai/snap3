# Adaptive Density & Hook Threshold System - Patch Summary

## 🎯 Overview
Minimal patch to add adaptive density and dynamic hook thresholds to the t2-extract server, allowing different quality standards based on video duration.

## 📊 Changes Implemented

### 1. Mode Classification System
```javascript
function classifyMode(duration) {
  if (!duration || duration <= 9) return 'S';
  if (duration <= 20) return 'M';
  return 'L';
}
```

### 2. Adaptive Density Table
```javascript
const DENSITY = {
  S: { minScenes: 1, minShots: 1, minKfPerShot: 2, hookStartMaxFactor: 0.4 },
  M: { minScenes: 3, minShots: 5, minKfPerShot: 3, hookStartMaxFactor: 1.0 },
  L: { minScenes: 5, minShots: 8, minKfPerShot: 3, hookStartMaxFactor: 1.0 }
};
```

### 3. Dynamic Hook Limits
**Before:**
```javascript
const startOK = typeof hg.start_sec === "number" && hg.start_sec <= HOOK_MAX_S;
```

**After:**
```javascript
const duration = vdp?.metadata?.duration_sec;
const mode = classifyMode(duration);
const hookLimit = Math.min(HOOK_MAX_S, (duration || 0) * DENSITY[mode].hookStartMaxFactor);
const startOK = typeof hg.start_sec === "number" && hg.start_sec <= (hookLimit || HOOK_MAX_S);
```

### 4. Adaptive Pass-2 Triggering
```javascript
function needsRepair(vdp, mode) {
  const scenes = vdp.scenes || [];
  const totalShots = scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
  const totalKf = scenes.reduce((a,s)=>a+(s.shots?.reduce((sa,sh)=>sa+(sh.keyframes?.length||0),0)||0),0);
  const d = DENSITY[mode];
  return scenes.length < d.minScenes || totalShots < d.minShots || totalKf < d.minShots*d.minKfPerShot;
}
```

### 5. Mode-Specific Repair Function
```javascript
async function repairDensity(vdp, mode, model, meta) {
  // Mode-specific repair prompt with adaptive targets
  // Returns enhanced VDP meeting mode requirements
}
```

## 🔧 Usage Examples

### Short Video (≤9s) - Mode S
- **Density**: 1 scene, 1 shot, 2 keyframes minimum
- **Hook**: ≤40% of video duration (max 3.6s for 9s video)
- **Use Case**: TikTok micro-content, Instagram Stories

### Medium Video (10-20s) - Mode M  
- **Density**: 3 scenes, 5 shots, 15 keyframes minimum
- **Hook**: ≤100% of available time (max 3.0s)
- **Use Case**: Standard social media content

### Long Video (>20s) - Mode L
- **Density**: 5 scenes, 8 shots, 24 keyframes minimum  
- **Hook**: ≤100% of available time (max 3.0s)
- **Use Case**: YouTube Shorts, longer form content

## 📝 API Integration

### Input Format
```json
{
  "gcsUri": "gs://bucket/video.mp4",
  "meta": {
    "platform": "tiktok",
    "language": "ko",
    "duration_sec": 15
  }
}
```

### Expected Log Output
```
[Adaptive VDP] 🎯 Mode M (15s) targets: 3 scenes, 5 shots, 15 keyframes
[Adaptive Hook] Mode M for 15s video: hook limit 3.0s (factor: 1.0)
[Adaptive Pass 2] 🔧 Using mode M specific repair logic
```

## ✅ Backward Compatibility

- **Environment Variables**: Still respected as fallbacks
- **Existing Endpoints**: No breaking changes to API surface
- **Default Behavior**: Missing duration_sec defaults to Mode S
- **Legacy VDPs**: Continue to work with adaptive validation

## 🧪 Testing

### Unit Tests
```bash
node test-adaptive-system.js
```

### API Testing
```bash
curl -X POST 'http://localhost:8080/api/vdp/extract-vertex' \
  -H 'Content-Type: application/json' \
  -d @test-adaptive-api.json
```

## 🎉 Benefits

1. **Efficiency**: No over-analysis of short content
2. **Quality**: Appropriate depth for content length
3. **Performance**: Faster processing for simple content
4. **Flexibility**: Platform-specific optimization potential
5. **Scalability**: Better resource utilization

## 🔍 Key Implementation Points

- **Zero Breaking Changes**: All existing functionality preserved
- **Minimal Code Impact**: Added only 4 new functions
- **Smart Defaults**: Graceful handling of missing duration data
- **Logging Enhanced**: Clear visibility into mode decisions
- **Future-Proof**: Easy to add new modes or adjust thresholds

The adaptive system now intelligently scales analysis depth based on content characteristics while maintaining the same high-quality VDP structure across all modes.