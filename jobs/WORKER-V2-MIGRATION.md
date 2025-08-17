# Worker v2 Migration Guide - Platform-Segmented Architecture

## 🔄 Architecture Changes

### Before (v1): Flat Structure
```
gs://tough-variety-raw/ingest/requests/
├── request1.json
├── request2.json
└── request3.json
```

### After (v2): Platform-Segmented Structure
```
gs://tough-variety-raw/ingest/requests/
├── youtube/
│   ├── video1.json
│   └── video2.json
├── instagram/
│   ├── post1.json
│   └── post2.json
└── tiktok/
    ├── video1.json
    └── video2.json
```

## 🎯 Key Improvements

### 1. Platform-Specific Polling
- **v1**: Single directory polling with platform detection in processing
- **v2**: Platform-segmented polling prevents cross-platform contamination

### 2. Content Key Validation
- **Format**: `{platform}:{content_id}`
- **Validation**: Platform normalization (case-insensitive)
- **Duplicate Prevention**: Platform-specific `.done` markers

### 3. Platform-Specific GCS Paths
- **Input**: `gs://bucket/raw/input/{platform}/{content_id}.mp4`
- **Evidence**: `gs://bucket/raw/vdp/evidence/{platform}/{content_id}.*`
- **Staging**: `gs://bucket/staging/social_metadata/{platform}/{content_id}.json`

### 4. Processing Logic
- **YouTube**: Full pipeline (download → Evidence Pack → VDP generation)
- **Instagram/TikTok**: Metadata-only staging (no video download)

## 🚀 Deployment

### Current npm Scripts (Updated)
```bash
npm run worker:start    # ./worker-ingest-v2.sh (continuous)
npm run worker:once     # ./worker-ingest-v2.sh --once (single run)
npm run worker:status   # Check running worker processes
```

### Migration Steps
1. ✅ **worker-ingest-v2.sh** created with platform-segmented architecture
2. ✅ **package.json** updated to use v2 worker
3. ✅ **Bash compatibility** fixed (mapfile → while loop)
4. ✅ **Platform validation** implemented with case-insensitive matching
5. ✅ **Duplicate prevention** with platform-specific markers

### Testing Results
- ✅ Single run test passed (`npm run worker:once`)
- ✅ No requests found in platform directories (expected - new structure)
- ✅ Worker status monitoring functional

## 📋 Request Format (Unchanged)

### YouTube Request
```json
{
  "content_id": "VIDEO_ID",
  "platform": "YouTube",
  "source_url": "https://youtube.com/shorts/VIDEO_ID",
  "canonical_url": "https://youtube.com/shorts/VIDEO_ID",
  "metadata": {...}
}
```

### Instagram/TikTok Request
```json
{
  "content_id": "POST_ID",
  "platform": "Instagram|TikTok",
  "source_url": "https://instagram.com/p/POST_ID/",
  "metadata": {...}
}
```

## 🔧 Environment Requirements

### GCS Bucket Structure
```bash
tough-variety-raw/
├── ingest/requests/
│   ├── youtube/     # YouTube request JSONs
│   ├── instagram/   # Instagram request JSONs
│   └── tiktok/      # TikTok request JSONs
├── raw/input/
│   ├── youtube/     # Downloaded MP4 files
│   ├── instagram/   # (empty - no downloads)
│   └── tiktok/      # (empty - no downloads)
├── raw/vdp/evidence/
│   ├── youtube/     # Evidence Packs
│   ├── instagram/   # (empty - no evidence)
│   └── tiktok/      # (empty - no evidence)
└── staging/social_metadata/
    ├── youtube/     # (unused)
    ├── instagram/   # Metadata-only records
    └── tiktok/      # Metadata-only records
```

### BigQuery Integration
- **Dataset**: `vdp_dataset`
- **Gold Table**: `vdp_gold` (YouTube VDP records)
- **Social Table**: `social_ingest.link_requests` (Instagram/TikTok metadata)

## ⚡ Performance Benefits

### 1. Reduced Cross-Platform Interference
- Platform-specific polling prevents TikTok → YouTube misclassification
- Cleaner error handling per platform

### 2. Optimized Processing Paths
- YouTube: Full VDP pipeline with Evidence Packs
- Social: Fast metadata-only staging

### 3. Better Monitoring
- Platform-specific done markers
- Clearer failure isolation
- Structured logging with platform context

## 🛠️ Backward Compatibility

### Legacy Requests (v1 format)
- **worker-ingest.sh** still available for compatibility
- Flat structure requests will be processed by v1 worker if needed
- No breaking changes to request JSON format

### Migration Strategy
1. **Phase 1**: Deploy v2 worker alongside v1 (current)
2. **Phase 2**: Move new requests to platform-segmented structure
3. **Phase 3**: Migrate existing requests to new structure (optional)
4. **Phase 4**: Deprecate v1 worker (future)

## 📊 Monitoring & Debugging

### Log Patterns
```bash
# Platform detection
🔑 Content key: youtube:VIDEO_ID

# Platform-specific processing
📺 YouTube Processing: VIDEO_ID
📊 Instagram Metadata Processing: POST_ID

# Duplicate prevention
✅ Creating done marker for: youtube:VIDEO_ID
⏭️ Already processed: instagram:POST_ID
```

### Troubleshooting
- **Platform Detection**: Check case-insensitive matching
- **Duplicate Processing**: Look for `.done` markers in platform directories
- **GCS Paths**: Verify platform-specific directory structure
- **Processing Logic**: Confirm YouTube vs Social branching

## 🔄 Next Steps

1. **Create Platform Directories**: Set up platform-specific request directories
2. **Test Each Platform**: Submit test requests to each platform directory
3. **Monitor Performance**: Compare v1 vs v2 processing efficiency
4. **Production Deployment**: Roll out v2 worker as primary processor