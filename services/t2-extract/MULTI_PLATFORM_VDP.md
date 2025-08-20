# Multi-Platform VDP Analysis Guide

## 📋 Overview

This guide demonstrates how to use the same enhanced t2-extract analysis engine for comparative VDP analysis across **YouTube Shorts**, **Instagram Reels**, and **TikTok** videos.

**Key Benefits**:
- ✅ **Unified Analysis Engine**: Same two-pass VDP generation with density floors
- ✅ **Consistent Schema**: All platforms use `vdp-2.0-enhanced.schema.json`
- ✅ **Comparable Metrics**: Cross-platform density and hook quality analysis
- ✅ **Same Quality Gates**: Hook ≤3.0s, strength ≥0.70, scenes ≥4, shots ≥8

## 🎯 Platform Workflow Comparison

### YouTube Shorts (자동 처리)
```bash
# Automated pipeline: URL → yt-dlp → GCS → t2-extract → VDP
./upload-platform-universal.sh youtube "https://youtube.com/shorts/VIDEO_ID"
```

### Instagram Reels (수동 처리)
```bash
# Manual pipeline: MP4 + JSON → GCS → t2-extract → VDP
./upload-platform-universal.sh instagram video.mp4 metadata.json
```

### TikTok (수동 처리)
```bash
# Manual pipeline: MP4 + JSON → GCS → t2-extract → VDP
./upload-platform-universal.sh tiktok video.mp4 metadata.json
```

## 🔧 Platform-Specific Setup

### Instagram Metadata Template
Create `instagram_metadata.json`:
```json
{
  "platform": "instagram",
  "content_id": "UNIQUE_CONTENT_ID",
  "source_url": "https://instagram.com/p/POST_ID/",
  "creator": "username",
  "hashtags": ["#reels", "#viral"],
  "view_count": 0,
  "like_count": 0,
  "comment_count": 0,
  "share_count": 0,
  "upload_date": "2024-01-01",
  "video_origin": "Unknown",
  "cta_types": [],
  "original_sound": {
    "id": null,
    "title": null
  }
}
```

### TikTok Metadata Template
Create `tiktok_metadata.json`:
```json
{
  "platform": "tiktok",
  "content_id": "UNIQUE_CONTENT_ID",
  "source_url": "https://tiktok.com/@user/video/VIDEO_ID",
  "creator": "username",
  "hashtags": ["#fyp", "#viral", "#trending"],
  "view_count": 0,
  "like_count": 0,
  "comment_count": 0,
  "share_count": 0,
  "upload_date": "2024-01-01",
  "video_origin": "Unknown",
  "cta_types": [],
  "original_sound": {
    "id": "original_sound_id",
    "title": "Original Audio Title"
  }
}
```

## 🚀 Cross-Platform Analysis Examples

### Example 1: Same Content, Different Platforms
```bash
# YouTube Shorts version
./upload-platform-universal.sh youtube "https://youtube.com/shorts/ABC123"

# Instagram Reels version (manual upload)
./upload-platform-universal.sh instagram reels_version.mp4 instagram_meta.json

# TikTok version (manual upload)  
./upload-platform-universal.sh tiktok tiktok_version.mp4 tiktok_meta.json
```

### Example 2: Platform Performance Comparison
```bash
# Analyze viral content across platforms
echo "📊 Cross-Platform VDP Analysis Starting..."

# YouTube (automated)
YOUTUBE_VDP=$(./upload-platform-universal.sh youtube "https://youtube.com/shorts/VIRAL_ID")

# Instagram (manual)
INSTAGRAM_VDP=$(./upload-platform-universal.sh instagram viral_reels.mp4 ig_meta.json)

# TikTok (manual)
TIKTOK_VDP=$(./upload-platform-universal.sh tiktok viral_tiktok.mp4 tt_meta.json)

echo "✅ All platforms analyzed with unified VDP structure"
```

## 📊 Density Metrics Comparison

### Current Production Thresholds
All platforms use the same quality standards:

```bash
# Density Requirements (Applied to ALL platforms)
DENSITY_SCENES_MIN=4              # Minimum scenes for comprehensive analysis
DENSITY_MIN_SHOTS_PER_SCENE=2     # Minimum shots per scene
DENSITY_MIN_KF_PER_SHOT=3         # Minimum keyframes per shot

# Calculated Minimums
Total shots required: 8 (4 scenes × 2 shots/scene)
Total keyframes required: 24 (8 shots × 3 keyframes/shot)

# Hook Quality Gates
HOOK_MAX_START_SEC=3.0            # Maximum hook start time
HOOK_MIN_STRENGTH=0.70            # Minimum hook strength score
```

### Sample Analysis Results
```json
{
  "platform_comparison": {
    "youtube": {
      "scenes": 5,
      "total_shots": 12,
      "total_keyframes": 31,
      "hook_strength": 0.85,
      "hook_duration": 2.8
    },
    "instagram": {
      "scenes": 4,
      "total_shots": 9,
      "total_keyframes": 26,
      "hook_strength": 0.78,
      "hook_duration": 2.5
    },
    "tiktok": {
      "scenes": 6,
      "total_shots": 14,
      "total_keyframes": 35,
      "hook_strength": 0.92,
      "hook_duration": 1.8
    }
  }
}
```

