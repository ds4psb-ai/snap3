#!/bin/bash
# Vertex AI Service Agent Permissions Setup
# Run this script after service agents are provisioned

PROJECT_ID="tough-variety-466003-c5"
SA_VERTEX="service-355516763169@gcp-sa-aiplatform.iam.gserviceaccount.com"

echo "🤖 Setting up Vertex AI Service Agent permissions..."

# Check if service agent exists
if gcloud iam service-accounts describe "$SA_VERTEX" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "✅ Service agent exists: $SA_VERTEX"
    
    # Grant GCS bucket access
    echo "🗄️ Granting GCS bucket read permissions..."
    gcloud storage buckets add-iam-policy-binding gs://tough-variety-raw \
        --member="serviceAccount:${SA_VERTEX}" \
        --role="roles/storage.objectViewer" \
        --project "$PROJECT_ID"
    
    # Grant project-level service agent role
    echo "🔧 Verifying project-level service agent role..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${SA_VERTEX}" \
        --role="roles/aiplatform.serviceAgent" || true
    
    echo "✅ Vertex AI permissions setup complete!"
else
    echo "❌ Service agent not found: $SA_VERTEX"
    echo "💡 Service agents are created automatically on first Vertex AI usage"
    echo "⏳ Please try again in a few minutes"
fi
