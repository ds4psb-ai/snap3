#!/bin/bash

# T2-Extract Cloud Run Deployment Script - GPT-5 Pro CTO Optimized
# Performance tuning based on GPT-5 Pro CTO consulting recommendations

set -euo pipefail

# ========================
# GPT-5 Pro CTO Configuration
# ========================

# Service Configuration
SERVICE_NAME="t2-vdp"
REGION_DEPLOY="us-central1"  # GPT-5 Pro: Regional alignment
PROJECT_ID="tough-variety-466003-c5"

# GPT-5 Pro CTO Performance Settings (CRITICAL)
CONCURRENCY="3"              # GPT-5 Pro: Optimal for model+IO mixed workloads (was 80)
TIMEOUT="120"                # GPT-5 Pro: Safe upper bound for current 55-60s processing
CPU="2"                      # GPT-5 Pro: 2 vCPU for video+LLM processing
MEMORY="2Gi"                 # GPT-5 Pro: 2GiB memory optimized
MAX_INSTANCES="10"           # GPT-5 Pro: Handle spikes
MIN_INSTANCES="1"            # GPT-5 Pro: Prevent cold starts
CPU_BOOST="true"             # GPT-5 Pro: Startup CPU boost

# Vertex AI Configuration (권장 리전 + 모델)
VERTEX_REGION="us-central1"
MODEL_NAME="gemini-2.5-pro"

# VDP Quality Configuration
DENSITY_SCENES_MIN="4"
DENSITY_MIN_SHOTS_PER_SCENE="2"
DENSITY_MIN_KF_PER_SHOT="3"
HOOK_MAX_START_SEC="3.0"
HOOK_MIN_STRENGTH="0.70"

# Container paths (production)
VDP_SCHEMA_PATH="/app/schemas/vdp-2.0-enhanced.schema.json"
HOOK_PROMPT_PATH="/app/prompts/hook_genome_enhanced_v2.ko.txt"

echo "🚀 T2-Extract Cloud Run Deployment - GPT-5 Pro CTO Optimized"
echo "============================================================="
echo "🎯 GPT-5 Pro CTO Performance Settings:"
echo "  Concurrency: ${CONCURRENCY} (reduced from 80 for stability)"
echo "  Timeout: ${TIMEOUT}s (safe margin for 55-60s processing)"
echo "  CPU: ${CPU} vCPU + CPU Boost"
echo "  Memory: ${MEMORY}"
echo "  Min Instances: ${MIN_INSTANCES} (cold start prevention)"
echo "  Max Instances: ${MAX_INSTANCES}"
echo "Service: ${SERVICE_NAME}"
echo "Project: ${PROJECT_ID}"
echo "Deploy Region: ${REGION_DEPLOY}"
echo "Vertex Region: ${VERTEX_REGION}"
echo "Model: ${MODEL_NAME}"
echo

# ========================
# Pre-deployment Checks
# ========================

echo "🔍 Pre-deployment validation..."

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: gcloud not authenticated. Run 'gcloud auth login'"
    exit 1
fi

# Check project access
if ! gcloud projects describe ${PROJECT_ID} &>/dev/null; then
    echo "❌ Error: Cannot access project ${PROJECT_ID}"
    exit 1
fi

# Check if Dockerfile exists
if [[ ! -f "Dockerfile" ]]; then
    echo "❌ Error: Dockerfile not found in current directory"
    exit 1
fi

