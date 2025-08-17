#!/usr/bin/env bash
set -euo pipefail

# 🔧 Environment Setup for Jobs T2 System
# Purpose: Configure GCP environment and validate credentials for Jobs T2 operations
# Usage: source ./setup-environment.sh

echo "🔧 Jobs T2 Environment Setup"
echo "============================"

# Load environment configuration
if [[ -f ".env" ]]; then
    echo "📋 Loading .env configuration..."
    source .env
elif [[ -f ".env.example" ]]; then
    echo "⚠️ .env not found, using .env.example as template"
    echo "💡 Copy .env.example to .env and customize for your environment"
    source .env.example
else
    echo "❌ No environment configuration found"
    echo "Please create .env file from .env.example template"
    exit 1
fi

# Validate required variables
REQUIRED_VARS=(
    "PROJECT_ID"
    "RAW_BUCKET" 
    "GOLD_BUCKET"
    "DATASET"
    "TABLE"
    "REGION"
    "US_T2"
    "REQ_PREFIX"
    "EVID_PREFIX"
    "INPUT_PREFIX"
    "OUT_VDP_PREFIX"
)

echo ""
echo "🔍 Validating environment variables..."
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        MISSING_VARS+=("$var")
    else
        echo "✅ $var = ${!var}"
    fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo ""
    echo "❌ Missing required environment variables:"
    printf '  - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please set these variables in your .env file"
    exit 1
fi

# Check GCP authentication
echo ""
echo "🔐 Checking GCP authentication..."
if gcloud auth application-default print-access-token >/dev/null 2>&1; then
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "not set")
    echo "✅ GCP authentication active"
    echo "📍 Current project: $CURRENT_PROJECT"
    
    if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
        echo "⚠️ Project mismatch detected"
        echo "💡 Setting project to: $PROJECT_ID"
        gcloud config set project "$PROJECT_ID"
    fi
else
    echo "❌ GCP authentication required"
    echo "💡 Run: gcloud auth application-default login"
    exit 1
fi

# Check bucket access
echo ""
echo "🪣 Validating GCS bucket access..."
for bucket in "$RAW_BUCKET" "$GOLD_BUCKET"; do
    if gsutil ls "gs://$bucket/" >/dev/null 2>&1; then
        echo "✅ Access to gs://$bucket/"
    else
        echo "❌ Cannot access gs://$bucket/"
        echo "💡 Check bucket exists and you have proper permissions"
        exit 1
    fi
done

# Check VDP service endpoint
echo ""
echo "🌐 Testing VDP service endpoint..."
if curl -s --connect-timeout 5 --max-time 10 "$US_T2/health" >/dev/null 2>&1; then
    echo "✅ VDP service accessible: $US_T2"
else
    echo "⚠️ VDP service not accessible: $US_T2"
    echo "💡 Service may be down or network issue"
fi

# Check required tools
echo ""
echo "🛠️ Validating required tools..."
REQUIRED_TOOLS=(
    "ffmpeg:Audio/video processing"
    "fpcalc:Audio fingerprinting (chromaprint)"
    "jq:JSON processing"
    "node:JavaScript runtime"
    "gsutil:GCS operations"
    "gcloud:GCP operations"
)

MISSING_TOOLS=()
for tool_desc in "${REQUIRED_TOOLS[@]}"; do
    tool=${tool_desc%%:*}
    desc=${tool_desc#*:}
    
    if command -v "$tool" >/dev/null 2>&1; then
        echo "✅ $tool ($desc)"
    else
        echo "❌ $tool ($desc)"
        MISSING_TOOLS+=("$tool")
    fi
done

if [[ ${#MISSING_TOOLS[@]} -gt 0 ]]; then
    echo ""
    echo "⚠️ Missing required tools. Install with:"
    echo "  macOS: brew install ffmpeg chromaprint jq nodejs"
    echo "  Ubuntu: sudo apt-get install ffmpeg chromaprint jq nodejs npm"
fi

# Check optional tools
echo ""
echo "📋 Optional tools (for enhanced functionality):"
OPTIONAL_TOOLS=(
    "tesseract:OCR text extraction (brand detection)"
    "bc:Mathematical calculations"
)

for tool_desc in "${OPTIONAL_TOOLS[@]}"; do
    tool=${tool_desc%%:*}
    desc=${tool_desc#*:}
    
    if command -v "$tool" >/dev/null 2>&1; then
        echo "✅ $tool ($desc)"
    else
        echo "💡 $tool ($desc) - install for enhanced features"
    fi
done

# YouTube API key check
echo ""
echo "🔑 YouTube API configuration..."
if [[ -n "${YOUTUBE_API_KEY:-}" && "$YOUTUBE_API_KEY" != "your-youtube-api-key-here" ]]; then
    echo "✅ YouTube API key configured"
else
    echo "⚠️ YouTube API key not configured"
    echo "💡 Set YOUTUBE_API_KEY in .env for YouTube metadata collection"
fi

# Generate GCS paths summary
echo ""
echo "📍 GCS Path Configuration:"
echo "  🔴 Requests: $REQ_PREFIX"
echo "  📦 Evidence: $EVID_PREFIX"
echo "  📥 Input: $INPUT_PREFIX"
echo "  📤 VDP Output: $OUT_VDP_PREFIX"

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📝 Available npm scripts:"
echo "  npm run collect \"URL\"           # Universal metadata collection"
echo "  npm run evidence:upload CID      # Evidence pack generation"
echo "  npm run normalize \"URL\"         # URL normalization test"
echo ""
echo "🚀 Jobs T2 system ready for use!"