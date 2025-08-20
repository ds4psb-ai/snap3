#!/bin/bash
# Cross-Platform Content Similarity Detection
# Uses frame sampling + SHA256 hashing + Jaccard similarity

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="${TEMP_DIR:-/tmp}"

# Configuration
FRAME_RATE="${FRAME_RATE:-1}"  # 1fps sampling
FRAME_SIZE="${FRAME_SIZE:-32x32}"  # 32x32 grayscale for fast comparison
SIMILARITY_THRESHOLD_HIGH="${SIMILARITY_THRESHOLD_HIGH:-0.3}"
SIMILARITY_THRESHOLD_MEDIUM="${SIMILARITY_THRESHOLD_MEDIUM:-0.1}"

usage() {
    cat << EOF
Usage: $0 <video_A> <video_B> [options]

Cross-platform content similarity detection using frame sampling.

Arguments:
    video_A         Path to first video file
    video_B         Path to second video file

Options:
    --fps N         Frame sampling rate (default: 1fps)
    --size WxH      Frame size for comparison (default: 32x32) 
    --temp-dir DIR  Temporary directory (default: /tmp)
    --cleanup       Remove temporary files after analysis
    --verbose       Show detailed processing steps
    --json          Output results in JSON format

Similarity Thresholds:
    > 0.3           HIGH similarity (likely same content)
    0.1 - 0.3       MEDIUM similarity (possibly related) 
    < 0.1           LOW similarity (different content)

Example:
    $0 video1.mp4 video2.mp4 --cleanup --verbose
    $0 tiktok.mp4 youtube.mp4 --fps 2 --json

EOF
}

log() {
    if [[ "${VERBOSE:-0}" == "1" ]]; then
        echo "[$(date '+%H:%M:%S')] $*" >&2
    fi
}

error() {
    echo "ERROR: $*" >&2
    exit 1
}

cleanup_temp() {
    if [[ "${CLEANUP:-0}" == "1" && -n "${WORK_DIR:-}" ]]; then
        log "Cleaning up temporary files: $WORK_DIR"
        rm -rf "$WORK_DIR"
    fi
}

extract_frame_hashes() {
    local video_file="$1"
    local output_dir="$2"
    local hash_file="$3"
    
    log "Extracting frames from $(basename "$video_file")"
    
    # Create output directory
    mkdir -p "$output_dir"
    
    # Extract frames using FFmpeg
    ffmpeg -i "$video_file" \
        -vf "fps=$FRAME_RATE,scale=$FRAME_SIZE,format=gray" \
        -y "$output_dir/%04d.png" \
        2>/dev/null || error "Failed to extract frames from $video_file"
    
    local frame_count=$(find "$output_dir" -name "*.png" | wc -l)
    log "Extracted $frame_count frames"
    
    # Generate SHA256 hashes
    log "Generating SHA256 hashes"
    find "$output_dir" -name "*.png" | sort | xargs sha256sum | awk '{print $1}' > "$hash_file"
    
    log "Generated $(wc -l < "$hash_file") unique hashes"
}

calculate_jaccard_similarity() {
    local hash_file_a="$1"
    local hash_file_b="$2"
    
    log "Calculating Jaccard similarity coefficient"
    
    # Calculate intersection and union
    local intersection=$(comm -12 <(sort "$hash_file_a") <(sort "$hash_file_b") | wc -l)
    local union=$(cat "$hash_file_a" "$hash_file_b" | sort -u | wc -l)
    
    # Calculate Jaccard coefficient: J(A,B) = |A∩B| / |A∪B|
    local jaccard
    if [[ "$union" -eq 0 ]]; then
        jaccard="0"
    else
        jaccard=$(echo "scale=4; $intersection / $union" | bc -l)
    fi
    
    echo "$jaccard"
}

classify_similarity() {
    local jaccard="$1"
    
    if (( $(echo "$jaccard > $SIMILARITY_THRESHOLD_HIGH" | bc -l) )); then
        echo "HIGH"
    elif (( $(echo "$jaccard > $SIMILARITY_THRESHOLD_MEDIUM" | bc -l) )); then
        echo "MEDIUM" 
    else
        echo "LOW"
    fi
}

