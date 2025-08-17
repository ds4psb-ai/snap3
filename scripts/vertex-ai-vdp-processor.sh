#!/usr/bin/env bash
set -euo pipefail

# 🤖 Vertex AI 2.5 Pro VDP Processor with Structured Output
# Purpose: Generate VDP using Vertex AI with strict schema enforcement
# Usage: ./vertex-ai-vdp-processor.sh VIDEO_GCS_URI [CONTENT_ID]

VIDEO_GCS_URI="${1:-}"
CONTENT_ID="${2:-$(date +C%6N)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validation
if [[ -z "$VIDEO_GCS_URI" ]]; then
    echo "❌ Usage: $0 VIDEO_GCS_URI [CONTENT_ID]"
    echo ""
    echo "Examples:"
    echo "  $0 gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4"
    echo "  $0 gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4 C000888"
    echo ""
    echo "Environment Variables Required:"
    echo "  PROJECT_ID, LOCATION, MODEL_ID, ACCESS_TOKEN"
    exit 1
fi

echo "🤖 Vertex AI 2.5 Pro VDP Processor"
echo "=================================="
echo "📹 Video GCS URI: $VIDEO_GCS_URI"
echo "🆔 Content ID: $CONTENT_ID"
echo ""

# 프로젝트 공통 ENV 설정
cd /Users/ted/snap3

export PROJECT_ID="${PROJECT_ID:-tough-variety-466003-c5}"
export LOCATION="${LOCATION:-us-west1}"
export RAW_BUCKET="${RAW_BUCKET:-tough-variety-raw}"
export GOLD_BUCKET="${GOLD_BUCKET:-tough-variety-gold}"
export DATASET="${DATASET:-vdp_dataset}"
export TABLE="${TABLE:-vdp_gold}"

# Vertex 2.5 Pro + Structured Output 강제
export MODEL_ID="${MODEL_ID:-gemini-2.5-pro}"
export ACCESS_TOKEN="${ACCESS_TOKEN:-$(gcloud auth print-access-token 2>/dev/null || echo '')}"

# Vertex generateContent REST 엔드포인트
export ENDPOINT="https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:generateContent"

echo "🔧 Environment Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Location: $LOCATION"
echo "  Model ID: $MODEL_ID"
echo "  Endpoint: $ENDPOINT"
echo "  Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Validate environment
if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "❌ Failed to get access token"
    echo "Run: gcloud auth login"
    echo "Or: export ACCESS_TOKEN=\"\$(gcloud auth print-access-token)\""
    exit 1
fi

# Load VDP schema for structured output
VDP_SCHEMA_PATH="${SCRIPT_DIR}/../schemas/vdp-vertex-clean.schema.json"
if [[ ! -f "$VDP_SCHEMA_PATH" ]]; then
    echo "❌ VDP Vertex AI schema not found: $VDP_SCHEMA_PATH"
    echo "Run the schema generation script first"
    exit 1
fi

echo "📋 Loading VDP schema for structured output..."
VDP_SCHEMA=$(cat "$VDP_SCHEMA_PATH")
echo "✅ VDP schema loaded successfully"

# Create request payload with structured output enforcement
echo ""
echo "🔨 Building Vertex AI request payload..."

# System instruction for VDP analysis
SYSTEM_INSTRUCTION="You are a professional video content analyst specializing in short-form video analysis for social media platforms (YouTube Shorts, Instagram Reels, TikTok). 

Your task is to analyze the provided video and generate a comprehensive VDP (Video Data Package) that follows the exact schema structure provided. 

Key requirements:
1. Analyze visual content, audio, text overlays, and overall narrative structure
2. Break down the video into distinct scenes with detailed shot analysis
3. Identify products, services, and brand mentions with time stamps
4. Extract audience engagement patterns and emotional arc
5. Provide confidence scores for all analysis (target: >0.9)
6. Ensure all required fields are populated with accurate, detailed information
7. Generate realistic engagement metrics appropriate for the content type
8. Follow Korean social media conventions where applicable

The response must strictly conform to the provided JSON schema structure."

# User prompt for video analysis
USER_PROMPT="Analyze this video and provide a complete VDP analysis following the strict schema requirements. 

Video Content ID: ${CONTENT_ID}
Platform: Determine from content style and format
Duration: Extract from video analysis
Video Origin: Determine if AI-Generated, Real-Footage, or Mixed based on visual analysis

