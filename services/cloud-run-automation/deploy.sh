#!/bin/bash

# Cloud Run Automation Service Deployment Script

set -e

echo "🚀 Deploying Cloud Run Automation Service..."

# 환경변수 확인
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY environment variable is required"
    exit 1
fi

# 프로젝트 설정
PROJECT_ID="tough-variety-466003-c5"
REGION="us-central1"
SERVICE_NAME="cloud-run-automation"

echo "📋 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🔧 Service: $SERVICE_NAME"

# gcloud 설정 확인
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    exit 1
fi

# 프로젝트 설정
gcloud config set project $PROJECT_ID

# Cloud Run 배포
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 5000 \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --concurrency 10 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars="OPENAI_API_KEY=$OPENAI_API_KEY" \
    --set-env-vars="VDP_SERVICE_URL=https://universal-vdp-clone-xxxxx-uc.a.run.app" \
    --set-env-vars="NODE_ENV=production" \
    --set-env-vars="LOG_LEVEL=info"

# 서비스 URL 출력
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "✅ Deployment completed!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📊 Health check: $SERVICE_URL/api/health"
echo "🎯 Status check: $SERVICE_URL/api/status"
echo "🚀 Start automation: curl -X POST $SERVICE_URL/api/start"
echo ""
echo "📝 Test commands:"
echo "curl $SERVICE_URL/api/health"
echo "curl -X POST $SERVICE_URL/api/start"
echo "curl $SERVICE_URL/api/status"