output_results() {
    local video_a="$1"
    local video_b="$2"
    local jaccard="$3"
    local classification="$4"
    local frames_a="$5"
    local frames_b="$6"
    local intersection="$7"
    local union="$8"
    
    if [[ "${JSON_OUTPUT:-0}" == "1" ]]; then
        cat << EOF
{
  "similarity_analysis": {
    "video_a": "$(basename "$video_a")",
    "video_b": "$(basename "$video_b")",
    "jaccard_coefficient": $jaccard,
    "classification": "$classification",
    "frame_analysis": {
      "video_a_frames": $frames_a,
      "video_b_frames": $frames_b,
      "intersection_frames": $intersection,
      "union_frames": $union
    },
    "parameters": {
      "frame_rate": "$FRAME_RATE",
      "frame_size": "$FRAME_SIZE",
      "thresholds": {
        "high": $SIMILARITY_THRESHOLD_HIGH,
        "medium": $SIMILARITY_THRESHOLD_MEDIUM
      }
    },
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
    else
        echo "=== Cross-Platform Content Similarity Analysis ==="
        echo "Video A: $(basename "$video_a") ($frames_a frames)"
        echo "Video B: $(basename "$video_b") ($frames_b frames)"
        echo
        echo "Frame Analysis:"
        echo "  Intersection |A∩B|: $intersection"
        echo "  Union |A∪B|: $union"
        echo
        echo "🎯 Jaccard Similarity J(A,B) = $jaccard"
        echo
        case "$classification" in
            "HIGH")
                echo "✅ HIGH similarity detected (>$SIMILARITY_THRESHOLD_HIGH) - Likely same content"
                ;;
            "MEDIUM")
                echo "⚠️ MEDIUM similarity ($SIMILARITY_THRESHOLD_MEDIUM-$SIMILARITY_THRESHOLD_HIGH) - Possible related content"
                ;;
            "LOW")
                echo "❌ LOW similarity (<$SIMILARITY_THRESHOLD_MEDIUM) - Different content"
                ;;
        esac
    fi
}

main() {
    local video_a=""
    local video_b=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --fps)
                FRAME_RATE="$2"
                shift 2
                ;;
            --size)
                FRAME_SIZE="$2"
                shift 2
                ;;
            --temp-dir)
                TEMP_DIR="$2"
                shift 2
                ;;
            --cleanup)
                CLEANUP=1
                shift
                ;;
            --verbose)
                VERBOSE=1
                shift
                ;;
            --json)
                JSON_OUTPUT=1
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            -*)
                error "Unknown option: $1"
                ;;
            *)
                if [[ -z "$video_a" ]]; then
                    video_a="$1"
                elif [[ -z "$video_b" ]]; then
                    video_b="$1"
                else
                    error "Too many arguments"
                fi
                shift
                ;;
        esac
    done
    
    # Validate arguments
    [[ -z "$video_a" ]] && error "Missing video_A argument"
    [[ -z "$video_b" ]] && error "Missing video_B argument"
    [[ ! -f "$video_a" ]] && error "Video A not found: $video_a"
    [[ ! -f "$video_b" ]] && error "Video B not found: $video_b"
    
    # Check dependencies
    command -v ffmpeg >/dev/null || error "ffmpeg not found"
    command -v bc >/dev/null || error "bc not found"
    
    # Setup working directory
    WORK_DIR="$(mktemp -d "$TEMP_DIR/similarity_XXXXXX")"
    trap cleanup_temp EXIT
    
    local frames_dir_a="$WORK_DIR/frames_A"
    local frames_dir_b="$WORK_DIR/frames_B"
    local hash_file_a="$WORK_DIR/hashes_A.txt"
    local hash_file_b="$WORK_DIR/hashes_B.txt"
    
    # Extract frames and generate hashes
    extract_frame_hashes "$video_a" "$frames_dir_a" "$hash_file_a"
    extract_frame_hashes "$video_b" "$frames_dir_b" "$hash_file_b"
    
    # Calculate similarity
    local frames_a=$(wc -l < "$hash_file_a")
    local frames_b=$(wc -l < "$hash_file_b")
    local intersection=$(comm -12 <(sort "$hash_file_a") <(sort "$hash_file_b") | wc -l)
    local union=$(cat "$hash_file_a" "$hash_file_b" | sort -u | wc -l)
    
    local jaccard=$(calculate_jaccard_similarity "$hash_file_a" "$hash_file_b")
    local classification=$(classify_similarity "$jaccard")
    
    # Output results
    output_results "$video_a" "$video_b" "$jaccard" "$classification" "$frames_a" "$frames_b" "$intersection" "$union"
}

main "$@"