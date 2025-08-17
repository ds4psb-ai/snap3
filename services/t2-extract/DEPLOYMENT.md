# T2-Extract Cloud Run Deployment Guide

## Overview

This guide covers the complete deployment of the T2-Extract service to Google Cloud Run with optimized Vertex AI integration and production-ready configuration.

## 🎯 Deployment Configuration

### Vertex AI Optimization
- **Region**: `us-central1` (권장 리전 for best model availability)
- **Model**: `gemini-2.5-pro` (latest stable model)
- **Location Strategy**: Vertex AI in us-central1, Cloud Run in us-central1

### Cloud Run Configuration
```bash
# Performance Settings
--timeout=900              # 15 minutes for complex VDP generation
--cpu=2                    # 2 vCPU for AI processing
--memory=4Gi               # 4GB for large VDP processing
--max-instances=3          # Scale limit
--min-instances=1          # Keep warm instance

# Execution Environment
--execution-environment=gen2  # Better performance and security
--allow-unauthenticated      # Public API access
--port=8080                  # Standard HTTP port
```

### VDP Quality Configuration
```bash
# Density Thresholds (Production Quality)
DENSITY_SCENES_MIN=4              # Minimum scenes for comprehensive analysis
DENSITY_MIN_SHOTS_PER_SCENE=2     # Minimum shots per scene
DENSITY_MIN_KF_PER_SHOT=3         # Minimum keyframes per shot

# Hook Quality Gates
HOOK_MAX_START_SEC=3.0            # Maximum hook start time
HOOK_MIN_STRENGTH=0.70            # Minimum hook strength score

# Calculated Minimums
# → Total shots required: 8 (4 scenes × 2 shots/scene)
# → Total keyframes required: 24 (8 shots × 3 keyframes/shot)
```

## 📋 Prerequisites

### 1. Google Cloud Setup
```bash
# Install and authenticate gcloud CLI
gcloud auth login
gcloud config set project tough-variety-466003-c5

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

### 2. Service Account Permissions
Ensure your service account has:
- Cloud Run Developer
- AI Platform User
- Storage Object Viewer (for GCS access)

### 3. Required Files
- `src/server.js` - Main application
- `package.json` - Dependencies
- `Dockerfile` - Container configuration
- `schemas/vdp-2.0-enhanced.schema.json` - VDP validation schema
- `prompts/hook_genome_enhanced_v2.ko.txt` - Hook analysis prompt

## 🚀 Deployment Process

### Quick Deployment
```bash
# 1. Validate configuration
./validate-deployment.sh

# 2. Deploy to Cloud Run
./deploy-cloud-run.sh
```

### Manual Deployment Steps

#### 1. Environment Configuration
```bash
# Set production environment variables
export REGION=us-central1
export MODEL_NAME=gemini-2.5-pro
export VDP_SCHEMA_PATH=/app/schemas/vdp-2.0-enhanced.schema.json
export HOOK_PROMPT_PATH=/app/prompts/hook_genome_enhanced_v2.ko.txt

# Quality thresholds
export DENSITY_SCENES_MIN=4
export DENSITY_MIN_SHOTS_PER_SCENE=2
export DENSITY_MIN_KF_PER_SHOT=3
export HOOK_MAX_START_SEC=3.0
export HOOK_MIN_STRENGTH=0.70
```

#### 2. Deploy Service
```bash
gcloud run deploy t2-extract \
  --source . \
  --region=us-central1 \
  --project=tough-variety-466003-c5 \
  --set-env-vars="REGION=${REGION},MODEL_NAME=${MODEL_NAME},VDP_SCHEMA_PATH=${VDP_SCHEMA_PATH},HOOK_PROMPT_PATH=${HOOK_PROMPT_PATH},DENSITY_SCENES_MIN=${DENSITY_SCENES_MIN},DENSITY_MIN_SHOTS_PER_SCENE=${DENSITY_MIN_SHOTS_PER_SCENE},DENSITY_MIN_KF_PER_SHOT=${DENSITY_MIN_KF_PER_SHOT},HOOK_MAX_START_SEC=${HOOK_MAX_START_SEC},HOOK_MIN_STRENGTH=${HOOK_MIN_STRENGTH},PROJECT_ID=tough-variety-466003-c5,NODE_ENV=production" \
  --timeout=900 \
  --cpu=2 \
  --memory=4Gi \
  --max-instances=3 \
  --min-instances=1 \
  --allow-unauthenticated \
  --port=8080 \
  --execution-environment=gen2
