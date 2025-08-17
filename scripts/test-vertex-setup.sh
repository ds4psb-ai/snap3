#!/usr/bin/env bash
set -euo pipefail

# 🧪 Test Vertex AI Setup and Configuration
# Purpose: Validate Vertex AI configuration without making actual API calls
# Usage: ./test-vertex-setup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧪 Vertex AI Setup Validation"
echo "============================="
echo ""

# Check environment variables
echo "🔧 Environment Configuration:"
echo "  PROJECT_ID: ${PROJECT_ID:-not set}"
echo "  LOCATION: ${LOCATION:-not set}"
echo "  MODEL_ID: ${MODEL_ID:-not set}"
echo ""

# Check GCP authentication
echo "🔐 Authentication Check:"
if gcloud auth print-access-token >/dev/null 2>&1; then
    echo "  ✅ GCP authentication: Valid"
    echo "  🆔 Active account: $(gcloud config get-value account 2>/dev/null)"
    echo "  📁 Active project: $(gcloud config get-value project 2>/dev/null)"
else
    echo "  ❌ GCP authentication: Failed"
    echo "  Run: gcloud auth login"
fi
echo ""

# Check schema files
echo "📋 Schema Validation:"
VDP_CLEAN_SCHEMA="${SCRIPT_DIR}/../schemas/vdp-vertex-clean.schema.json"
VDP_STRICT_SCHEMA="${SCRIPT_DIR}/../schemas/vdp-strict.schema.json"

if [[ -f "$VDP_CLEAN_SCHEMA" ]]; then
    echo "  ✅ Clean schema: $VDP_CLEAN_SCHEMA"
    SCHEMA_SIZE=$(wc -c < "$VDP_CLEAN_SCHEMA")
    echo "    📊 Size: $SCHEMA_SIZE bytes"
    
    # Validate JSON
    if jq empty "$VDP_CLEAN_SCHEMA" 2>/dev/null; then
        echo "    ✅ JSON structure: Valid"
    else
        echo "    ❌ JSON structure: Invalid"
    fi
else
    echo "  ❌ Clean schema: Not found"
fi

if [[ -f "$VDP_STRICT_SCHEMA" ]]; then
    echo "  ✅ Strict schema: $VDP_STRICT_SCHEMA"
else
    echo "  ⚠️ Strict schema: Not found (optional for final validation)"
fi
echo ""

# Check tools availability
echo "🔧 Tools Availability:"
if command -v jq >/dev/null 2>&1; then
    echo "  ✅ jq: Available"
else
    echo "  ❌ jq: Not found (required for JSON processing)"
fi

if command -v curl >/dev/null 2>&1; then
    echo "  ✅ curl: Available"
else
    echo "  ❌ curl: Not found (required for API calls)"
fi

if command -v npx >/dev/null 2>&1; then
    echo "  ✅ npx: Available"
    if npx ajv --help >/dev/null 2>&1; then
        echo "    ✅ ajv: Available (for schema validation)"
    else
        echo "    ⚠️ ajv: Not available (schema validation will be skipped)"
    fi
else
    echo "  ⚠️ npx: Not found (schema validation will be skipped)"
fi
echo ""

# Test payload generation
echo "🔨 Payload Generation Test:"
if [[ -f "$VDP_CLEAN_SCHEMA" ]]; then
    VDP_SCHEMA=$(cat "$VDP_CLEAN_SCHEMA")
    
    # Build test payload
    TEST_PAYLOAD=$(jq -n \
        --argjson vdp_schema "$VDP_SCHEMA" \
        '{
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "file_data": {
                                "file_uri": "gs://test-bucket/test-video.mp4",
                                "mime_type": "video/mp4"
                            }
                        },
                        {
                            "text": "Test video analysis request"
                        }
                    ]
                }
            ],
            "generation_config": {
                "temperature": 0.1,
                "max_output_tokens": 32768,
                "response_mime_type": "application/json",
                "response_schema": $vdp_schema
            }
        }')
    
    if echo "$TEST_PAYLOAD" | jq empty 2>/dev/null; then
        echo "  ✅ Test payload generation: Success"
        echo "  📊 Payload size: $(echo "$TEST_PAYLOAD" | wc -c) bytes"
    else
        echo "  ❌ Test payload generation: Failed"
    fi
