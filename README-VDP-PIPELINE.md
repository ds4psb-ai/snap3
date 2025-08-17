# VDP Pipeline: YouTube/Shorts → Extract → Gold

Complete one-shot pipeline for YouTube/Shorts VDP extraction with Vertex AI 2.5 Pro structured output.

## 🎯 Architecture Overview

```
YouTube/Shorts URL → Download → Upload (GCS) → Extract (T2+Vertex) → Gold (JSONL) → BigQuery
```

### Pipeline Components

1. **Main T1**: yt-dlp download + GCS upload + T2 extraction calls
2. **Storage T4**: upload-id based Firestore sequencer (atomic content-id assignment)  
3. **Jobs T2**: Vertex AI Video understanding + Gemini 2.5 Pro + structured output
4. **Exports T3**: GOLD JSONL commit → BigQuery ingestion

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Run the environment setup script
./scripts/setup-vdp-environment.sh

# Or manually set required variables:
export GCP_PROJECT="tough-variety-466003-c5"
export GCP_REGION="us-central1" 
export RAW_BUCKET="tough-variety-raw"
export T2_URL="http://localhost:3001/api/v1/extract"
export YOUTUBE_API_KEY="your-youtube-api-key"
```

### 2. Single Video Processing

```bash
# Process a single YouTube Shorts URL
./scripts/vdp-oneshot-pipeline.sh "https://www.youtube.com/shorts/6_I2FmT1mbY"
```

### 3. Batch Processing (Parallel)

```bash
# Process multiple URLs in parallel
./scripts/vdp-parallel-batch.sh \
  "https://www.youtube.com/shorts/6_I2FmT1mbY" \
  "https://www.youtube.com/shorts/WrnM0FRLnqA"

# Or from file
./scripts/vdp-parallel-batch.sh -f sample-urls.txt
```

## 📋 Scripts Reference

### `vdp-oneshot-pipeline.sh`

Complete pipeline for single video:
- Downloads video with yt-dlp (best quality ≤1080p + audio merge)
- Collects YouTube statistics and top comments via API
- Generates unified upload-id for tracking
- Uploads to GCS with comprehensive metadata headers
- Calls T2 extraction API with Vertex AI 2.5 Pro + structured output
- Cleans up local files

### `vdp-parallel-batch.sh`

Parallel processing for multiple videos:
- Supports URL list as arguments or from file
- Configurable parallel job limit (default: 3)
- Individual logging per video processing
- Success/failure tracking and reporting
- Safe error handling (failures don't block other jobs)

### `setup-vdp-environment.sh`

Environment configuration and validation:
- Interactive setup of all required environment variables
- Dependency validation (yt-dlp, ffmpeg, gsutil, jq, curl)
- GCP authentication verification
- Bucket access validation
- YouTube API key testing
- T2 service connectivity check

## 🔧 Dependencies

### Required Tools
```bash
# Install via Homebrew (macOS)
brew install yt-dlp ffmpeg jq curl