```

#### 3. Update Existing Service
```bash
gcloud run services update t2-extract \
  --region=us-central1 \
  --set-env-vars="REGION=${REGION},MODEL_NAME=${MODEL_NAME}..." \
  --timeout=900 \
  --cpu=2 \
  --memory=4Gi \
  --max-instances=3 \
  --min-instances=1
```

## 🔧 Configuration Files

### .env.production
Production environment variables with container paths:
```bash
PROJECT_ID=tough-variety-466003-c5
REGION=us-central1
MODEL_NAME=gemini-2.5-pro
VDP_SCHEMA_PATH=/app/schemas/vdp-2.0-enhanced.schema.json
HOOK_PROMPT_PATH=/app/prompts/hook_genome_enhanced_v2.ko.txt
DENSITY_SCENES_MIN=4
DENSITY_MIN_SHOTS_PER_SCENE=2
DENSITY_MIN_KF_PER_SHOT=3
HOOK_MAX_START_SEC=3.0
HOOK_MIN_STRENGTH=0.70
PORT=8080
NODE_ENV=production
```

### Dockerfile Features
- **Base Image**: `node:20-alpine` for minimal attack surface
- **Security**: Non-root user (nodejs:1001)
- **Performance**: Optimized Node.js memory settings
- **Health Check**: Built-in health monitoring
- **Signal Handling**: Proper shutdown with tini

### Container Optimizations
```dockerfile
# Memory optimization for Vertex AI processing
ENV NODE_OPTIONS="--max-old-space-size=3584"

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3

# Security: Non-root user
USER nodejs

# Proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
```

## 🧪 Testing & Validation

### Pre-deployment Validation
```bash
./validate-deployment.sh
```

This script validates:
- ✅ Environment configuration
- ✅ File structure completeness
- ✅ Server syntax and configuration
- ✅ Schema and prompt loading
- ✅ Docker configuration
- ✅ Deployment script readiness
- ✅ gcloud authentication and project access

### Post-deployment Testing
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe t2-extract \
  --region=us-central1 \
  --format="value(status.url)")

# Test health endpoint
curl "${SERVICE_URL}/health"

# Expected response: {"ok":true}
```

### API Testing
```bash
# Test VDP extraction endpoint
curl -X POST "${SERVICE_URL}/api/vdp/extract-vertex" \
  -H "Content-Type: application/json" \
  -d '{
    "gcsUri": "gs://your-bucket/sample-video.mp4",
    "meta": {
      "platform": "youtube",
      "language": "ko"
    }
  }'
```

## 📊 Monitoring & Logging

### View Logs
```bash
# Tail real-time logs
gcloud run services logs tail t2-extract --region=us-central1

# View recent logs
gcloud run services logs read t2-extract --region=us-central1 --limit=50
```

### Key Log Markers
```
[Two-Pass VDP] 🎯 Target density: 4 scenes, 8 shots, 24 keyframes
[Pass 1] 🎬 Initial VDP generated for: {content_id}
[Pass 2] 🔍 Starting density floor enforcement...
[Density Floor] ✅ Successfully expanded VDP to meet requirements
[Two-Pass VDP] ✅ Final Success: {content_id}
```

### Performance Metrics
Monitor these key metrics in Cloud Console:
- **Request latency**: Target <60s for complex VDP generation
- **Error rate**: Should be <5% 
- **Memory usage**: Should stay under 3.5GB
- **CPU utilization**: Should average <70%
- **Cold start time**: Should be <30s

## 🔄 Updates & Maintenance

### Update Environment Variables
```bash
gcloud run services update t2-extract \
  --region=us-central1 \
  --set-env-vars="DENSITY_SCENES_MIN=5,HOOK_MIN_STRENGTH=0.75"
```

### Update Configuration
```bash
# Update density thresholds for higher quality
export DENSITY_SCENES_MIN=5
export DENSITY_MIN_SHOTS_PER_SCENE=3
export DENSITY_MIN_KF_PER_SHOT=4

# Redeploy with new configuration
./deploy-cloud-run.sh
```

