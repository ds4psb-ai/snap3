# Evidence Generator - Audio Fingerprints & Brand Detection

Complete evidence generation system for VDP enhancement with audio fingerprints and brand/product detection.

## Overview

The Evidence Generator creates comprehensive Evidence Packs containing:
- **Audio Fingerprints**: ChromaPrint-based signatures from 3 strategic positions (start/mid/end)
- **Brand Detection**: Lexicon-based brand and product mention extraction
- **Quality Metrics**: Confidence scores and trust metrics for VDP integration

## Architecture

**Role**: External data collection/preprocessing (Jobs T2 terminal)
**Output**: Evidence Packs uploaded to GCS for Main2 T2 VDP merger integration
**Dependencies**: ffmpeg, chromaprint (fpcalc), jq, Node.js

## Components

### 1. Audio Fingerprint System
- `audio-fingerprint-enhanced.sh` - Enhanced 3-sample fingerprint generator
- Uses ChromaPrint 1.5.1 for high-quality audio signatures
- Extracts 10-second samples from start/middle/end positions
- Generates cluster IDs for BGM matching

### 2. Brand/Product Detection
- `brand-lexicon.json` - Comprehensive brand and product dictionary
- `product-evidence.mjs` - VDP text harvesting and lexicon matching
- Supports OCR text, scene descriptions, metadata analysis
- Rule-based normalization with confidence scoring

### 3. Evidence Pack Generation
- `evidence-pack-generator.sh` - Unified evidence pack creator
- `evidence-uploader.sh` - GCS upload with auto-detection
- Combines audio + brand evidence with quality metrics
- Ready for Main2 T2 VDP integration

## Installation

### Prerequisites
```bash
# macOS
brew install ffmpeg chromaprint jq

# Ubuntu/Debian  
sudo apt-get install ffmpeg chromaprint jq
```

### Setup
```bash
cd /Users/ted/snap3/jobs
# Evidence tools are ready to use
```

## Usage

### Quick Evidence Generation
```bash
# Complete evidence pack for content
npm run evidence:upload CONTENT_ID

# Example with auto-detection
npm run evidence:upload 55e6ScXfiZc
```

### Individual Components
```bash
# Audio fingerprint only
npm run evidence:audio video.mp4 CONTENT_ID output.json

# Brand detection only (requires VDP)
npm run evidence:brands vdp.json evidence.json

# Complete evidence pack
npm run evidence:pack video.mp4 metadata.json output_dir
```

### Manual Workflow
```bash
# 1. Generate audio fingerprint
./evidence-generator/audio-fingerprint-enhanced.sh video.mp4 C001

# 2. Extract brand mentions (from VDP)
cd evidence-generator
node product-evidence.mjs ../out/vdp/C001.json ../out/meta/C001.product.evidence.json

# 3. Upload to GCS
./evidence-generator/evidence-uploader.sh C001
```

## Output Format

### Audio Fingerprint
```json
{
  "content_id": "55e6ScXfiZc",
  "audio": {
    "provider": "chromaprint",
    "version": 1,
    "duration_sec": 30,
    "fingerprints": [
      {"t": 0, "fp": "hash_data", "c": 1.0},
      {"t": 15, "fp": "hash_data", "c": 1.0},
      {"t": 20, "fp": "hash_data", "c": 1.0}
    ],
    "same_bgm_confidence": 0.95,
    "same_bgm_cluster_id": "bgm:a1b2c3d4e5f6"
  }
}
```

### Product Evidence
```json
{
  "product_mentions": [
    {
      "brand": "apple",
      "product_family": null,
      "confidence": 0.8,
      "evidence": [
        {"type": "ocr", "text": "iPhone 15 Pro", "pos": 0}
      ]
    }
  ],
  "brand_detection_metrics": {
    "ocr_hits": 1,
    "normalized_score": 0.7
  }
}
```

## Quality Metrics

### Audio Quality
- **BGM Confidence**: 0.6-1.0 (higher = more consistent audio signature)
- **Coverage**: Percentage of video analyzed (30s samples / total duration)
- **Cluster ID**: Unique identifier for BGM matching across videos

### Brand Detection Quality  
- **Detection Score**: 0.0-1.0 (OCR-weighted confidence)
- **Mention Count**: Number of brand/product references found
- **Evidence Quality**: Text source and position tracking

## GCS Integration

### Upload Paths
- Audio: `gs://tough-variety-raw/raw/vdp/evidence/{CONTENT_ID}.audio.fp.json`
- Products: `gs://tough-variety-raw/raw/vdp/evidence/{CONTENT_ID}.product.evidence.json`

### Main2 T2 Integration
Evidence packs are automatically available for VDP merger:
1. Main2 T2 fetches evidence from GCS during VDP generation
2. Audio fingerprints enhance trust scores and metadata
3. Brand detection provides product placement insights
4. Combined evidence improves VDP quality metrics

## Brand Lexicon

Supports 18 major brands and 17 product categories:
- **Brands**: Apple, Samsung, Google, Nike, Adidas, Tesla, etc.
- **Products**: Smartphones, laptops, sneakers, makeup, etc.
- **Aliases**: Multiple language support (English/Korean)

### Extending the Lexicon
Edit `brand-lexicon.json` to add new brands or products:
```json
{
  "brands": [
    {"key": "new_brand", "aliases": ["brand name", "브랜드명", "alias"]}
  ],
  "products": [
    {"key": "new_product", "aliases": ["product name", "제품명"]}
  ]
}
```

## Error Handling

- **Missing Tools**: Automatic dependency checking with installation guidance
- **File Not Found**: Auto-detection with fallback strategies
- **GCS Errors**: Clear error messages with retry suggestions
- **Quality Issues**: Warning alerts for low-confidence results

## Performance

- **Audio Processing**: ~30s for 10-minute video
- **Brand Detection**: ~5s for average VDP
- **Total Time**: ~1-2 minutes per video
- **File Sizes**: ~2-10KB per evidence file

## Jobs T2 Compliance

✅ **External Data Collection**: Audio signatures and brand detection
✅ **No Server Calls**: Pure preprocessing and GCS upload
✅ **Separation of Concerns**: Evidence generation separate from VDP creation
✅ **Standard Output**: JSON format ready for Main2 T2 integration