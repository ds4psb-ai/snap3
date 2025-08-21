#!/bin/bash

# 🚀 Bulk VDP Generation Script for BigQuery Loading
# Purpose: Generate complete VDP dataset from multiple platforms

set -e

# Configuration
BATCH_SIZE=10
MAX_RETRIES=3
DELAY_BETWEEN_REQUESTS=2
LOG_FILE="bulk-vdp-generation.log"

# Sample URLs for each platform
INSTAGRAM_URLS=(
    "https://www.instagram.com/reel/DM5lA9LgVXb/"
    "https://www.instagram.com/reel/C8X9Y2Z1W0V/"
    "https://www.instagram.com/reel/B7A6B5C4D3E/"
    "https://www.instagram.com/reel/F9G8H7I6J5K/"
    "https://www.instagram.com/reel/L3M2N1O0P9Q/"
)

TIKTOK_URLS=(
    "https://www.tiktok.com/@funnyfromai/video/7382948472948472948"
    "https://www.tiktok.com/@user1/video/1234567890123456789"
    "https://www.tiktok.com/@user2/video/9876543210987654321"
    "https://www.tiktok.com/@user3/video/555666777888999000"
    "https://www.tiktok.com/@user4/video/111222333444555666"
)

YOUTUBE_SHORTS_URLS=(
    "https://www.youtube.com/shorts/6_I2FmT1mbY"
    "https://www.youtube.com/shorts/7_J3GnU2ncZ"
    "https://www.youtube.com/shorts/8_K4HoV3odA"
    "https://www.youtube.com/shorts/9_L5IpW4peB"
    "https://www.youtube.com/shorts/0_M6JqX5qfC"
)

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    log "❌ Error: $1"
    exit 1
}

# Check T1 server health
check_t1_health() {
    log "🔍 Checking T1 server health..."
    if ! curl -s http://localhost:8080/healthz | jq -e '.status == "healthy"' > /dev/null; then
        handle_error "T1 server is not healthy"
    fi
    log "✅ T1 server is healthy"
}

# Extract metadata for a URL
extract_metadata() {
    local platform=$1
    local url=$2
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        log "📡 Extracting metadata for $platform: $url (attempt $((retry_count + 1)))"
        
        local response
        case $platform in
            "instagram")
                response=$(curl -sS -X POST http://localhost:8080/api/instagram/metadata \
                    -H 'Content-Type: application/json' \
                    -d "{\"url\":\"$url\"}" 2>/dev/null || echo "")
                ;;
            "tiktok")
                response=$(curl -sS -X POST http://localhost:8080/api/tiktok/metadata \
                    -H 'Content-Type: application/json' \
                    -d "{\"url\":\"$url\"}" 2>/dev/null || echo "")
                ;;
            "youtube")
                response=$(curl -sS -X POST http://localhost:8080/api/youtube/metadata \
                    -H 'Content-Type: application/json' \
                    -d "{\"url\":\"$url\"}" 2>/dev/null || echo "")
                ;;
        esac
        
        if [ -n "$response" ] && echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
            log "✅ Metadata extracted successfully for $platform: $url"
            echo "$response"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            log "⚠️ Retrying metadata extraction for $platform: $url (attempt $((retry_count + 1)))"
            sleep $DELAY_BETWEEN_REQUESTS
        fi
    done
    
    log "❌ Failed to extract metadata for $platform: $url after $MAX_RETRIES attempts"
    return 1
}

