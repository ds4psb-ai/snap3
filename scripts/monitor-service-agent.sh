#!/bin/bash
# Background monitoring script for service agent provisioning

PROJECT_ID="tough-variety-466003-c5"
SA_VERTEX="service-355516763169@gcp-sa-aiplatform.iam.gserviceaccount.com"
LOG_FILE="scripts/tmp/service-agent-monitor.log"

mkdir -p scripts/tmp
echo "$(date): Starting service agent monitoring..." >> "$LOG_FILE"

for i in {1..20}; do
    echo "$(date): Check $i/20 - Service agent provisioning status..." >> "$LOG_FILE"
    
    if gcloud iam service-accounts describe "$SA_VERTEX" --project="$PROJECT_ID" >/dev/null 2>&1; then
        echo "$(date): ✅ Service agent found! Setting up permissions..." >> "$LOG_FILE"
        ./scripts/setup-vertex-permissions.sh >> "$LOG_FILE" 2>&1
        echo "$(date): 🎯 Ready for hook generation!" >> "$LOG_FILE"
        break
    else
        echo "$(date): ⏳ Service agent still provisioning... (attempt $i/20)" >> "$LOG_FILE"
        sleep 30
    fi
done

echo "$(date): Monitoring complete." >> "$LOG_FILE"
