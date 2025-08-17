#!/usr/bin/env bash
set -euo pipefail

# 🌐 VDP Environment Setup Script
# Configures all required environment variables and validates dependencies

echo "🔧 Setting up VDP Pipeline Environment"

# Default configuration - modify as needed
DEFAULT_GCP_PROJECT="tough-variety-466003-c5"
DEFAULT_GCP_REGION="us-west1"
DEFAULT_RAW_BUCKET="tough-variety-raw"
DEFAULT_T2_URL="http://localhost:3001/api/v1/extract"

# Function to prompt for environment variable with default
prompt_env_var() {
    local var_name="$1"
    local default_value="$2"
    local description="$3"
    local current_value="${!var_name:-}"
    
    if [[ -n "$current_value" ]]; then
        echo "✅ $var_name is already set: $current_value"
        return 0
    fi
    
    echo "📝 $description"
    read -p "Enter $var_name (default: $default_value): " user_input
    
    local final_value="${user_input:-$default_value}"
    export "$var_name"="$final_value"
    echo "export $var_name=\"$final_value\"" >> ~/.bash_profile
    echo "✅ Set $var_name=$final_value"
}

# Function to validate required tools
validate_dependencies() {
    echo "🔍 Validating dependencies..."
    
    local missing_tools=()
    
    # Check yt-dlp
    if ! command -v yt-dlp &> /dev/null; then
        missing_tools+=("yt-dlp")
    fi
    
    # Check ffmpeg
    if ! command -v ffmpeg &> /dev/null; then
        missing_tools+=("ffmpeg")
    fi
    
    # Check gsutil
    if ! command -v gsutil &> /dev/null; then
        missing_tools+=("gsutil")
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        echo "❌ Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "📥 Installation instructions:"
        for tool in "${missing_tools[@]}"; do
            case "$tool" in
                yt-dlp)
                    echo "  - yt-dlp: brew install yt-dlp"
                    ;;
                ffmpeg)
                    echo "  - ffmpeg: brew install ffmpeg"
                    ;;
                gsutil)
                    echo "  - gsutil: Install Google Cloud SDK from https://cloud.google.com/sdk"
                    ;;
                jq)
                    echo "  - jq: brew install jq"
                    ;;
                curl)
                    echo "  - curl: brew install curl (or use system curl)"
                    ;;
            esac
        done
        return 1
    fi
    
    echo "✅ All required tools are available"
    return 0
}

# Function to validate GCP authentication
validate_gcp_auth() {
    echo "🔐 Validating GCP authentication..."
    
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" | head -1 &> /dev/null; then
        echo "❌ No active GCP authentication found"
        echo "🔑 Please run: gcloud auth login"
        return 1
    fi
    
    local active_account
    active_account="$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" | head -1)"
    echo "✅ GCP authenticated as: $active_account"
    
    # Validate project access
    if [[ -n "${GCP_PROJECT:-}" ]]; then
        if gcloud projects describe "$GCP_PROJECT" &> /dev/null; then
            echo "✅ GCP project access confirmed: $GCP_PROJECT"
        else
            echo "❌ Cannot access GCP project: $GCP_PROJECT"
            echo "🔑 Please check project permissions or run: gcloud config set project $GCP_PROJECT"
            return 1
        fi
    fi
    
    return 0
}

# Function to validate bucket access
validate_bucket_access() {
    if [[ -n "${RAW_BUCKET:-}" ]]; then
        echo "🪣 Validating bucket access: $RAW_BUCKET"
        
        if gsutil ls "gs://$RAW_BUCKET/" &> /dev/null; then
            echo "✅ Bucket access confirmed: $RAW_BUCKET"
        else
            echo "❌ Cannot access bucket: $RAW_BUCKET"
            echo "🔑 Please check bucket permissions or create bucket with:"
            echo "    gsutil mb gs://$RAW_BUCKET"
            return 1
        fi
    fi
    
    return 0
}

# Function to validate YouTube API key
validate_youtube_api() {
    if [[ -n "${YOUTUBE_API_KEY:-}" ]]; then
        echo "🔑 Validating YouTube API key..."
        
        # Test API key with a simple quota call
        local test_response
        test_response="$(curl -s "https://youtube.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${YOUTUBE_API_KEY}")"
        
        if echo "$test_response" | jq -e '.error' &> /dev/null; then
            echo "❌ YouTube API key validation failed:"
            echo "$test_response" | jq -r '.error.message'
            return 1
        else
            echo "✅ YouTube API key validated successfully"
        fi
    else
        echo "⚠️ YouTube API key not set - some features will be limited"
    fi
    
    return 0
}

