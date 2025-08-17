#!/usr/bin/env bash
set -euo pipefail

# 🎯 VDP Parallel Batch Pipeline: Process multiple YouTube/Shorts videos in parallel
# Usage: ./vdp-parallel-batch.sh url1 url2 url3 ...
# Or: ./vdp-parallel-batch.sh -f urls.txt

# Function to process a single URL
process_url() {
    local url="$1"
    local log_file="vdp-batch-$(date +%Y%m%d-%H%M%S)-$(echo "$url" | sed 's|.*/||').log"
    
    echo "🔄 Starting processing: $url"
    
    # Call the one-shot pipeline with logging (includes quality checks)
    if ./scripts/vdp-oneshot-pipeline.sh "$url" > "$log_file" 2>&1; then
        echo "✅ Completed: $url (log: $log_file)"
        return 0
    else
        echo "❌ Failed: $url (log: $log_file)"
        return 1
    fi
}

# Function to process URLs from file
process_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "❌ File not found: $file"
        exit 1
    fi
    
    echo "📁 Processing URLs from file: $file"
    local urls=()
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
            urls+=("$line")
        fi
    done < "$file"
    
    echo "📊 Found ${#urls[@]} URLs to process"
    return 0
}

# Main script logic
main() {
    if [[ $# -eq 0 ]]; then
        echo "❌ Usage: $0 url1 url2 url3 ..."
        echo "   Or: $0 -f urls.txt"
        exit 1
    fi
    
    # Check if we're processing from file
    if [[ "$1" == "-f" ]]; then
        if [[ $# -ne 2 ]]; then
            echo "❌ Usage: $0 -f urls.txt"
            exit 1
        fi
        process_file "$2"
        # Read URLs from file into array
        urls=()
        while IFS= read -r line; do
            if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
                urls+=("$line")
            fi
        done < "$2"
    else
        # URLs provided as arguments
        urls=("$@")
    fi
    
    if [[ ${#urls[@]} -eq 0 ]]; then
        echo "❌ No valid URLs found"
        exit 1
    fi
    
    echo "🚀 Starting VDP Parallel Batch Pipeline"
    echo "📊 Processing ${#urls[@]} URLs with parallel execution"
    
    # Required environment check
    : "${GCP_PROJECT:?Set GCP_PROJECT}"
    : "${RAW_BUCKET:?Set RAW_BUCKET}"
    : "${YOUTUBE_API_KEY:?Set YOUTUBE_API_KEY}"
    
    # Optional environment variables with defaults
    T2_URL="${T2_URL:-http://localhost:3001/api/v1/extract}"
    MAX_PARALLEL="${MAX_PARALLEL:-3}"  # Default to 3 parallel jobs
    
    echo "🌐 Configuration:"
    echo "  - GCP Project: $GCP_PROJECT"
    echo "  - Raw Bucket: $RAW_BUCKET"
    echo "  - T2 URL: $T2_URL"
    echo "  - Max Parallel: $MAX_PARALLEL"
    
    # Create results tracking
    local start_time=$(date +%s)
    local success_count=0
    local failure_count=0
    local pids=()
    local results=()
    
    # Process URLs in parallel batches
    for ((i=0; i<${#urls[@]}; i+=MAX_PARALLEL)); do
        # Start batch of parallel processes
        batch_pids=()
        for ((j=i; j<i+MAX_PARALLEL && j<${#urls[@]}; j++)); do
            url="${urls[j]}"
            echo "🔄 Starting batch item $((j+1))/${#urls[@]}: $url"
            
            # Start background process
            (
                if process_url "$url"; then
                    echo "BATCH_SUCCESS:$url"
                else
                    echo "BATCH_FAILURE:$url"
                fi
            ) &
            
            batch_pids+=($!)
        done
        
        # Wait for current batch to complete
        echo "⏳ Waiting for batch of ${#batch_pids[@]} processes..."
        for pid in "${batch_pids[@]}"; do
            if wait "$pid"; then
                ((success_count++))
            else
                ((failure_count++))
            fi
        done
        
        echo "📈 Batch completed. Success: $success_count, Failures: $failure_count"
    done
    
    # Calculate final results
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local total_count=$((success_count + failure_count))
    
    echo ""
    echo "🎉 VDP Parallel Batch Pipeline Complete!"
    echo "📊 Final Results:"
    echo "  - Total URLs: ${#urls[@]}"
    echo "  - Successful: $success_count"
    echo "  - Failed: $failure_count"
    echo "  - Duration: ${duration}s"
    echo "  - Average: $((duration / total_count))s per URL"
    
    # List log files
    echo ""
    echo "📋 Log files generated:"
    ls -la vdp-batch-*.log 2>/dev/null || echo "  (No log files found)"
    
    # Exit with error if any failures
    if [[ $failure_count -gt 0 ]]; then
        echo "⚠️ Some URLs failed processing. Check log files for details."
        exit 1
    fi
    
    echo "✅ All URLs processed successfully!"
}

# Export the process_url function for potential standalone use
export -f process_url

# Run main function with all arguments
main "$@"