Please generate a comprehensive VDP with:
- Accurate metadata including engagement metrics
- Detailed scene-by-scene breakdown with shots and keyframes  
- Product/service mentions with time ranges
- Audience reaction analysis with confidence scores
- ASR transcript and OCR text extraction
- Overall narrative and emotional arc analysis

Ensure all timing data is consistent and realistic for the video content."

# Build JSON payload
REQUEST_PAYLOAD=$(jq -n \
    --arg system_instruction "$SYSTEM_INSTRUCTION" \
    --arg user_prompt "$USER_PROMPT" \
    --arg video_uri "$VIDEO_GCS_URI" \
    --argjson vdp_schema "$VDP_SCHEMA" \
    '{
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "file_data": {
                            "file_uri": $video_uri,
                            "mime_type": "video/mp4"
                        }
                    },
                    {
                        "text": $user_prompt
                    }
                ]
            }
        ],
        "system_instruction": {
            "parts": [
                {
                    "text": $system_instruction
                }
            ]
        },
        "generation_config": {
            "temperature": 0.1,
            "max_output_tokens": 32768,
            "response_mime_type": "application/json",
            "response_schema": $vdp_schema
        },
        "safety_settings": [
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    }')

echo "✅ Request payload built successfully"
echo ""

# Save request for debugging
mkdir -p "${SCRIPT_DIR}/tmp"
echo "$REQUEST_PAYLOAD" > "${SCRIPT_DIR}/tmp/${CONTENT_ID}_request.json"
echo "💾 Request saved to: ${SCRIPT_DIR}/tmp/${CONTENT_ID}_request.json"

# Make API call to Vertex AI
echo ""
echo "🚀 Calling Vertex AI 2.5 Pro..."
echo "📡 Endpoint: $ENDPOINT"

RESPONSE=$(curl -s -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$REQUEST_PAYLOAD")

# Save raw response
echo "$RESPONSE" > "${SCRIPT_DIR}/tmp/${CONTENT_ID}_response.json"
echo "💾 Response saved to: ${SCRIPT_DIR}/tmp/${CONTENT_ID}_response.json"

# Check for API errors
if echo "$RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
    echo "❌ Vertex AI API Error:"
    echo "$RESPONSE" | jq '.error'
    exit 1
fi

# Extract generated VDP content
echo ""
echo "📊 Extracting VDP content..."

VDP_CONTENT=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].text // empty')

if [[ -z "$VDP_CONTENT" ]]; then
    echo "❌ No VDP content generated"
    echo "Response structure:"
    echo "$RESPONSE" | jq -C '.' | head -20
    exit 1
fi

# Validate generated VDP is valid JSON
if ! echo "$VDP_CONTENT" | jq empty 2>/dev/null; then
    echo "❌ Generated VDP is not valid JSON"
    echo "Content preview:"
    echo "$VDP_CONTENT" | head -10
    exit 1
fi

# Save generated VDP
VDP_OUTPUT="${SCRIPT_DIR}/tmp/${CONTENT_ID}_vdp.json"
echo "$VDP_CONTENT" > "$VDP_OUTPUT"
echo "✅ VDP generated successfully: $VDP_OUTPUT"

# Validate against schema
echo ""
echo "🔍 Validating generated VDP against schema..."

if command -v npx >/dev/null 2>&1; then
    # Validate against the strict schema for final validation
    STRICT_SCHEMA_PATH="${SCRIPT_DIR}/../schemas/vdp-strict.schema.json"
    if [[ -f "$STRICT_SCHEMA_PATH" ]]; then
        if npx ajv validate -s "$STRICT_SCHEMA_PATH" -d "$VDP_OUTPUT" 2>/dev/null; then
            echo "✅ VDP passes strict schema validation"
        else
            echo "⚠️ VDP has strict schema validation warnings"
            npx ajv validate -s "$STRICT_SCHEMA_PATH" -d "$VDP_OUTPUT" || true
        fi
    else
        echo "ℹ️ Strict schema validation not available"
    fi
else
    echo "ℹ️ Schema validation not available (ajv not found)"
fi

# Quality assessment
echo ""
echo "📋 VDP Quality Assessment:"
echo "=========================="

