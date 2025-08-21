#!/bin/bash

# 🚀 BigQuery VDP Loader Script
# Purpose: Load complete VDP dataset into BigQuery for big data analysis

set -e

# Configuration
PROJECT_ID="tough-variety-466003-c5"
DATASET_ID="vdp_analysis"
TABLE_ID="vdp_complete"
REGION="us-central1"
INPUT_FILE="bulk-vdp-results/combined-vdp-dataset.json"
LOG_FILE="bigquery-vdp-loader.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    log "❌ Error: $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        handle_error "gcloud CLI is not installed"
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        handle_error "jq is not installed"
    fi
    
    # Check if input file exists
    if [ ! -f "$INPUT_FILE" ]; then
        handle_error "Input file $INPUT_FILE does not exist"
    fi
    
    # Check gcloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        handle_error "gcloud is not authenticated"
    fi
    
    log "✅ Prerequisites check passed"
}

# Create BigQuery dataset if it doesn't exist
create_dataset() {
    log "📊 Creating BigQuery dataset if it doesn't exist..."
    
    if ! bq show "$PROJECT_ID:$DATASET_ID" &> /dev/null; then
        log "📁 Creating dataset $DATASET_ID..."
        bq mk --project_id="$PROJECT_ID" --location="$REGION" "$DATASET_ID"
        log "✅ Dataset $DATASET_ID created successfully"
    else
        log "✅ Dataset $DATASET_ID already exists"
    fi
}

# Create BigQuery table schema
create_table_schema() {
    log "📋 Creating BigQuery table schema..."
    
    # Create schema file
    cat > vdp_schema.json << 'EOF'
[
  {
    "name": "content_id",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Unique content identifier"
  },
  {
    "name": "content_key",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Platform:content_id format"
  },
  {
    "name": "platform",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Platform name (instagram, tiktok, youtube)"
  },
  {
    "name": "metadata",
    "type": "RECORD",
    "mode": "REQUIRED",
    "fields": [
      {
        "name": "like_count",
        "type": "INTEGER",
        "mode": "NULLABLE"
      },
      {
        "name": "comment_count",
        "type": "INTEGER",
        "mode": "NULLABLE"
      },
      {
        "name": "view_count",
        "type": "INTEGER",
        "mode": "NULLABLE"
      },
      {
        "name": "share_count",
        "type": "INTEGER",
        "mode": "NULLABLE"
      },
      {
        "name": "title",
        "type": "STRING",
        "mode": "NULLABLE"
      },
      {
        "name": "author",
        "type": "STRING",
        "mode": "NULLABLE"
      },
      {
        "name": "upload_date",
        "type": "TIMESTAMP",
        "mode": "NULLABLE"
      },
      {
        "name": "hashtags",
        "type": "STRING",
        "mode": "REPEATED"
      },
      {
        "name": "source_url",
        "type": "STRING",
        "mode": "NULLABLE"
      }
    ]
  },
  {
    "name": "overall_analysis",
    "type": "RECORD",
    "mode": "REQUIRED",
    "fields": [
      {
        "name": "hookGenome",
        "type": "RECORD",
        "mode": "NULLABLE",
        "fields": [
          {
            "name": "start_sec",
            "type": "FLOAT",
            "mode": "NULLABLE"
          },
          {
            "name": "strength_score",
            "type": "FLOAT",
            "mode": "NULLABLE"
          },
          {
            "name": "pattern_code",
            "type": "STRING",
            "mode": "REPEATED"
          },
          {
            "name": "delivery",
            "type": "STRING",
            "mode": "NULLABLE"
          }
        ]
      },
      {
        "name": "content_summary",
        "type": "STRING",
        "mode": "NULLABLE"
      },
      {
        "name": "emotional_arc",
        "type": "STRING",
        "mode": "NULLABLE"
      },
      {
        "name": "asr_transcript",
        "type": "STRING",
        "mode": "NULLABLE"
      },
      {
        "name": "ocr_text",
        "type": "STRING",
        "mode": "NULLABLE"
      }
    ]
  },
  {
    "name": "scene_analysis",
    "type": "RECORD",
    "mode": "REPEATED",
    "fields": [
      {
        "name": "scene_id",
        "type": "STRING",
        "mode": "REQUIRED"
      },
      {
        "name": "start_time",
        "type": "FLOAT",
        "mode": "REQUIRED"
      },
      {
        "name": "end_time",
        "type": "FLOAT",
        "mode": "REQUIRED"
      },
      {
        "name": "narrative_type",
        "type": "STRING",
        "mode": "REQUIRED"
      },
      {
        "name": "shot_details",
        "type": "RECORD",
        "mode": "NULLABLE",
        "fields": [
          {
            "name": "camera_movement",
            "type": "STRING",
            "mode": "NULLABLE"
          },
          {
            "name": "keyframes",
            "type": "STRING",
            "mode": "REPEATED"
          },
          {
            "name": "composition",
            "type": "STRING",
            "mode": "NULLABLE"
          }
        ]
      }
    ]
  },
  {
    "name": "product_mentions",
    "type": "RECORD",
    "mode": "REPEATED",
    "fields": [
      {
        "name": "product_name",
        "type": "STRING",
        "mode": "REQUIRED"
      },
      {
        "name": "confidence",
        "type": "FLOAT",
        "mode": "REQUIRED"
      }
    ]
  },
  {
    "name": "service_mentions",
    "type": "RECORD",
    "mode": "REPEATED",
    "fields": [
      {
        "name": "service_name",
        "type": "STRING",
        "mode": "REQUIRED"
      },
      {
        "name": "confidence",
        "type": "FLOAT",
        "mode": "REQUIRED"
      }
    ]
  },
  {
    "name": "default_lang",
    "type": "STRING",
    "mode": "REQUIRED"
  },
  {
    "name": "load_timestamp",
    "type": "TIMESTAMP",
    "mode": "REQUIRED"
  },
  {
    "name": "load_date",
    "type": "DATE",
    "mode": "REQUIRED"
  },
  {
    "name": "processing_metadata",
    "type": "RECORD",
    "mode": "NULLABLE",
    "fields": [
      {
        "name": "engine",
        "type": "STRING",
        "mode": "NULLABLE"
      },
      {
        "name": "timestamp",
        "type": "TIMESTAMP",
        "mode": "NULLABLE"
      }
    ]
  }
]
EOF
    
    log "✅ Schema file created: vdp_schema.json"
}

