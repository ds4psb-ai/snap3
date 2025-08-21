# VDP Quality Check System

Comprehensive quality validation system for VDP pipeline to catch common issues like "음성 없음", "불완전 JSON", "top_comments 누락" before processing.

## 🎯 Purpose

Automated quality gates to ensure:
- ✅ Video files have proper audio tracks
- ✅ JSON follows VDP schema exactly  
- ✅ Required fields like top_comments are present
- ✅ Data integrity and BigQuery JSONL compatibility

## 🔧 Components

### 1. JSON Schema (`schemas/vdp.schema.json`)
- Comprehensive VDP structure validation
- JSON Schema 2020-12 compliant
- Enforces field types, ranges, and required properties
- BigQuery JSONL compatibility checks

### 2. Quality Check Script (`scripts/quality-check.sh`)
Complete validation pipeline checking:

#### 📹 Video Analysis (ffprobe)
- Audio track presence and count
- Video duration and resolution
- Codec information and stream details

#### 📄 JSON Schema Validation (ajv)
- Structure validation against VDP schema
- Type checking and format validation
- Required field enforcement

#### 📋 Content Validation
- `top_comments` array format and size (≤5 items)
- Core sections presence (metadata, overall_analysis, scenes)
- Scenes count validation (2-4 scenes)
- Confidence scores range (0.0-1.0)
- Metadata number validation (non-negative integers)

#### 🔐 Data Integrity
- Content ID and Upload ID presence
- Timestamp format validation
- BigQuery JSONL compatibility

### 3. Standalone Validator (`scripts/validate-vdp-standalone.sh`)
- JSON-only validation without requiring video files
- Batch processing support for multiple files
- Detailed reporting with success/failure counts

## 🚀 Usage

### Integrated Pipeline Quality Checks
Quality checks are automatically integrated into VDP pipeline:

```bash
# Single video (includes automatic quality check)
./scripts/vdp-oneshot-pipeline.sh "https://www.youtube.com/shorts/VIDEO_ID"

# Parallel batch (quality checks per video)
./scripts/vdp-parallel-batch.sh -f sample-urls.txt
```

### Manual Quality Validation

```bash
# Complete quality check (video + JSON)
./scripts/quality-check.sh video.mp4 video.vdp.json
npm run quality:check video.mp4 video.vdp.json

# JSON-only validation
./scripts/validate-vdp-standalone.sh *.vdp.json
npm run quality:validate *.vdp.json

# Schema validation only
npx ajv -s schemas/vdp.schema.json -d video.vdp.json
```

### Batch Validation

```bash
# Validate all VDP files in directory
./scripts/validate-vdp-standalone.sh /path/to/vdp-files/*.json

# Validate specific files
./scripts/validate-vdp-standalone.sh file1.vdp.json file2.vdp.json file3.vdp.json
```

## 🔍 Quality Check Details

### Video Quality Checks
```bash
🔊 Audio Track Validation:
✅ Audio tracks found: 1
✅ Video duration: 8.5s (within normal range)  
✅ Video resolution: 1920x1080
```

### JSON Schema Validation
```bash
🔍 Validating JSON structure against schema...
✅ JSON schema validation passed

💬 Top Comments Validation:
✅ top_comments is valid array with 3 items
✅ All comments have required text and author fields

🏗️ Core Structure Validation:
✅ Section 'metadata' present
✅ Section 'overall_analysis' present  
✅ Section 'scenes' present
```

### Data Integrity Checks
```bash
🔐 Data Integrity Checks:
✅ Content ID: 6_I2FmT1mbY
✅ Upload ID: 12345678-1234-1234-1234-123456789012
✅ Ingestion timestamp: 2025-01-14T10:30:00Z

📊 BigQuery JSONL Compatibility:
✅ JSON can be converted to JSONL format
✅ No embedded newlines found
```

## 🛡️ Error Detection

### Common Issues Caught

#### 🔇 Audio Issues
```
❌ No audio tracks found
⚠️ Recommendation: Re-encode with audio using:
   ffmpeg -i input.mp4 -c:v copy -c:a aac output.mp4
```

#### 📄 JSON Structure Issues
```
❌ JSON schema validation failed
❌ top_comments must be array with ≤5 items
❌ Missing required sections: metadata, overall_analysis
❌ Scenes count (1) must be between 2-4
```

#### 🔢 Data Validation Issues
```
❌ Invalid confidence score: 1.5 (must be 0.0-1.0)
❌ Invalid view count: -100
❌ Missing content_id
❌ JSON contains embedded newlines (will break JSONL)
```

### Pipeline Integration
Quality checks are automatically triggered in the VDP pipeline at Step 6.5:

```bash
🔍 Running quality checks...
✅ Quality checks passed
📤 Uploading to GCS with unified upload-id...
```

If quality checks fail, the pipeline aborts before upload:
```bash
🔍 Running quality checks...
❌ Quality check failed - aborting pipeline
```

## 📊 Output Formats

### Success Output
```bash
🎉 Quality Check Complete!
✅ All quality checks passed successfully

📋 Summary:
  - Video: 1 audio track(s), 1920x1080, 8.5s duration
  - JSON: Valid schema, 3 scenes, 3 comments
  - Metadata: 12540 views, 856 likes, 43 comments
  - IDs: Content=6_I2FmT1mbY, Upload=12345678-1234-1234-1234-123456789012
  - BigQuery: JSONL compatible

🚀 Ready for pipeline processing and BigQuery ingestion
```

### Batch Validation Summary
```bash
📊 Validation Summary
Total files: 5
✅ Successful: 4
❌ Failed: 1

❌ Failed files:
  - corrupted-video.vdp.json
```

## 🔧 Dependencies

### Required Tools
- `ffprobe` (from ffmpeg) - Video analysis
- `ajv-cli` - JSON schema validation  
- `jq` - JSON processing
- `bc` - Floating point arithmetic

### Installation
```bash
# Install media tools
brew install ffmpeg jq

# Install validation tools (already done in setup)
npm i -D ajv ajv-formats ajv-cli
```

## 📝 Integration with npm Scripts

Added npm scripts for easy access:

```json
{
  "scripts": {
    "quality:check": "./scripts/quality-check.sh",
    "quality:validate": "./scripts/validate-vdp-standalone.sh"
  }
}
```

## 🎯 Benefits

### Pipeline Reliability
- **Early Detection**: Catch issues before GCS upload and T2 processing
- **Cost Savings**: Avoid processing invalid files
- **Consistent Quality**: Enforce uniform VDP structure

### BigQuery Compatibility  
- **JSONL Validation**: Ensure `bq load` compatibility
- **Schema Compliance**: Match BigQuery table schema
- **Data Integrity**: Prevent ingestion failures

### Development Efficiency
- **Automated Checks**: No manual validation needed
- **Clear Error Messages**: Specific issue identification
- **Batch Processing**: Handle multiple files efficiently

## 🔄 Integration Points

- **VDP Pipeline**: Automatic quality gates in oneshot and parallel scripts
- **CI/CD**: Can be integrated into automated testing
- **Development**: Manual validation during development
- **BigQuery**: Pre-ingestion validation for data quality

This quality system ensures that all VDP files meet the required standards before entering the processing pipeline, preventing common issues and ensuring reliable BigQuery ingestion.