CONFIDENCE_OVERALL=$(echo "$VDP_CONTENT" | jq -r '.overall_analysis.confidence.overall // 0')
SCENE_COUNT=$(echo "$VDP_CONTENT" | jq '.scenes | length // 0')
PRODUCT_COUNT=$(echo "$VDP_CONTENT" | jq '.product_mentions | length // 0')
COMMENTS_COUNT=$(echo "$VDP_CONTENT" | jq '.overall_analysis.audience_reaction.notable_comments | length // 0')

echo "🎯 Overall confidence: $CONFIDENCE_OVERALL"
echo "🎬 Scene count: $SCENE_COUNT"
echo "🛍️ Product mentions: $PRODUCT_COUNT"
echo "💬 Notable comments: $COMMENTS_COUNT"

# Quality scoring
QUALITY_SCORE=0
if (( $(echo "$CONFIDENCE_OVERALL > 0.9" | bc -l) )); then
    QUALITY_SCORE=$((QUALITY_SCORE + 30))
fi
if [[ "$SCENE_COUNT" -ge 3 ]]; then
    QUALITY_SCORE=$((QUALITY_SCORE + 25))
fi
if [[ "$SCENE_COUNT" -le 6 ]]; then
    QUALITY_SCORE=$((QUALITY_SCORE + 25))
fi
if [[ "$COMMENTS_COUNT" -ge 2 ]]; then
    QUALITY_SCORE=$((QUALITY_SCORE + 20))
fi

echo "📊 Quality score: ${QUALITY_SCORE}/100"

if [[ "$QUALITY_SCORE" -ge 80 ]]; then
    echo "🌟 Quality: Excellent VDP"
elif [[ "$QUALITY_SCORE" -ge 60 ]]; then
    echo "✨ Quality: Good VDP"
else
    echo "📝 Quality: Basic VDP (consider regeneration)"
fi

# BigQuery upload preparation
echo ""
echo "📤 Preparing for BigQuery upload..."

# Add processing metadata
ENHANCED_VDP=$(echo "$VDP_CONTENT" | jq \
    --arg content_id "$CONTENT_ID" \
    --arg source_uri "$VIDEO_GCS_URI" \
    --arg processing_time "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
    --arg model_id "$MODEL_ID" \
    --arg quality_score "$QUALITY_SCORE" \
    '. + {
        content_id: $content_id,
        processing_metadata: {
            source_uri: $source_uri,
            processing_time: $processing_time,
            model_id: $model_id,
            quality_score: ($quality_score | tonumber),
            vertex_ai_version: "gemini-2.5-pro",
            schema_version: "1.0"
        }
    }')

# Save enhanced VDP for BigQuery
BQ_VDP_OUTPUT="${SCRIPT_DIR}/tmp/${CONTENT_ID}_bq_ready.json"
echo "$ENHANCED_VDP" > "$BQ_VDP_OUTPUT"
echo "✅ BigQuery-ready VDP: $BQ_VDP_OUTPUT"

# Create upload to gold bucket
echo ""
echo "☁️ Uploading to Gold Bucket..."

GOLD_PREFIX="vdp/$(date +%Y-%m-%d)"
GOLD_URI="gs://${GOLD_BUCKET}/${GOLD_PREFIX}/${CONTENT_ID}_$(date +%Y%m%d_%H%M%S).json"

if gsutil cp "$BQ_VDP_OUTPUT" "$GOLD_URI" 2>/dev/null; then
    echo "✅ VDP uploaded to: $GOLD_URI"
else
    echo "⚠️ Failed to upload to gold bucket (check gsutil access)"
fi

echo ""
echo "🎉 Vertex AI VDP Processing Complete!"
echo ""
echo "📁 Generated Files:"
echo "  - $VDP_OUTPUT (raw VDP)"
echo "  - $BQ_VDP_OUTPUT (BigQuery ready)"
echo "  - ${SCRIPT_DIR}/tmp/${CONTENT_ID}_request.json (API request)"
echo "  - ${SCRIPT_DIR}/tmp/${CONTENT_ID}_response.json (API response)"
echo ""
echo "☁️ Cloud Storage:"
echo "  - $GOLD_URI (if upload successful)"
echo ""
echo "🔧 Next Steps:"
echo "  1. Review VDP: jq . '$VDP_OUTPUT'"
echo "  2. Load to BigQuery: bq load --source_format=NEWLINE_DELIMITED_JSON ${DATASET}.${TABLE} '$GOLD_URI'"
echo "  3. Monitor quality scores and adjust prompts as needed"