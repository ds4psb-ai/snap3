#!/bin/bash
# Run VDP OneShot Pipeline with Hook Genome Integration
set -euo pipefail

echo "🚀 Running VDP Pipeline with Hook Genome Integration"
echo "===================================================="

# Set Hook Genome environment variables
export VDP_SCHEMA_PATH="$PWD/schemas/vdp-vertex-hook.schema.json"
export HOOK_PROMPT_PATH="$PWD/prompts/hook_genome.ko.txt"

# Set required GCP environment variables
export GCP_PROJECT="tough-variety-466003-c5"
export RAW_BUCKET="tough-variety-raw"
export YOUTUBE_API_KEY="${YOUTUBE_API_KEY:-}"

echo "📋 Configuration:"
echo "  VDP_SCHEMA_PATH: $VDP_SCHEMA_PATH"
echo "  HOOK_PROMPT_PATH: $HOOK_PROMPT_PATH"
echo "  GCP_PROJECT: $GCP_PROJECT"
echo "  RAW_BUCKET: $RAW_BUCKET"

# Check for YouTube API key
if [[ -z "$YOUTUBE_API_KEY" ]]; then
  echo "⚠️ YOUTUBE_API_KEY not set - using mock data for statistics"
fi

# Use test video URL (replace with actual video if needed)
TEST_URL="${1:-https://www.youtube.com/shorts/6_I2FmT1mbY}"

echo ""
echo "🎬 Target Video: $TEST_URL"
echo ""

# Check if oneshot pipeline script exists and is executable
if [[ ! -x "scripts/vdp-oneshot-pipeline.sh" ]]; then
  echo "❌ VDP oneshot pipeline script not found or not executable"
  exit 1
fi

echo "▶️ Executing VDP OneShot Pipeline with Hook Genome..."
echo ""

# Execute the pipeline with Hook Genome environment variables
if ./scripts/vdp-oneshot-pipeline.sh "$TEST_URL"; then
  echo ""
  echo "🎉 Pipeline execution completed successfully!"
  echo ""
  echo "📝 Hook Genome Integration Summary:"
  echo "  ✅ Hook schema injected into T2 extraction payload"
  echo "  ✅ Hook prompt included in processing instructions"
  echo "  ✅ hookGenome field will be populated in VDP output"
  echo ""
  echo "🔍 Next Steps:"
  echo "  1. Monitor T2 extraction job completion"
  echo "  2. Validate hookGenome field in generated VDP JSON"
  echo "  3. Run hook validation: ./scripts/validate-hook-fixed.sh <output-file>"
else
  echo ""
  echo "❌ Pipeline execution failed"
  echo "🔧 Check the error messages above for troubleshooting"
  exit 1
fi