# Check if required files exist
REQUIRED_FILES=(
    "src/server.js"
    "package.json"
    "schemas/vdp-2.0-enhanced.schema.json"
    "prompts/hook_genome_enhanced_v2.ko.txt"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Error: Required file not found: $file"
        exit 1
    fi
done

echo "✅ Pre-deployment checks passed"

# ========================
# Environment Variables Setup
# ========================

echo
echo "🔧 Configuring environment variables..."

ENV_VARS="REGION=${VERTEX_REGION}"
ENV_VARS="${ENV_VARS},MODEL_NAME=${MODEL_NAME}"
ENV_VARS="${ENV_VARS},LOCATION=${VERTEX_REGION}"
ENV_VARS="${ENV_VARS},GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
ENV_VARS="${ENV_VARS},GOOGLE_CLOUD_LOCATION=${VERTEX_REGION}"
ENV_VARS="${ENV_VARS},MAX_OUTPUT_TOKENS=16384"
ENV_VARS="${ENV_VARS},TEMPERATURE=0.05"
ENV_VARS="${ENV_VARS},VDP_SCHEMA_PATH=${VDP_SCHEMA_PATH}"
ENV_VARS="${ENV_VARS},HOOK_PROMPT_PATH=${HOOK_PROMPT_PATH}"
ENV_VARS="${ENV_VARS},DENSITY_SCENES_MIN=${DENSITY_SCENES_MIN}"
ENV_VARS="${ENV_VARS},DENSITY_MIN_SHOTS_PER_SCENE=${DENSITY_MIN_SHOTS_PER_SCENE}"
ENV_VARS="${ENV_VARS},DENSITY_MIN_KF_PER_SHOT=${DENSITY_MIN_KF_PER_SHOT}"
ENV_VARS="${ENV_VARS},HOOK_MAX_START_SEC=${HOOK_MAX_START_SEC}"
ENV_VARS="${ENV_VARS},HOOK_MIN_STRENGTH=${HOOK_MIN_STRENGTH}"
ENV_VARS="${ENV_VARS},PROJECT_ID=${PROJECT_ID}"
ENV_VARS="${ENV_VARS},NODE_ENV=production"

echo "Environment variables configured:"
echo "  REGION=${VERTEX_REGION}"
echo "  MODEL_NAME=${MODEL_NAME}"
echo "  PROJECT_ID=${PROJECT_ID}"
echo "  Density targets: ${DENSITY_SCENES_MIN}/${DENSITY_MIN_SHOTS_PER_SCENE}/${DENSITY_MIN_KF_PER_SHOT}"
echo "  Hook gates: ≤${HOOK_MAX_START_SEC}s, ≥${HOOK_MIN_STRENGTH}"

# ========================
# GPT-5 Pro CTO Deployment
# ========================

echo
echo "🚀 Deploying with GPT-5 Pro CTO optimizations..."

# Check if service exists
if gcloud run services describe ${SERVICE_NAME} --region=${REGION_DEPLOY} --project=${PROJECT_ID} &>/dev/null; then
    echo "📝 Updating existing service: ${SERVICE_NAME} (with GPT-5 Pro settings)"
    DEPLOY_MODE="update"
else
    echo "🆕 Creating new service: ${SERVICE_NAME} (with GPT-5 Pro settings)"
    DEPLOY_MODE="deploy"
fi

# GPT-5 Pro CTO Optimized Deployment Command
DEPLOY_CMD="gcloud run deploy ${SERVICE_NAME}"
DEPLOY_CMD="${DEPLOY_CMD} --source ."
DEPLOY_CMD="${DEPLOY_CMD} --region=${REGION_DEPLOY}"
DEPLOY_CMD="${DEPLOY_CMD} --project=${PROJECT_ID}"
DEPLOY_CMD="${DEPLOY_CMD} --set-env-vars=\"${ENV_VARS}\""
DEPLOY_CMD="${DEPLOY_CMD} --concurrency=${CONCURRENCY}"          # GPT-5 Pro: Critical setting
DEPLOY_CMD="${DEPLOY_CMD} --timeout=${TIMEOUT}s"                # GPT-5 Pro: Safe timeout
DEPLOY_CMD="${DEPLOY_CMD} --cpu=${CPU}"                        # GPT-5 Pro: Optimized CPU
DEPLOY_CMD="${DEPLOY_CMD} --memory=${MEMORY}"                  # GPT-5 Pro: Optimized memory
DEPLOY_CMD="${DEPLOY_CMD} --max-instances=${MAX_INSTANCES}"    # GPT-5 Pro: Scaling
DEPLOY_CMD="${DEPLOY_CMD} --min-instances=${MIN_INSTANCES}"    # GPT-5 Pro: Cold start prevention
DEPLOY_CMD="${DEPLOY_CMD} --cpu-boost"                         # GPT-5 Pro: Startup boost
DEPLOY_CMD="${DEPLOY_CMD} --allow-unauthenticated"
DEPLOY_CMD="${DEPLOY_CMD} --port=8082"                         # T3 sub service port
DEPLOY_CMD="${DEPLOY_CMD} --execution-environment=gen2"

if [[ "$DEPLOY_MODE" == "deploy" ]]; then
    DEPLOY_CMD="${DEPLOY_CMD} --quiet"
fi

echo "🎯 GPT-5 Pro CTO Deployment Command:"
echo "${DEPLOY_CMD}"
echo

# Execute deployment
eval ${DEPLOY_CMD}

# ========================
# Post-deployment Validation
# ========================

echo
echo "✅ Deployment completed!"
echo

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION_DEPLOY} \
    --project=${PROJECT_ID} \
    --format="value(status.url)")