## 🔍 Quality Validation Across Platforms

### Automated Quality Checks
The same validation logic applies to all platforms:

```bash
# Hook Quality Gates
if hook_start_sec <= 3.0 && hook_strength >= 0.70:
    ✅ Hook quality PASSED
else:
    ❌ Hook quality FAILED

# Density Floor Validation  
if scenes >= 4 && total_shots >= 8 && total_keyframes >= 24:
    ✅ Density floor PASSED
else:
    🔄 Triggering two-pass enhancement
```

### Platform-Specific Considerations

**YouTube Shorts**:
- Automated metadata extraction from URL
- Platform-specific hashtags and engagement metrics
- Original sound detection via YouTube API

**Instagram Reels**:
- Manual metadata input required
- Focus on visual storytelling metrics
- Instagram-specific engagement patterns

**TikTok**:
- Manual metadata input required
- Enhanced sound/music analysis
- TikTok-specific viral patterns and hashtags

## 🛠 Technical Implementation

### API Call Format (Unified)
All platforms use the same t2-extract endpoint:

```bash
curl -X POST "${T2_EXTRACT_URL}/api/vdp/extract-vertex" \
  -H "Content-Type: application/json" \
  -d '{
    "gcsUri": "gs://bucket/video.mp4",
    "meta": {
      "platform": "youtube|instagram|tiktok",
      "language": "ko"
    }
  }'
```

### VDP Output Structure (Identical)
All platforms generate the same enhanced VDP structure:

```json
{
  "content_id": "platform_specific_id",
  "metadata": {
    "platform": "youtube|instagram|tiktok",
    "source_url": "platform_specific_url",
    "hashtags": ["platform", "specific", "tags"]
  },
  "overall_analysis": {
    "hookGenome": {
      "start_sec": 0.0,
      "end_sec": 2.8,
      "pattern_code": "curiosity_gap",
      "strength_score": 0.85
    }
  },
  "scenes": [
    {
      "scene_id": "S01_Hook",
      "importance": "critical",
      "shots": [
        {
          "shot_id": "shot_001",
          "keyframes": [
            {"role": "start", "desc": "..."},
            {"role": "peak", "desc": "..."},
            {"role": "end", "desc": "..."}
          ]
        }
      ]
    }
  ]
}
```

## 📈 Comparative Analysis Benefits

### 1. Cross-Platform Hook Performance
```bash
# Compare hook effectiveness across platforms
echo "Hook Analysis Summary:"
echo "YouTube: ${youtube_hook_strength} (${youtube_hook_duration}s)"
echo "Instagram: ${instagram_hook_strength} (${instagram_hook_duration}s)"  
echo "TikTok: ${tiktok_hook_strength} (${tiktok_hook_duration}s)"
```

### 2. Platform-Specific Optimization
- **YouTube**: Optimize for longer hook windows (up to 3s)
- **Instagram**: Focus on visual composition and aesthetics
- **TikTok**: Emphasize rapid engagement and sound integration

### 3. Content Density Insights
- Compare narrative complexity across platforms
- Identify platform-specific storytelling patterns
- Optimize content structure for each platform's algorithm

## 🎯 Usage Recommendations

### For Content Creators
1. **Baseline Analysis**: Start with YouTube automated analysis
2. **Platform Adaptation**: Use same content, different platform metadata
3. **Performance Comparison**: Compare VDP metrics across platforms
4. **Optimization**: Adjust content based on platform-specific insights

### For Researchers
1. **Unified Dataset**: All platforms use same schema for easy comparison
2. **Statistical Analysis**: Compare density metrics across large datasets
3. **Platform Trends**: Identify platform-specific viral patterns
4. **Algorithm Insights**: Understand how different platforms process content

## 🔧 Quick Start Commands

```bash
# 1. Analyze YouTube Shorts (automated)
./upload-platform-universal.sh youtube "https://youtube.com/shorts/VIDEO_ID"

# 2. Prepare Instagram metadata
cp instagram_metadata_template.json my_instagram_meta.json
# Edit metadata with actual values

# 3. Analyze Instagram Reels  
./upload-platform-universal.sh instagram video.mp4 my_instagram_meta.json

# 4. Prepare TikTok metadata
cp tiktok_metadata_template.json my_tiktok_meta.json
# Edit metadata with actual values

# 5. Analyze TikTok
./upload-platform-universal.sh tiktok video.mp4 my_tiktok_meta.json

# 6. Compare results
echo "✅ All platforms analyzed with unified VDP structure"
echo "📊 Results available in out/ directory with platform prefixes"
```

## 📝 Notes

- **Same Engine**: All platforms use identical t2-extract analysis engine
- **Same Schema**: Unified `vdp-2.0-enhanced.schema.json` validation
- **Same Quality Gates**: Hook ≤3.0s, strength ≥0.70, density floors enforced
- **Different Input Methods**: URL (YouTube) vs File+Metadata (Instagram/TikTok)
- **Comparable Results**: Direct cross-platform VDP comparison enabled

**동일 엔진 + 동일 스키마로 강제했으니, 위 방식으로만 처리하면 NEW와 동일 기준으로 분석된다.** ✅