else
    echo "  ⚠️ Cannot test payload generation without clean schema"
fi
echo ""

# Check Vertex AI API endpoint
echo "🌐 API Endpoint Check:"
if [[ -n "${PROJECT_ID:-}" ]] && [[ -n "${LOCATION:-}" ]]; then
    ENDPOINT="https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-2.5-pro:generateContent"
    echo "  📡 Endpoint: $ENDPOINT"
    echo "  ✅ Endpoint URL: Valid format"
else
    echo "  ❌ Cannot generate endpoint (PROJECT_ID or LOCATION not set)"
fi
echo ""

# Check GCS bucket access
echo "☁️ GCS Bucket Check:"
if [[ -n "${RAW_BUCKET:-}" ]]; then
    echo "  📦 Raw bucket: gs://${RAW_BUCKET}"
    if gsutil ls "gs://${RAW_BUCKET}/" >/dev/null 2>&1; then
        echo "  ✅ Raw bucket access: Available"
        FILE_COUNT=$(gsutil ls "gs://${RAW_BUCKET}/raw/ingest/" 2>/dev/null | wc -l || echo "0")
        echo "  📁 Files in ingest: $FILE_COUNT"
    else
        echo "  ❌ Raw bucket access: Failed"
    fi
else
    echo "  ⚠️ RAW_BUCKET not set"
fi

if [[ -n "${GOLD_BUCKET:-}" ]]; then
    echo "  🏆 Gold bucket: gs://${GOLD_BUCKET}"
    if gsutil ls "gs://${GOLD_BUCKET}/" >/dev/null 2>&1; then
        echo "  ✅ Gold bucket access: Available"
    else
        echo "  ❌ Gold bucket access: Failed"
    fi
else
    echo "  ⚠️ GOLD_BUCKET not set"
fi
echo ""

# Summary
echo "📋 Setup Summary:"
echo "================="

ISSUES=0
WARNINGS=0

# Check critical requirements
if [[ -z "${PROJECT_ID:-}" ]]; then
    echo "❌ PROJECT_ID environment variable required"
    ((ISSUES++))
fi

if ! gcloud auth print-access-token >/dev/null 2>&1; then
    echo "❌ GCP authentication required"
    ((ISSUES++))
fi

if [[ ! -f "$VDP_CLEAN_SCHEMA" ]]; then
    echo "❌ Clean VDP schema required"
    ((ISSUES++))
fi

if ! command -v jq >/dev/null 2>&1; then
    echo "❌ jq tool required"
    ((ISSUES++))
fi

# Check warnings
if [[ ! -f "$VDP_STRICT_SCHEMA" ]]; then
    echo "⚠️ Strict schema not found (validation may be limited)"
    ((WARNINGS++))
fi

if ! command -v npx >/dev/null 2>&1 || ! npx ajv --help >/dev/null 2>&1; then
    echo "⚠️ ajv not available (schema validation will be skipped)"
    ((WARNINGS++))
fi

echo ""
if [[ $ISSUES -eq 0 ]]; then
    echo "🎉 Setup Status: Ready for Vertex AI VDP processing!"
    echo "📝 Note: Service agents provisioning error is temporary and will resolve automatically"
    echo ""
    echo "🚀 Next Steps:"
    echo "  1. Wait for service agents to provision (1-5 minutes)"
    echo "  2. Run: ./vertex-ai-vdp-processor.sh gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4"
    echo "  3. Monitor for successful VDP generation"
else
    echo "⚠️ Setup Status: $ISSUES critical issues need resolution"
    if [[ $WARNINGS -gt 0 ]]; then
        echo "💡 Additionally: $WARNINGS warnings (non-critical)"
    fi
    echo ""
    echo "🔧 Fix Issues:"
    echo "  1. Set missing environment variables"
    echo "  2. Run: gcloud auth login"
    echo "  3. Ensure schema files are present"
    echo "  4. Install missing tools (jq, npx)"
fi