echo "🌐 Service URL: ${SERVICE_URL}"

# Test health endpoint
echo
echo "🏥 Testing health endpoint..."
if curl -f -s "${SERVICE_URL}/healthz" | grep -q 'status.*healthy\|ok.*true'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    echo "🔍 Check logs: gcloud run services logs tail ${SERVICE_NAME} --region=${REGION_DEPLOY}"
    # Don't exit - allow deployment to complete for debugging
fi

# ========================
# GPT-5 Pro CTO Deployment Summary
# ========================

echo
echo "📊 GPT-5 Pro CTO Optimized Deployment Summary"
echo "============================================="
echo "Service Name: ${SERVICE_NAME}"
echo "Service URL: ${SERVICE_URL}"
echo "Region: ${REGION_DEPLOY}"
echo "Vertex AI Region: ${VERTEX_REGION}"
echo "Model: ${MODEL_NAME}"
echo
echo "🎯 GPT-5 Pro CTO Performance Settings Applied:"
echo "  Concurrency: ${CONCURRENCY} (reduced from default 80)"
echo "  Timeout: ${TIMEOUT}s (safe margin for current processing)"
echo "  CPU: ${CPU} vCPU + CPU Boost enabled"
echo "  Memory: ${MEMORY}"
echo "  Min Instances: ${MIN_INSTANCES} (cold start prevention)"
echo "  Max Instances: ${MAX_INSTANCES}"
echo
echo "🔧 Quality Configuration:"
echo "  Density: ${DENSITY_SCENES_MIN} scenes, ${DENSITY_MIN_SHOTS_PER_SCENE} shots/scene, ${DENSITY_MIN_KF_PER_SHOT} kf/shot"
echo "  Hook Gates: ≤${HOOK_MAX_START_SEC}s start, ≥${HOOK_MIN_STRENGTH} strength"
echo
echo "📈 Expected Performance Improvements:"
echo "  ✅ P95 latency target: <30s (from current 55-60s baseline)"
echo "  ✅ Success rate target: ≥99%"
echo "  ✅ 5xx error rate target: <0.5%"
echo "  ✅ Cold start reduction: Min 1 instance always warm"
echo
echo "📚 Useful commands:"
echo "  View logs: gcloud run services logs tail ${SERVICE_NAME} --region=${REGION_DEPLOY}"
echo "  Update service: gcloud run services update ${SERVICE_NAME} --region=${REGION_DEPLOY}"
echo "  Test health: curl ${SERVICE_URL}/healthz"
echo "  Test VDP: curl -X POST ${SERVICE_URL}/api/vdp/extract-vertex -H 'Content-Type: application/json' -d '{\"gcsUri\":\"gs://tough-variety-raw-central1/raw/youtube/test.mp4\"}'"
echo
echo "🎉 GPT-5 Pro CTO optimized deployment successful!"
echo "🔄 Next: Monitor performance metrics and validate P95 < 30s target"