# Generate VDP for a URL
generate_vdp() {
    local platform=$1
    local url=$2
    local metadata=$3
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        log "🎬 Generating VDP for $platform: $url (attempt $((retry_count + 1)))"
        
        local content_id
        case $platform in
            "instagram")
                content_id=$(echo "$metadata" | jq -r '.metadata.content_id' 2>/dev/null || echo "")
                ;;
            "tiktok")
                content_id=$(echo "$metadata" | jq -r '.metadata.content_id' 2>/dev/null || echo "")
                ;;
            "youtube")
                content_id=$(echo "$metadata" | jq -r '.metadata.content_id' 2>/dev/null || echo "")
                ;;
        esac
        
        if [ -z "$content_id" ]; then
            log "❌ Could not extract content_id from metadata"
            return 1
        fi
        
        local vdp_payload
        case $platform in
            "instagram")
                vdp_payload=$(echo "$metadata" | jq -c '{
                    platform: "instagram",
                    content_id: .metadata.content_id,
                    metadata: {
                        like_count: .metadata.metadata.like_count,
                        comment_count: .metadata.metadata.comment_count,
                        title: .metadata.metadata.title,
                        author: .metadata.metadata.author.username
                    }
                }' 2>/dev/null || echo "")
                ;;
            "tiktok")
                vdp_payload=$(echo "$metadata" | jq -c '{
                    platform: "tiktok",
                    content_id: .metadata.content_id,
                    metadata: {
                        like_count: .metadata.metadata.like_count,
                        comment_count: .metadata.metadata.comment_count,
                        title: .metadata.metadata.title,
                        author: .metadata.metadata.author.username
                    }
                }' 2>/dev/null || echo "")
                ;;
            "youtube")
                vdp_payload=$(echo "$metadata" | jq -c '{
                    platform: "youtube",
                    content_id: .metadata.content_id,
                    metadata: {
                        like_count: .metadata.metadata.like_count,
                        comment_count: .metadata.metadata.comment_count,
                        title: .metadata.metadata.title,
                        author: .metadata.metadata.author.username
                    }
                }' 2>/dev/null || echo "")
                ;;
        esac
        
        if [ -z "$vdp_payload" ]; then
            log "❌ Could not create VDP payload"
            return 1
        fi
        
        local response
        response=$(curl -sS -X POST http://localhost:8080/api/vdp/extract-main \
            -H 'Content-Type: application/json' \
            -d "$vdp_payload" 2>/dev/null || echo "")
        
        if [ -n "$response" ] && echo "$response" | jq -e '.overall_analysis.hookGenome' > /dev/null 2>&1; then
            log "✅ VDP generated successfully for $platform: $url"
            echo "$response"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            log "⚠️ Retrying VDP generation for $platform: $url (attempt $((retry_count + 1)))"
            sleep $DELAY_BETWEEN_REQUESTS
        fi
    done
    
    log "❌ Failed to generate VDP for $platform: $url after $MAX_RETRIES attempts"
    return 1
}

# Process URLs for a platform
process_platform() {
    local platform=$1
    shift
    local urls=("$@")
    local results=()
    
    log "🚀 Starting processing for $platform platform (${#urls[@]} URLs)"
    
    for url in "${urls[@]}"; do
        log "📋 Processing $platform URL: $url"
        
        # Extract metadata
        local metadata
        if metadata=$(extract_metadata "$platform" "$url"); then
            # Generate VDP
            local vdp
            if vdp=$(generate_vdp "$platform" "$url" "$metadata"); then
                results+=("$vdp")
                log "✅ Successfully processed $platform: $url"
            else
                log "❌ Failed to generate VDP for $platform: $url"
            fi
        else
            log "❌ Failed to extract metadata for $platform: $url"
        fi
        
        # Delay between requests
        sleep $DELAY_BETWEEN_REQUESTS
    done
    
    log "📊 Completed processing for $platform: ${#results[@]}/${#urls[@]} successful"
    
    # Save results to file
    local output_file="bulk-vdp-results-$platform.json"
    printf '%s\n' "${results[@]}" | jq -s '.' > "$output_file"
    log "💾 Saved $platform results to $output_file"
    
    echo "${#results[@]}"
}

# Main execution
main() {
    log "🚀 Starting bulk VDP generation for BigQuery loading"
    
    # Check T1 server health
    check_t1_health
    
    # Create results directory
    mkdir -p bulk-vdp-results
    
    # Process each platform
    local total_successful=0
    
    log "📱 Processing Instagram URLs..."
    local instagram_success
    instagram_success=$(process_platform "instagram" "${INSTAGRAM_URLS[@]}")
    total_successful=$((total_successful + instagram_success))
    
    log "🎵 Processing TikTok URLs..."
    local tiktok_success
    tiktok_success=$(process_platform "tiktok" "${TIKTOK_URLS[@]}")
    total_successful=$((total_successful + tiktok_success))
    
    log "📺 Processing YouTube Shorts URLs..."
    local youtube_success
    youtube_success=$(process_platform "youtube" "${YOUTUBE_SHORTS_URLS[@]}")
    total_successful=$((total_successful + youtube_success))
    
    # Generate summary report
    local total_urls=$((${#INSTAGRAM_URLS[@]} + ${#TIKTOK_URLS[@]} + ${#YOUTUBE_SHORTS_URLS[@]}))
    local success_rate=$(echo "scale=2; $total_successful * 100 / $total_urls" | bc)
    
    log "📈 Bulk VDP generation completed!"
    log "📊 Summary: $total_successful/$total_urls successful ($success_rate%)"
    log "📁 Results saved in bulk-vdp-results-*.json files"
    
    # Create combined results file
    jq -s 'add' bulk-vdp-results-*.json > bulk-vdp-results/combined-vdp-dataset.json
    log "💾 Combined dataset saved to bulk-vdp-results/combined-vdp-dataset.json"
    
    log "🎉 Ready for BigQuery loading!"
}

# Run main function
main "$@"