# Create BigQuery table
create_table() {
    log "📊 Creating BigQuery table..."
    
    if ! bq show "$PROJECT_ID:$DATASET_ID.$TABLE_ID" &> /dev/null; then
        log "📋 Creating table $TABLE_ID..."
        bq mk --project_id="$PROJECT_ID" \
             --schema=vdp_schema.json \
             --time_partitioning_field=load_date \
             --time_partitioning_type=DAY \
             "$DATASET_ID.$TABLE_ID"
        log "✅ Table $TABLE_ID created successfully"
    else
        log "✅ Table $TABLE_ID already exists"
    fi
}

# Transform VDP data for BigQuery
transform_vdp_data() {
    log "🔄 Transforming VDP data for BigQuery..."
    
    # Create transformed data file
    local transformed_file="transformed-vdp-data.json"
    
    # Transform the data to match BigQuery schema
    jq -c '.[] | {
        content_id: .content_id,
        content_key: .content_key,
        platform: .platform,
        metadata: {
            like_count: .metadata.like_count,
            comment_count: .metadata.comment_count,
            view_count: .metadata.view_count,
            share_count: .metadata.share_count,
            title: .metadata.title,
            author: .metadata.author,
            upload_date: .metadata.upload_date,
            hashtags: (.metadata.hashtags // []),
            source_url: .metadata.source_url
        },
        overall_analysis: {
            hookGenome: .overall_analysis.hookGenome,
            content_summary: .overall_analysis.content_summary,
            emotional_arc: .overall_analysis.emotional_arc,
            asr_transcript: .overall_analysis.asr_transcript,
            ocr_text: .overall_analysis.ocr_text
        },
        scene_analysis: (.scene_analysis // []),
        product_mentions: (.product_mentions // []),
        service_mentions: (.service_mentions // []),
        default_lang: .default_lang,
        load_timestamp: .load_timestamp,
        load_date: .load_date,
        processing_metadata: .processing_metadata
    }' "$INPUT_FILE" > "$transformed_file"
    
    log "✅ Transformed data saved to $transformed_file"
    echo "$transformed_file"
}

# Load data into BigQuery
load_data_to_bigquery() {
    local transformed_file=$1
    
    log "📤 Loading data into BigQuery..."
    
    # Count records
    local record_count=$(jq -s 'length' "$transformed_file")
    log "📊 Loading $record_count records into BigQuery..."
    
    # Load data
    bq load --project_id="$PROJECT_ID" \
           --source_format=NEWLINE_DELIMITED_JSON \
           --autodetect=false \
           --schema=vdp_schema.json \
           "$DATASET_ID.$TABLE_ID" \
           "$transformed_file"
    
    log "✅ Data loaded successfully into BigQuery"
}

# Verify data loading
verify_data_loading() {
    log "🔍 Verifying data loading..."
    
    # Get row count
    local row_count=$(bq query --project_id="$PROJECT_ID" \
        --use_legacy_sql=false \
        --format=csv \
        "SELECT COUNT(*) as row_count FROM \`$PROJECT_ID.$DATASET_ID.$TABLE_ID\`" | tail -n 1)
    
    log "📊 Total rows in BigQuery table: $row_count"
    
    # Get platform distribution
    log "📈 Platform distribution:"
    bq query --project_id="$PROJECT_ID" \
        --use_legacy_sql=false \
        --format=prettyjson \
        "SELECT platform, COUNT(*) as count FROM \`$PROJECT_ID.$DATASET_ID.$TABLE_ID\` GROUP BY platform ORDER BY count DESC"
    
    # Get recent records
    log "🕒 Recent records:"
    bq query --project_id="$PROJECT_ID" \
        --use_legacy_sql=false \
        --format=prettyjson \
        "SELECT content_id, platform, metadata.like_count, overall_analysis.hookGenome.strength_score FROM \`$PROJECT_ID.$DATASET_ID.$TABLE_ID\` ORDER BY load_timestamp DESC LIMIT 5"
}

# Create BigQuery views for analysis
create_analysis_views() {
    log "📊 Creating BigQuery views for analysis..."
    
    # Hook Genome Analysis View
    bq mk --project_id="$PROJECT_ID" \
         --view="SELECT 
                    content_id,
                    platform,
                    metadata.like_count,
                    metadata.comment_count,
                    overall_analysis.hookGenome.start_sec,
                    overall_analysis.hookGenome.strength_score,
                    overall_analysis.hookGenome.pattern_code,
                    load_date
                 FROM \`$PROJECT_ID.$DATASET_ID.$TABLE_ID\`
                 WHERE overall_analysis.hookGenome IS NOT NULL" \
         "$DATASET_ID.hook_genome_analysis"
    
    # Platform Performance View
    bq mk --project_id="$PROJECT_ID" \
         --view="SELECT 
                    platform,
                    COUNT(*) as total_content,
                    AVG(metadata.like_count) as avg_likes,
                    AVG(metadata.comment_count) as avg_comments,
                    AVG(overall_analysis.hookGenome.strength_score) as avg_hook_strength
                 FROM \`$PROJECT_ID.$DATASET_ID.$TABLE_ID\`
                 GROUP BY platform" \
         "$DATASET_ID.platform_performance"
    
    # High Engagement Content View
    bq mk --project_id="$PROJECT_ID" \
         --view="SELECT 
                    content_id,
                    platform,
                    metadata.like_count,
                    metadata.comment_count,
                    overall_analysis.hookGenome.strength_score,
                    overall_analysis.content_summary
                 FROM \`$PROJECT_ID.$DATASET_ID.$TABLE_ID\`
                 WHERE metadata.like_count > 10000 OR metadata.comment_count > 1000
                 ORDER BY metadata.like_count DESC" \
         "$DATASET_ID.high_engagement_content"
    
    log "✅ Analysis views created successfully"
}

# Main execution
main() {
    log "🚀 Starting BigQuery VDP data loading"
    
    # Check prerequisites
    check_prerequisites
    
    # Create dataset
    create_dataset
    
    # Create schema
    create_table_schema
    
    # Create table
    create_table
    
    # Transform data
    local transformed_file
    transformed_file=$(transform_vdp_data)
    
    # Load data
    load_data_to_bigquery "$transformed_file"
    
    # Verify loading
    verify_data_loading
    
    # Create analysis views
    create_analysis_views
    
    log "🎉 BigQuery VDP data loading completed successfully!"
    log "📊 Dataset: $PROJECT_ID.$DATASET_ID.$TABLE_ID"
    log "📈 Analysis views created for hook genome, platform performance, and high engagement content"
}

# Run main function
main "$@"