### Rolling Updates
Cloud Run automatically handles rolling updates with zero downtime:
1. New revision deployed
2. Traffic gradually shifted to new revision
3. Old revision kept for rollback capability

### Rollback if Needed
```bash
# List revisions
gcloud run revisions list --service=t2-extract --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic t2-extract \
  --region=us-central1 \
  --to-revisions=REVISION-NAME=100
```

## ⚡ Performance Tuning

### Resource Optimization
```bash
# For higher throughput (more expensive)
--cpu=4 --memory=8Gi --max-instances=5

# For cost optimization (slower)
--cpu=1 --memory=2Gi --max-instances=2

# For development/testing
--cpu=1 --memory=1Gi --min-instances=0
```

### Quality vs Performance Trade-offs
```bash
# High Quality (slower, more expensive)
DENSITY_SCENES_MIN=5
DENSITY_MIN_SHOTS_PER_SCENE=3
DENSITY_MIN_KF_PER_SHOT=4

# Balanced (default production)
DENSITY_SCENES_MIN=4
DENSITY_MIN_SHOTS_PER_SCENE=2
DENSITY_MIN_KF_PER_SHOT=3

# Fast Mode (lower quality, faster)
DENSITY_SCENES_MIN=3
DENSITY_MIN_SHOTS_PER_SCENE=2
DENSITY_MIN_KF_PER_SHOT=2
```

## 🔒 Security Considerations

### Container Security
- ✅ Non-root user (nodejs:1001)
- ✅ Minimal base image (Alpine Linux)
- ✅ No unnecessary packages
- ✅ Health checks enabled

### Network Security
- ✅ HTTPS enforced by Cloud Run
- ✅ VPC connector available if needed
- ✅ IAM-based access control

### Data Security
- ✅ Environment variables for secrets
- ✅ No hardcoded credentials
- ✅ GCS access via service accounts only

## 📚 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs for startup errors
gcloud run services logs read t2-extract --region=us-central1

# Common causes:
# - Missing environment variables
# - Invalid schema/prompt files
# - Insufficient memory allocation
```

#### Slow Performance
```bash
# Increase resources
gcloud run services update t2-extract \
  --region=us-central1 \
  --cpu=4 --memory=8Gi

# Check density thresholds
# Lower values = faster processing
```

#### Vertex AI Errors
- Check region configuration (use us-central1)
- Verify service account permissions
- Check quota limits in Cloud Console

#### Memory Issues
```bash
# Increase memory allocation
gcloud run services update t2-extract \
  --region=us-central1 \
  --memory=8Gi

# Or optimize Node.js settings
ENV NODE_OPTIONS="--max-old-space-size=7168"
```

## 🎉 Success Indicators

After successful deployment, you should see:
- ✅ Service URL accessible
- ✅ Health check returning `{"ok":true}`
- ✅ VDP extraction working with sample requests
- ✅ Two-pass density enforcement active
- ✅ Hook quality gates enforced
- ✅ Proper logging with emoji markers

Your T2-Extract service is now production-ready with optimized Vertex AI integration! 🚀

## 🌐 Multi-Platform VDP Analysis

The deployed t2-extract service supports unified VDP analysis across multiple platforms:

### Supported Platforms
- **YouTube Shorts**: Automated URL processing
- **Instagram Reels**: Manual MP4 + metadata upload  
- **TikTok**: Manual MP4 + metadata upload

### Unified Analysis Features
- ✅ Same VDP schema (`vdp-2.0-enhanced.schema.json`) for all platforms
- ✅ Consistent density thresholds (4+ scenes, 8+ shots, 24+ keyframes)
- ✅ Same hook quality gates (≤3.0s, ≥0.70 strength)
- ✅ Cross-platform comparative analysis capabilities

### Quick Start
```bash
# See comprehensive guide
cat MULTI_PLATFORM_VDP.md

# Run demo to see cross-platform analysis
./scripts/cross-platform-vdp-demo.sh
```

**동일 엔진 + 동일 스키마로 강제했으니, 이제 모든 플랫폼이 NEW와 동일 기준으로 분석됩니다.** ✅