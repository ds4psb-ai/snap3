# VDP Schema Reference

This directory contains JSON Schema definitions for validating VDP (Video Data Package) files.

## Files

- `vdp.schema.json` - Main VDP schema definition with comprehensive validation rules

## Schema Overview

The VDP schema validates the following structure:

### Required Fields
- `content_id` - Unique video identifier (3-50 chars, alphanumeric + underscore/dash)
- `platform` - Source platform (youtube, tiktok, instagram, reels)
- `source_url` - Original video URL (valid URI format)
- `upload_id` - Tracking UUID (36-char UUID format)
- `metadata` - View counts, engagement metrics
- `overall_analysis` - Emotional arc, sentiment, confidence scores
- `scenes` - 2-4 scene breakdown with narrative roles
- `ingestion_timestamp` - ISO 8601 datetime

### Optional Fields
- `video_origin` - Real-Footage vs AI-Generated classification
- `top_comments` - Up to 5 top comments with author, text, likes
- `product_mentions` - Product/service mentions with time ranges

### Validation Rules

#### Metadata
- All counts must be non-negative integers
- Hashtags must start with # and contain valid characters
- Maximum 20 hashtags per video

#### Overall Analysis
- Confidence must be 0.0-1.0 float
- Sentiment must be from predefined enum
- Emotional arc: 5-200 characters

#### Scenes
- 2-4 scenes required
- Each scene duration: 0.1-15.0 seconds
- Narrative roles: Hook, Demonstration, Problem_Solution, Conclusion, Transition
- Visual summary: 10-500 characters required

#### Comments
- Maximum 5 comments
- Each comment requires text and author
- Text limited to 1000 characters
- Author name limited to 100 characters

#### Product Mentions
- Each mention requires name and type
- Type must be: product, service, brand, app
- Time ranges as [start, end] arrays
- Evidence sources: OCR, ASR, Visual
- Confidence levels: high, medium, low

## Usage

### Command Line Validation
```bash
# Validate single file
npx ajv -s schemas/vdp.schema.json -d video.vdp.json

# Validate with custom script
npm run quality:check video.mp4 video.vdp.json

# Validate JSON files only
npm run quality:validate *.vdp.json
```

### Node.js Integration
```javascript
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const schema = require('./schemas/vdp.schema.json');

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(schema);

const isValid = validate(vdpData);
if (!isValid) {
  console.log(validate.errors);
}
```

## BigQuery Compatibility

The schema ensures BigQuery JSONL compatibility:
- No embedded newlines in string fields
- All fields use JSON-compatible types
- Proper array and object nesting
- Compatible with `bq load` NDJSON format

## Version History

- v1.0 - Initial schema with core VDP structure
- Fields aligned with existing VDP samples (vdp-C000888, vdp-C000889)
- Support for YouTube, TikTok, Instagram platforms
- Comprehensive validation for pipeline quality assurance