# Google Cloud SDK
# Install from: https://cloud.google.com/sdk
```

### Required Environment Variables
- `GCP_PROJECT`: GCP project ID
- `RAW_BUCKET`: GCS bucket for raw video storage
- `YOUTUBE_API_KEY`: YouTube Data API v3 key
- `T2_URL`: T2 extraction service endpoint (optional, defaults to localhost:3001)
- `GCP_REGION`: GCP region (optional, defaults to us-central1)

## 🎬 Pipeline Flow Details

### 1. Video Download
- Uses yt-dlp with optimized format selection
- Format: `bv*[height<=1080][fps<=60]+ba/b[height<=1080]`
- Merges best video + best audio to MP4
- Retry logic: 4 connections, 10 retries, infinite fragment retries

### 2. Metadata Collection
- YouTube Data API v3 for statistics (views, likes, comments count)
- Top 5 comments collection with relevance ranking
- Timestamp and author information
- Control character sanitization for safe JSON

### 3. GCS Upload
- Unified upload-id generation with uuidgen
- Comprehensive metadata headers:
  - `x-goog-meta-vdp-platform`: youtube
  - `x-goog-meta-vdp-source-url`: Original URL
  - `x-goog-meta-vdp-content-id`: YouTube video ID
  - `x-goog-meta-vdp-upload-id`: Tracking UUID
  - `x-goog-meta-vdp-view-count`: View statistics
  - `x-goog-meta-vdp-like-count`: Like statistics
  - `x-goog-meta-vdp-comment-count`: Comment statistics

### 4. T2 Extraction API Call
- Vertex AI Gemini 2.5 Pro model for high-quality analysis
- Structured output with JSON schema enforcement
- Response schema includes:
  - `content_id`: Video identifier
  - `platform`: Source platform
  - `video_origin`: Real-Footage vs AI-Generated classification
  - `overall_analysis`: Emotional arc, sentiment, meme potential
  - `scenes[]`: Narrative roles, timing, visual/audio summaries

### 5. Error Handling
- Non-blocking comment collection (continues if API fails)
- Comprehensive error checking at each step
- Detailed logging with timestamps
- Graceful cleanup of local files

## 📊 Structured Output Schema

The T2 extraction uses enforced JSON schema for consistent VDP format:

```json
{
  "type": "object",
  "properties": {
    "content_id": {"type": "string"},
    "platform": {"type": "string"},
    "video_origin": {"type": "string", "enum": ["Real-Footage", "AI-Generated"]},
    "overall_analysis": {
      "type": "object",
      "properties": {
        "emotional_arc": {"type": "string"},
        "overall_sentiment": {"type": "string"},
        "potential_meme_template": {"type": "boolean"},
        "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0}
      },
      "required": ["emotional_arc", "overall_sentiment", "confidence"]
    },
    "scenes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "narrative_role": {"type": "string", "enum": ["Hook", "Demonstration", "Problem_Solution", "Conclusion"]},
          "duration_sec": {"type": "number", "minimum": 0.1, "maximum": 10.0},
          "visual_summary": {"type": "string"},
          "audio_summary": {"type": "string"}
        },
        "required": ["narrative_role", "duration_sec", "visual_summary"]
      },
      "minItems": 2,
      "maxItems": 4
    }
  },
  "required": ["content_id", "platform", "video_origin", "overall_analysis", "scenes"]
}
```

## 🔍 Monitoring & Debugging

### Individual Job Monitoring
```bash
# Monitor T2 extraction job
curl -s ${T2_URL%/*}/jobs/${JOB_ID} | jq .
```

### Batch Processing Logs
```bash
# View logs from parallel processing
ls -la vdp-batch-*.log
tail -f vdp-batch-$(date +%Y%m%d)-*.log
```

### GCS Verification
```bash
# Check uploaded files
gsutil ls gs://${RAW_BUCKET}/raw/ingest/

# View file metadata
gsutil stat gs://${RAW_BUCKET}/raw/ingest/${VIDEO_ID}.mp4
```

## 🎯 Integration Points

### T4 Storage Sequencer
- Atomic content-id assignment via Firestore
- upload-id tracking for duplicate detection
- Handles concurrent uploads safely

### T2 Jobs Service
- Vertex AI Video Understanding integration
- Gemini 2.5 Pro for high-quality analysis
- Structured output enforcement
- Async job processing with 202 responses

### T3 Exports
- GOLD bucket JSONL format
- BigQuery automatic ingestion
- Evidence pack generation

## ⚠️ Quality Improvements vs Previous

### Model Upgrade
- **Flash (speed) → 2.5 Pro (precision)**: Higher quality video analysis
- Official Vertex AI Video Understanding support

### Output Format
- **Prompt rules → Structured output**: JSON schema enforcement
- `response_mime_type: application/json` + `response_schema`

### Input Method
- **Base64 inline → Files API**: Better handling of large videos
- Stable file_uri references for reuse

### Metadata Collection
- **Comments only → Full YouTube API**: Complete statistics integration
- Separate API calls for quantitative metrics

## 🔗 Related Documentation

- [VDP Schema Reference](./data/vdp-samples/)
- [T2 Jobs API Documentation](./src/app/api/jobs/)
- [Storage T4 Integration](./src/lib/storage/)
- [Vertex AI Video Understanding](https://cloud.google.com/vertex-ai/docs/multimodal/video-understanding)