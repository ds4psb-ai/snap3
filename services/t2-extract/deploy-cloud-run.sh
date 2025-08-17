#!/bin/bash

# T2-Extract Cloud Run Deployment Script
# Optimized for production with Vertex AI integration

set -euo pipefail

# ========================
# Configuration Variables
# ========================

# Service Configuration
SERVICE_NAME="t2-vdp"
REGION_DEPLOY="us-central1"  # Cloud Run deployment region (aligned with Vertex AI)
PROJECT_ID="tough-variety-466003-c5"

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

# Performance Configuration (fileData 패치 최적화)
TIMEOUT="900"        # 15 minutes for complex VDP generation
CPU="4"              # 4 vCPU for enhanced fileData processing
MEMORY="8Gi"         # 8GB for fileData video processing
MAX_INSTANCES="3"    # Scale limit
MIN_INSTANCES="1"    # Keep warm instance

echo "🚀 T2-Extract Cloud Run Deployment (fileData 패치)"
echo "=================================================="
echo "Service: ${SERVICE_NAME}"
echo "Project: ${PROJECT_ID}"
echo "Deploy Region: ${REGION_DEPLOY}"
echo "Vertex Region: ${VERTEX_REGION}"
echo "Model: ${MODEL_NAME}"
echo "✅ INVALID_ARGUMENT 패치: fileData + JSON 강제"
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
echo "  Density targets: ${DENSITY_SCENES_MIN}/${DENSITY_MIN_SHOTS_PER_SCENE}/${DENSITY_MIN_KF_PER_SHOT}"
echo "  Hook gates: ≤${HOOK_MAX_START_SEC}s, ≥${HOOK_MIN_STRENGTH}"

# ========================
# Deployment Execution
# ========================

echo
echo "🚀 Deploying to Cloud Run..."

# Check if service exists
if gcloud run services describe ${SERVICE_NAME} --region=${REGION_DEPLOY} --project=${PROJECT_ID} &>/dev/null; then
    echo "📝 Updating existing service: ${SERVICE_NAME}"
    DEPLOY_MODE="update"
else
    echo "🆕 Creating new service: ${SERVICE_NAME}"
    DEPLOY_MODE="deploy"
fi

# Execute deployment
if [[ "$DEPLOY_MODE" == "update" ]]; then
    gcloud run deploy ${SERVICE_NAME} \
        --source . \
        --region=${REGION_DEPLOY} \
        --project=${PROJECT_ID} \
        --set-env-vars="${ENV_VARS}" \
        --timeout=${TIMEOUT} \
        --cpu=${CPU} \
        --memory=${MEMORY} \
        --max-instances=${MAX_INSTANCES} \
        --min-instances=${MIN_INSTANCES} \
        --allow-unauthenticated \
        --port=8080 \
        --execution-environment=gen2
else
    gcloud run deploy ${SERVICE_NAME} \
        --source . \
        --region=${REGION_DEPLOY} \
        --project=${PROJECT_ID} \
        --set-env-vars="${ENV_VARS}" \
        --timeout=${TIMEOUT} \
        --cpu=${CPU} \
        --memory=${MEMORY} \
        --max-instances=${MAX_INSTANCES} \
        --min-instances=${MIN_INSTANCES} \
        --allow-unauthenticated \
        --port=8080 \
        --execution-environment=gen2 \
        --quiet
fi

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
if curl -f -s "${SERVICE_URL}/health" | grep -q '"ok":true'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    echo "🔍 Check logs: gcloud run services logs tail ${SERVICE_NAME} --region=${REGION_DEPLOY}"
    exit 1
fi

# ========================
# Deployment Summary
# ========================

echo
echo "📊 Deployment Summary"
echo "===================="
echo "Service Name: ${SERVICE_NAME}"
echo "Service URL: ${SERVICE_URL}"
echo "Region: ${REGION_DEPLOY}"
echo "Vertex AI Region: ${VERTEX_REGION}"
echo "Model: ${MODEL_NAME}"
echo "Resources: ${CPU} CPU, ${MEMORY} memory"
echo "Timeout: ${TIMEOUT}s"
echo "Scaling: ${MIN_INSTANCES}-${MAX_INSTANCES} instances"
echo
echo "🔧 Configuration:"
echo "  Density: ${DENSITY_SCENES_MIN} scenes, ${DENSITY_MIN_SHOTS_PER_SCENE} shots/scene, ${DENSITY_MIN_KF_PER_SHOT} kf/shot"
echo "  Hook Gates: ≤${HOOK_MAX_START_SEC}s start, ≥${HOOK_MIN_STRENGTH} strength"
echo "  fileData 패치: responseMimeType=application/json, fresh model per request"
echo
echo "📚 Useful commands:"
echo "  View logs: gcloud run services logs tail ${SERVICE_NAME} --region=${REGION_DEPLOY}"
echo "  Update service: gcloud run services update ${SERVICE_NAME} --region=${REGION_DEPLOY}"
echo "  Test endpoint: curl ${SERVICE_URL}/health"
echo "  Test VDP: curl -X POST ${SERVICE_URL}/api/vdp/extract-vertex -H 'Content-Type: application/json' -d '{\"gcsUri\":\"gs://your-bucket/video.mp4\"}'"
echo
echo "🎉 Deployment successful! fileData 패치 적용으로 INVALID_ARGUMENT 해결됨."