# Function to test T2 service connectivity
validate_t2_service() {
    if [[ -n "${T2_URL:-}" ]]; then
        echo "🔌 Testing T2 service connectivity: $T2_URL"
        
        # Test if T2 service is reachable
        local health_url="${T2_URL%/*}/health"
        if curl -s --max-time 5 "$health_url" &> /dev/null; then
            echo "✅ T2 service is reachable"
        else
            echo "⚠️ T2 service is not reachable - extraction will fail"
            echo "🔧 Ensure T2 service is running or update T2_URL"
        fi
    fi
    
    return 0
}

# Main setup function
main() {
    echo "🚀 Starting VDP Environment Setup"
    echo ""
    
    # 1. Setup environment variables
    echo "1️⃣ Configuring environment variables"
    prompt_env_var "GCP_PROJECT" "$DEFAULT_GCP_PROJECT" "GCP Project ID for VDP pipeline"
    prompt_env_var "GCP_REGION" "$DEFAULT_GCP_REGION" "GCP Region for resources"
    prompt_env_var "RAW_BUCKET" "$DEFAULT_RAW_BUCKET" "GCS bucket for raw video storage"
    prompt_env_var "T2_URL" "$DEFAULT_T2_URL" "T2 extraction service URL"
    
    # Prompt for YouTube API key (required)
    if [[ -z "${YOUTUBE_API_KEY:-}" ]]; then
        echo ""
        echo "📝 YouTube API Key (required for metadata collection)"
        echo "   Get your key from: https://console.cloud.google.com/apis/credentials"
        read -p "Enter YOUTUBE_API_KEY: " youtube_key
        if [[ -n "$youtube_key" ]]; then
            export YOUTUBE_API_KEY="$youtube_key"
            echo "export YOUTUBE_API_KEY=\"$youtube_key\"" >> ~/.bash_profile
            echo "✅ Set YOUTUBE_API_KEY"
        else
            echo "⚠️ YouTube API key not provided - some features will be limited"
        fi
    fi
    
    echo ""
    
    # 2. Validate dependencies
    echo "2️⃣ Validating dependencies"
    if ! validate_dependencies; then
        echo "❌ Dependency validation failed. Please install missing tools and run again."
        exit 1
    fi
    
    echo ""
    
    # 3. Validate GCP authentication
    echo "3️⃣ Validating GCP authentication"
    if ! validate_gcp_auth; then
        echo "❌ GCP authentication failed. Please authenticate and run again."
        exit 1
    fi
    
    echo ""
    
    # 4. Validate bucket access
    echo "4️⃣ Validating bucket access"
    validate_bucket_access || true  # Non-blocking
    
    echo ""
    
    # 5. Validate YouTube API
    echo "5️⃣ Validating YouTube API"
    validate_youtube_api || true  # Non-blocking
    
    echo ""
    
    # 6. Test T2 service
    echo "6️⃣ Testing T2 service"
    validate_t2_service || true  # Non-blocking
    
    echo ""
    echo "🎉 VDP Environment Setup Complete!"
    echo ""
    echo "📋 Current configuration:"
    echo "  - GCP_PROJECT: ${GCP_PROJECT:-not set}"
    echo "  - GCP_REGION: ${GCP_REGION:-not set}"
    echo "  - RAW_BUCKET: ${RAW_BUCKET:-not set}"
    echo "  - T2_URL: ${T2_URL:-not set}"
    echo "  - YOUTUBE_API_KEY: ${YOUTUBE_API_KEY:+***set***}"
    echo ""
    echo "🚀 Ready to run VDP pipeline!"
    echo "   Single video: ./scripts/vdp-oneshot-pipeline.sh 'https://www.youtube.com/shorts/VIDEO_ID'"
    echo "   Multiple videos: ./scripts/vdp-parallel-batch.sh url1 url2 url3"
    echo ""
    echo "💡 Environment variables have been added to ~/.bash_profile"
    echo "   Run 'source ~/.bash_profile' or restart your terminal to apply changes"
}

# Run main function
main "$@"