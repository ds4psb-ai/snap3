#!/bin/bash
# VDP to GOLD JSONL Pipeline
# Converts VDP files to JSONL format for BigQuery loading

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT:-tough-variety-466003-c5}"
DATASET="${DATASET:-vdp_dataset}"
TABLE="${TABLE:-vdp_gold}"
GOLD_BUCKET="${GOLD_BUCKET:-tough-variety-gold}"

# Usage
usage() {
    echo -e "${CYAN}VDP to GOLD JSONL Pipeline${NC}"
    echo "=========================="
    echo ""
    echo "Converts VDP files to JSONL format and loads to BigQuery"
    echo ""
    echo "Usage: $0 <vdp_pattern> [options]"
    echo ""
    echo "Options:"
    echo "  --date YYYY-MM-DD    Set specific load date (default: today)"
    echo "  --output-dir DIR     Output directory (default: out/gold/DATE)"
    echo "  --upload-gcs         Upload JSONL to GCS"
    echo "  --load-bq            Load to BigQuery"
    echo "  --validate           Validate before processing"
    echo ""
    echo "Examples:"
    echo "  $0 '/tmp/*.vdp.json' --validate --upload-gcs --load-bq"
    echo "  $0 'out/hook/*.vdp.json' --date 2025-08-15"
    echo ""
    echo "Environment Variables:"
    echo "  GCP_PROJECT=$PROJECT_ID"
    echo "  DATASET=$DATASET"
    echo "  TABLE=$TABLE"
    echo "  GOLD_BUCKET=$GOLD_BUCKET"
    exit 1
}

# Default values
LOAD_DATE=$(date +%F)
OUTPUT_DIR=""
DO_VALIDATE=false
DO_UPLOAD_GCS=false
DO_LOAD_BQ=false
VDP_PATTERN=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --date)
            LOAD_DATE="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --upload-gcs)
            DO_UPLOAD_GCS=true
            shift
            ;;
        --load-bq)
            DO_LOAD_BQ=true
            shift
            ;;
        --validate)
            DO_VALIDATE=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            if [[ -z "$VDP_PATTERN" ]]; then
                VDP_PATTERN="$1"
            else
                echo -e "${RED}❌ Unknown option: $1${NC}"
                usage
            fi
            shift
            ;;
    esac
done

if [[ -z "$VDP_PATTERN" ]]; then
    echo -e "${RED}❌ VDP file pattern required${NC}"
    usage
fi

# Set default output directory
if [[ -z "$OUTPUT_DIR" ]]; then
    OUTPUT_DIR="out/gold/$LOAD_DATE"
fi

