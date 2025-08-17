#!/bin/bash

# VDP Extractor Service - Cloud Run Deployment Script
# Usage: ./deploy-cloud-run.sh [region] [project-id]

set -e

# Configuration
REGION=${1:-"us-west1"}  # Default to us-west1, can be changed to asia-northeast3 for Seoul
PROJECT_ID=${2:-"$GOOGLE_CLOUD_PROJECT"}
SERVICE_NAME="vdp-extractor"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 VDP Extractor Service - Cloud Run Deployment${NC}"
echo "=================================="
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Project: $PROJECT_ID"
echo ""

# Check if required tools are installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Install it from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if project ID is set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Project ID not set${NC}"
    echo "Set it with: export GOOGLE_CLOUD_PROJECT=your-project-id"
    echo "Or pass it as second argument: ./deploy-cloud-run.sh $REGION your-project-id"
    exit 1
fi

# Authenticate with Google Cloud (if needed)
echo -e "${YELLOW}🔐 Checking Google Cloud authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}Please authenticate with Google Cloud:${NC}"
    gcloud auth login
fi

# Set the project
echo -e "${YELLOW}📋 Setting project to $PROJECT_ID...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy using Cloud Build (recommended for production)
if [ "$3" = "--cloud-build" ]; then
    echo -e "${YELLOW}🏗️  Building and deploying with Cloud Build...${NC}"
    
    gcloud builds submit --config cloudbuild.yaml .
    
    # Set environment variables after deployment
    echo -e "${YELLOW}🔧 Setting environment variables...${NC}"
    gcloud run services update $SERVICE_NAME \
        --region=$REGION \
        --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY},YOUTUBE_API_KEY=${YOUTUBE_API_KEY},RAW_BUCKET=${RAW_BUCKET:-tough-variety-raw}" \
        --quiet

else
    # Direct deployment (simpler for development)
    echo -e "${YELLOW}🏗️  Building and deploying directly...${NC}"
    
    gcloud run deploy $SERVICE_NAME \
        --source=. \
        --allow-unauthenticated \
        --region=$REGION \
        --platform=managed \
        --memory=2Gi \
        --cpu=2 \
        --concurrency=10 \
        --timeout=300s \
        --max-instances=10 \
        --set-env-vars="NODE_ENV=production,PORT=8080,GEMINI_API_KEY=${GEMINI_API_KEY},YOUTUBE_API_KEY=${YOUTUBE_API_KEY},RAW_BUCKET=${RAW_BUCKET:-tough-variety-raw}" \
        --quiet
fi

# Get the service URL
echo -e "${YELLOW}🔍 Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "=================================="
echo -e "${GREEN}Service URL: $SERVICE_URL${NC}"
echo ""
echo -e "${BLUE}📋 Available endpoints:${NC}"
echo "Health Check: $SERVICE_URL/health"
echo "Service Info: $SERVICE_URL/api/v1/info"
echo "Extract VDP: $SERVICE_URL/api/v1/extract"
echo ""
echo -e "${BLUE}🧪 Test the service:${NC}"
echo "curl \"$SERVICE_URL/health\""
echo "curl -X POST \"$SERVICE_URL/api/v1/extract\" -H \"Content-Type: application/json\" -d '{\"url\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}'"
echo ""

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
if curl -s --max-time 30 "$SERVICE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Service is responding${NC}"
else
    echo -e "${RED}❌ Service is not responding${NC}"
    echo "Check logs with: gcloud run logs tail $SERVICE_NAME --region=$REGION"
fi

echo ""
echo -e "${BLUE}📊 Monitoring and logs:${NC}"
echo "View logs: gcloud run logs tail $SERVICE_NAME --region=$REGION"
echo "Service console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
echo ""

# Save deployment info
cat > deployment-info.txt << EOF
VDP Extractor Service Deployment Info
=====================================
Deployed: $(date)
Service: $SERVICE_NAME
Region: $REGION
Project: $PROJECT_ID
URL: $SERVICE_URL

Endpoints:
- Health: $SERVICE_URL/health
- Info: $SERVICE_URL/api/v1/info
- Extract: $SERVICE_URL/api/v1/extract
- Batch: $SERVICE_URL/api/v1/extract/batch

Test Commands:
curl "$SERVICE_URL/health"
curl -X POST "$SERVICE_URL/api/v1/extract" -H "Content-Type: application/json" -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
EOF

echo -e "${GREEN}📝 Deployment info saved to deployment-info.txt${NC}"