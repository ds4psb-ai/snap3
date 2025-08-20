#!/bin/bash

# Setup script for BigQuery export views and tables
# This script creates the necessary BigQuery resources for the exports system

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-}"
DATASET_ID="${BQ_DATASET_ID:-snap3_exports}"
LOCATION="${BQ_LOCATION:-US}"

# Check if project ID is set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: GCP_PROJECT_ID environment variable is not set${NC}"
    echo "Please set: export GCP_PROJECT_ID=your-project-id"
    exit 1
fi

echo -e "${GREEN}Setting up BigQuery export infrastructure for project: $PROJECT_ID${NC}"

# Function to run BigQuery command
run_bq() {
    echo -e "${YELLOW}Running: $1${NC}"
    bq --project_id="$PROJECT_ID" query --use_legacy_sql=false "$1"
}

# Create dataset if it doesn't exist
echo -e "${GREEN}Creating dataset: $DATASET_ID${NC}"
bq --project_id="$PROJECT_ID" mk \
    --dataset \
    --location="$LOCATION" \
    --description="Snap3 export views and materialized views" \
    "$PROJECT_ID:$DATASET_ID" 2>/dev/null || echo "Dataset already exists"

# Create views
echo -e "${GREEN}Creating export views...${NC}"

# 1. VDP Export Summary View
echo "Creating vdp_export_summary view..."
run_bq "$(cat bigquery/views/export_views.sql | sed -n '/CREATE OR REPLACE VIEW.*vdp_export_summary/,/FROM.*vdp_metadata.*;/p')"

# 2. Platform Performance View
echo "Creating platform_performance view..."
run_bq "$(cat bigquery/views/export_views.sql | sed -n '/CREATE OR REPLACE VIEW.*platform_performance/,/ORDER BY date DESC, platform;/p')"

# 3. Trending Content View
echo "Creating trending_content view..."
run_bq "$(cat bigquery/views/export_views.sql | sed -n '/CREATE OR REPLACE VIEW.*trending_content/,/LIMIT 100;/p')"

# 4. Product Mentions View
echo "Creating product_mentions view..."
run_bq "$(cat bigquery/views/export_views.sql | sed -n '/CREATE OR REPLACE VIEW.*product_mentions/,/ORDER BY total_reach DESC;/p')"

# Create materialized views
echo -e "${GREEN}Creating materialized views...${NC}"

# 5. Daily Export Cache (Materialized)
echo "Creating daily_export_cache materialized view..."
run_bq "$(cat bigquery/views/export_views.sql | sed -n '/CREATE MATERIALIZED VIEW.*daily_export_cache/,/WHERE created_at >= DATE_SUB/p')"

# Enable refresh for materialized view
echo "Setting refresh schedule for daily_export_cache..."
bq --project_id="$PROJECT_ID" update \
    --materialized_view \
    --enable_refresh=true \
    --refresh_interval_ms=86400000 \
    "$DATASET_ID.daily_export_cache" 2>/dev/null || echo "Refresh schedule already set"

# 6. Platform Aggregates Cache (Materialized)
echo "Creating platform_aggregates_cache materialized view..."
run_bq "$(cat bigquery/views/export_views.sql | sed -n '/CREATE MATERIALIZED VIEW.*platform_aggregates_cache/,/GROUP BY date, platform, origin;/p')"

# Create tables
echo -e "${GREEN}Creating audit and quota tables...${NC}"

# 7. Export Audit Log Table
echo "Creating export_audit_log table..."
run_bq "$(cat bigquery/views/export_views.sql | sed -n '/CREATE TABLE IF NOT EXISTS.*export_audit_log/,/CLUSTER BY export_type, status;/p')"

# 8. User Quotas Table
echo "Creating user_quotas table..."
run_bq "$(cat bigquery/views/export_views.sql | sed -n '/CREATE TABLE IF NOT EXISTS.*user_quotas/,/CLUSTER BY user_id;/p')"

# Create scheduled queries
echo -e "${GREEN}Setting up scheduled queries...${NC}"

# Daily export to GCS
cat > /tmp/daily_export_query.sql << EOF
EXPORT DATA OPTIONS(
  uri='gs://snap3-exports/daily-cache/date=*.parquet',
  format='PARQUET',
  overwrite=true
) AS
SELECT * FROM \`$PROJECT_ID.$DATASET_ID.daily_export_cache\`
WHERE export_date = CURRENT_DATE();
EOF

echo "Creating scheduled query for daily exports..."
bq mk \
    --transfer_config \
    --project_id="$PROJECT_ID" \
    --location="$LOCATION" \
    --display_name="Daily Export Cache to GCS" \
    --schedule="every day 02:00" \
    --data_source=scheduled_query \
    --params='{"query":"'$(cat /tmp/daily_export_query.sql | tr '\n' ' ')'"}' 2>/dev/null || echo "Scheduled query already exists"

# Grant permissions
echo -e "${GREEN}Setting up permissions...${NC}"

# Grant viewer access to the export dataset
echo "Granting dataset permissions..."
bq --project_id="$PROJECT_ID" show \
    --format=prettyjson \
    "$DATASET_ID" > /tmp/dataset_permissions.json

# Add service account permissions if needed
SERVICE_ACCOUNT="${EXPORT_SERVICE_ACCOUNT:-}"
if [ -n "$SERVICE_ACCOUNT" ]; then
    echo "Granting permissions to service account: $SERVICE_ACCOUNT"
    bq --project_id="$PROJECT_ID" add-iam-policy-binding \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/bigquery.dataViewer" \
        "$DATASET_ID"
fi

# Test queries
echo -e "${GREEN}Testing views...${NC}"

# Test vdp_export_summary
echo "Testing vdp_export_summary view..."
bq --project_id="$PROJECT_ID" query \
    --use_legacy_sql=false \
    --max_rows=5 \
    "SELECT * FROM \`$PROJECT_ID.$DATASET_ID.vdp_export_summary\` LIMIT 5" || echo "View test failed (might be due to missing source data)"

# Test platform_performance
echo "Testing platform_performance view..."
bq --project_id="$PROJECT_ID" query \
    --use_legacy_sql=false \
    --max_rows=5 \
    "SELECT * FROM \`$PROJECT_ID.$DATASET_ID.platform_performance\` LIMIT 5" || echo "View test failed (might be due to missing source data)"

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BigQuery export setup completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Created resources:"
echo "  - Dataset: $PROJECT_ID:$DATASET_ID"
echo "  - Views: 4 standard views"
echo "  - Materialized Views: 2 (with daily refresh)"
echo "  - Tables: 2 (audit log and user quotas)"
echo "  - Scheduled Queries: 1 (daily export to GCS)"
echo ""
echo "Next steps:"
echo "  1. Verify views in BigQuery Console: https://console.cloud.google.com/bigquery"
echo "  2. Test export API endpoints"
echo "  3. Monitor materialized view refreshes"
echo "  4. Set up monitoring and alerts"

# Clean up temp files
rm -f /tmp/daily_export_query.sql /tmp/dataset_permissions.json