echo -e "${CYAN}🏆 VDP to GOLD JSONL Pipeline${NC}"
echo "=============================="
echo -e "📁 VDP Pattern: ${YELLOW}$VDP_PATTERN${NC}"
echo -e "📅 Load Date: ${YELLOW}$LOAD_DATE${NC}"
echo -e "📂 Output Dir: ${YELLOW}$OUTPUT_DIR${NC}"
echo -e "🏗️  Project: ${YELLOW}$PROJECT_ID${NC}"
echo -e "📊 Dataset: ${YELLOW}$DATASET.$TABLE${NC}"
echo -e "☁️  GCS Bucket: ${YELLOW}$GOLD_BUCKET${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Count input files
FILES=($(ls $VDP_PATTERN 2>/dev/null || true))
if [ ${#FILES[@]} -eq 0 ]; then
    echo -e "${RED}❌ No VDP files found matching pattern: $VDP_PATTERN${NC}"
    exit 1
fi

echo -e "📊 Found ${#FILES[@]} VDP file(s) to process"
echo ""

# Validation step
if [ "$DO_VALIDATE" = true ]; then
    echo -e "${PURPLE}🔍 Step 1: Validation${NC}"
    echo "==================="
    
    # Hook Gate validation
    echo -e "${YELLOW}🎯 Running Hook Gate validation...${NC}"
    if ./scripts/validate-hook-gate.sh "$VDP_PATTERN"; then
        echo -e "${GREEN}✅ Hook Gate validation passed${NC}"
    else
        echo -e "${RED}❌ Hook Gate validation failed${NC}"
        exit 1
    fi
    
    # Schema validation
    echo -e "${YELLOW}📋 Running Schema validation...${NC}"
    if ./scripts/validate-vdp-schema.sh "$VDP_PATTERN"; then
        echo -e "${GREEN}✅ Schema validation passed${NC}"
    else
        echo -e "${RED}❌ Schema validation failed${NC}"
        exit 1
    fi
    
    echo ""
fi

# JSONL Generation
echo -e "${PURPLE}📄 Step 2: JSONL Generation${NC}"
echo "==========================="

JSONL_FILE="$OUTPUT_DIR/vdp-gold.jsonl"
JSONL_COUNT=0

echo -e "${YELLOW}🔄 Converting VDP files to JSONL...${NC}"

# Process each VDP file
for file in "${FILES[@]}"; do
    filename=$(basename "$file")
    echo -e "   Processing: $filename"
    
    # Convert to JSONL with load metadata
    if jq -c --arg load_date "$LOAD_DATE" '{
        content_id,
        metadata,
        overall_analysis,
        scenes,
        product_mentions,
        service_mentions,
        default_lang,
        load_date: $load_date,
        load_timestamp: (now | todateiso8601),
        source_file: input_filename
    }' "$file" >> "$JSONL_FILE" 2>/dev/null; then
        JSONL_COUNT=$((JSONL_COUNT + 1))
    else
        echo -e "      ${RED}❌ Failed to convert $filename${NC}"
    fi
done

if [ $JSONL_COUNT -eq 0 ]; then
    echo -e "${RED}❌ No files were successfully converted to JSONL${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Generated JSONL: $JSONL_FILE${NC}"
echo -e "📊 Records: $JSONL_COUNT"

# Show sample record
echo -e "${YELLOW}📋 Sample JSONL record:${NC}"
head -1 "$JSONL_FILE" | jq -r '{content_id, load_date, load_timestamp, source_file}'

echo ""

# GCS Upload step
if [ "$DO_UPLOAD_GCS" = true ]; then
    echo -e "${PURPLE}☁️  Step 3: GCS Upload${NC}"
    echo "==================="
    
    GCS_PATH="gs://$GOLD_BUCKET/dt=$LOAD_DATE/vdp-gold.jsonl"
    
    echo -e "${YELLOW}📤 Uploading to GCS: $GCS_PATH${NC}"
    
    if gsutil cp "$JSONL_FILE" "$GCS_PATH"; then
        echo -e "${GREEN}✅ GCS upload successful${NC}"
        
        # Verify upload
        GCS_SIZE=$(gsutil stat "$GCS_PATH" | grep "Content-Length" | awk '{print $2}')
        LOCAL_SIZE=$(wc -c < "$JSONL_FILE")
        echo -e "📊 Local size: $LOCAL_SIZE bytes"
        echo -e "📊 GCS size: $GCS_SIZE bytes"
        
        if [ "$GCS_SIZE" = "$LOCAL_SIZE" ]; then
            echo -e "${GREEN}✅ Size verification passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Size mismatch - check upload${NC}"
        fi
    else
        echo -e "${RED}❌ GCS upload failed${NC}"
        exit 1
    fi
    
    echo ""
fi

# BigQuery Load step
if [ "$DO_LOAD_BQ" = true ]; then
    echo -e "${PURPLE}📊 Step 4: BigQuery Load${NC}"
    echo "========================="
    
    if [ "$DO_UPLOAD_GCS" = true ]; then
        # Load from GCS
        BQ_SOURCE="gs://$GOLD_BUCKET/dt=$LOAD_DATE/vdp-gold.jsonl"
    else
        # Load from local file
        BQ_SOURCE="$JSONL_FILE"
    fi
    
    echo -e "${YELLOW}📥 Loading to BigQuery from: $BQ_SOURCE${NC}"
    echo -e "🎯 Table: ${PROJECT_ID}:${DATASET}.${TABLE}"
    
    if bq load \
        --source_format=NEWLINE_DELIMITED_JSON \
        --ignore_unknown_values \
        --schema_update_option=ALLOW_FIELD_ADDITION \
        --max_bad_records=10 \
        "${PROJECT_ID}:${DATASET}.${TABLE}" \
        "$BQ_SOURCE"; then
        
        echo -e "${GREEN}✅ BigQuery load successful${NC}"
        
        # Verify load
        echo -e "${YELLOW}🔍 Verifying BigQuery load...${NC}"
        LOADED_COUNT=$(bq query --use_legacy_sql=false --format=csv \
            "SELECT COUNT(*) FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\` WHERE load_date = '$LOAD_DATE'" | tail -1)
        
        echo -e "📊 Records loaded today: $LOADED_COUNT"
        
        if [ "$LOADED_COUNT" -ge "$JSONL_COUNT" ]; then
            echo -e "${GREEN}✅ Load verification passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Record count mismatch - check load${NC}"
        fi
    else
        echo -e "${RED}❌ BigQuery load failed${NC}"
        exit 1
    fi
    
    echo ""
fi

# Final Summary
echo -e "${CYAN}🎉 Pipeline Completed Successfully!${NC}"
echo "================================="
echo -e "📁 VDP Files Processed: ${#FILES[@]}"
echo -e "📄 JSONL Records: $JSONL_COUNT"
echo -e "📅 Load Date: $LOAD_DATE"
echo -e "📂 Output Directory: $OUTPUT_DIR"

if [ "$DO_UPLOAD_GCS" = true ]; then
    echo -e "☁️  GCS Path: gs://$GOLD_BUCKET/dt=$LOAD_DATE/vdp-gold.jsonl"
fi

if [ "$DO_LOAD_BQ" = true ]; then
    echo -e "📊 BigQuery Table: ${PROJECT_ID}:${DATASET}.${TABLE}"
fi

echo -e "${GREEN}🚀 VDP data ready for analysis!${NC}"