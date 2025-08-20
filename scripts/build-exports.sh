#!/bin/bash

# Build script for Snap3 Exports System
# Target: exports:3002 with API docs + BQ view definitions

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXPORT_PORT=3002
BUILD_DIR="dist/exports"
DOCS_DIR="docs/exports"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Building Snap3 Exports System${NC}"
echo -e "${BLUE}Target: exports:$EXPORT_PORT${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Clean previous builds
echo -e "${YELLOW}Step 1: Cleaning previous builds...${NC}"
rm -rf "$BUILD_DIR" "$DOCS_DIR"
mkdir -p "$BUILD_DIR" "$DOCS_DIR"

# Step 2: Validate environment
echo -e "${YELLOW}Step 2: Validating environment...${NC}"

# Check for required dependencies
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Check GCP tools (optional)
if command -v bq &> /dev/null; then
    echo -e "${GREEN}✓ BigQuery CLI available${NC}"
    BQ_AVAILABLE=true
else
    echo -e "${YELLOW}⚠ BigQuery CLI not available (optional for development)${NC}"
    BQ_AVAILABLE=false
fi

# Step 3: Install dependencies
echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
npm install

# Step 4: Type checking
echo -e "${YELLOW}Step 4: Running type checks...${NC}"
npm run type-check

# Step 5: Build export service
echo -e "${YELLOW}Step 5: Building export service...${NC}"

# Compile TypeScript with exports config
npx tsc --project tsconfig.exports.json

# Copy configuration files
cp exports.config.js "$BUILD_DIR/"
mkdir -p "$BUILD_DIR/views"
cp bigquery/views/export_views.sql "$BUILD_DIR/views/"

# Step 6: Generate API documentation
echo -e "${YELLOW}Step 6: Generating API documentation...${NC}"

# Generate OpenAPI docs
if command -v redoc-cli &> /dev/null; then
    redoc-cli build openapi/exports-api.yaml --output "$DOCS_DIR/api.html"
    echo -e "${GREEN}✓ API documentation generated${NC}"
else
    echo -e "${YELLOW}⚠ redoc-cli not available, copying raw OpenAPI spec${NC}"
    cp openapi/exports-api.yaml "$DOCS_DIR/"
fi

# Copy markdown documentation
cp docs/EXPORTS_API.md "$DOCS_DIR/"
cp docs/DATASET_API.md "$DOCS_DIR/"

# Step 7: Setup BigQuery views (if available)
echo -e "${YELLOW}Step 7: Setting up BigQuery views...${NC}"

if [ "$BQ_AVAILABLE" = true ] && [ -n "$GCP_PROJECT_ID" ]; then
    echo -e "${GREEN}Setting up BigQuery resources...${NC}"
    ./scripts/setup-bigquery-exports.sh
else
    echo -e "${YELLOW}⚠ Skipping BigQuery setup (no GCP credentials or bq CLI)${NC}"
    echo "To set up later, run: ./scripts/setup-bigquery-exports.sh"
fi

# Step 8: Validate build
echo -e "${YELLOW}Step 8: Validating build...${NC}"

# Check if main files exist
REQUIRED_FILES=(
    "$BUILD_DIR/lib/exports/ExportService.js"
    "$BUILD_DIR/exports.config.js"
    "$BUILD_DIR/views/export_views.sql"
    "$DOCS_DIR/EXPORTS_API.md"
    "openapi/exports-api.yaml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ Missing: $file${NC}"
        exit 1
    fi
done

# Step 9: Create startup script
echo -e "${YELLOW}Step 9: Creating startup script...${NC}"

cat > "$BUILD_DIR/start-exports.sh" << 'EOF'
#!/bin/bash

# Startup script for Snap3 Exports Server
# Port: 3002

set -e

echo "Starting Snap3 Exports Server on port 3002..."

# Check environment
if [ -z "$GCP_PROJECT_ID" ]; then
    echo "Warning: GCP_PROJECT_ID not set, using mock data"
fi

if [ -z "$GCS_KEY_FILE" ]; then
    echo "Warning: GCS_KEY_FILE not set, using mock data"
fi

# Start server
export PORT=3002
export NODE_ENV=${NODE_ENV:-production}

# Use PM2 if available, otherwise node directly
if command -v pm2 &> /dev/null; then
    pm2 start src/app.js --name "snap3-exports" --env production
else
    node src/app.js
fi
EOF

chmod +x "$BUILD_DIR/start-exports.sh"

# Step 10: Generate deployment manifest
echo -e "${YELLOW}Step 10: Generating deployment manifest...${NC}"

cat > "$BUILD_DIR/deployment.json" << EOF
{
  "name": "snap3-exports",
  "version": "1.0.0",
  "description": "Snap3 high-performance export API",
  "main": "src/app.js",
  "port": $EXPORT_PORT,
  "environment": {
    "required": [
      "GCP_PROJECT_ID",
      "GCS_KEY_FILE"
    ],
    "optional": [
      "BQ_DATASET_ID",
      "GCS_EXPORT_BUCKET",
      "REQUIRE_API_KEY",
      "API_KEY"
    ]
  },
  "services": {
    "bigquery": {
      "dataset": "snap3_exports",
      "views": [
        "vdp_export_summary",
        "platform_performance", 
        "trending_content",
        "product_mentions"
      ],
      "materializedViews": [
        "daily_export_cache",
        "platform_aggregates_cache"
      ],
      "tables": [
        "export_audit_log",
        "user_quotas"
      ]
    },
    "storage": {
      "bucket": "snap3-exports",
      "permissions": ["storage.objects.create", "storage.objects.get"]
    }
  },
  "api": {
    "openapi": "openapi/exports-api.yaml",
    "documentation": "docs/exports/",
    "endpoints": [
      "POST /api/exports/v1/dataset/export",
      "GET /api/exports/v1/jobs/{jobId}",
      "POST /api/exports/v1/jobs/{jobId}/cancel",
      "GET /api/exports/v1/stream/{exportId}",
      "GET /api/exports/v1/templates"
    ]
  },
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
}
EOF

# Step 11: Run tests (if available)
echo -e "${YELLOW}Step 11: Running tests...${NC}"

if [ -f "package.json" ] && grep -q '"test"' package.json; then
    npm test -- --testPathPattern="exports|export" --passWithNoTests
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠ No tests configured${NC}"
fi

# Step 12: Build summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Build outputs:${NC}"
echo "  📦 Compiled code: $BUILD_DIR/"
echo "  📚 Documentation: $DOCS_DIR/"
echo "  🗄️  BigQuery views: bigquery/views/"
echo "  📋 OpenAPI spec: openapi/exports-api.yaml"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Start exports server: cd $BUILD_DIR && ./start-exports.sh"
echo "  2. View API docs: open $DOCS_DIR/api.html"
echo "  3. Test endpoints: curl http://localhost:3002/api/exports/v1/templates"
echo ""
if [ "$BQ_AVAILABLE" = true ] && [ -n "$GCP_PROJECT_ID" ]; then
    echo -e "${GREEN}✓ BigQuery resources created${NC}"
    echo "  - Dataset: $GCP_PROJECT_ID:snap3_exports"
    echo "  - Views: 4 standard + 2 materialized"
    echo "  - Tables: 2 (audit log + quotas)"
else
    echo -e "${YELLOW}⚠ BigQuery setup skipped${NC}"
    echo "  To set up: export GCP_PROJECT_ID=your-project && ./scripts/setup-bigquery-exports.sh"
fi
echo ""
echo -e "${BLUE}Port: $EXPORT_PORT${NC}"
echo -e "${BLUE}Ready for deployment! 🚀${NC}"