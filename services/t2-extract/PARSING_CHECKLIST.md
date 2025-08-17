# JSON Parsing - Quick Reference Checklist

🔥 **EMERGENCY CHECKLIST** - Use when JSON parsing fails

## ⚡ Immediate Actions (< 5 min)

### 1. Check Service Health
```bash
curl https://t2-vdp-355516763169.us-central1.run.app/health
# Expected: {"ok":true}
```

### 2. Verify Current Logs
```bash
gcloud run services logs read t2-vdp --region=us-central1 --limit=5
# Look for: "JSON Repair" or "Direct JSON parse" messages
```

### 3. Test Parsing Status
```bash
# Check for recent parsing errors
gcloud logging read "resource.type=cloud_run_revision AND textPayload:JSON" --limit=3
```

## 🔧 Configuration Verification

### Core Settings Checklist
- [ ] **Region**: Service in `us-central1` (matches Vertex AI)
- [ ] **JSON Mode**: `responseMimeType: "application/json"` enabled
- [ ] **Timeout**: 900 seconds configured
- [ ] **Parsing Logic**: Both direct parse + enhanced repair present

### Quick Code Check
```bash
# Verify JSON mode is enabled
grep -n "responseMimeType" src/server.js
# Should show: responseMimeType: "application/json"

# Verify parsing functions exist
grep -n "parseVertexResponse\|analyzeJsonError" src/server.js
# Should show multiple matches
```

## 🚨 Common Fixes

### Fix 1: JSON Mode Not Enabled
```javascript
// In createModel() function, ensure:
generationConfig: {
  responseMimeType: "application/json"  // Must be present
}
```

### Fix 2: Wrong Region
```bash
# Redeploy to correct region
gcloud run deploy t2-vdp --region=us-central1 --image [current-image]
```

### Fix 3: Missing Enhanced Parser
```javascript
// Ensure this exists in server.js:
function parseVertexResponse(text) {
  // 4-stage repair logic
}
```

### Fix 4: Schema Errors (if using Structured Output)
```javascript
// Remove problematic schema fields:
const vdpSchema = {
  type: rawSchema.type,
  properties: rawSchema.properties,
  required: rawSchema.required
  // Remove: $schema, title, description
};
```

## 🔄 Quick Deploy Commands

### Deploy Latest Fix
```bash
gcloud builds submit --tag gcr.io/tough-variety-466003-c5/t2-vdp:fixed .
gcloud run deploy t2-vdp --image gcr.io/tough-variety-466003-c5/t2-vdp:fixed --region=us-central1
```

### Emergency Rollback
```bash
# Use last known working version
gcloud run deploy t2-vdp --image gcr.io/tough-variety-466003-c5/t2-vdp:json-mode --region=us-central1
```

## 📊 Success Indicators

### Logs to Look For
```
✅ "[Structured Output] ✅ Direct JSON parse successful"
✅ "[JSON Repair] ✅ Successfully repaired JSON"
✅ "[Pass 1] 🎬 Initial VDP generated for: [content_id]"
```

### Failure Indicators
```
❌ "Unterminated string in JSON at position"
❌ "Expected ',' or '}' after property value"
❌ "curl: (52) Empty reply from server"
❌ Multiple retry attempts without success
```

## 🎯 Test Commands

### Basic Test
```bash
T2_URL="https://t2-vdp-355516763169.us-central1.run.app"
curl --connect-timeout 10 "$T2_URL/health"
```

### Full VDP Test (use with caution - consumes Vertex AI quota)
```bash
curl --http1.1 --max-time 60 -X POST "$T2_URL/api/vdp/extract-vertex" \
  -H 'Content-Type: application/json' \
  -d '{"gcsUri":"gs://tough-variety-raw/raw/ingest/test.mp4","meta":{"platform":"test"}}'
```

## 📱 Monitoring Commands

### Real-time Log Monitoring
```bash
# Monitor for parsing issues
gcloud logging tail "resource.type=cloud_run_revision" \
  --filter="textPayload:(JSON OR parse OR error)"
```

### Success Rate Check
```bash
# Count successful vs failed parsing
gcloud logging read "resource.type=cloud_run_revision" \
  --filter="textPayload:(JSON Repair OR Direct JSON parse)" --limit=20
```

---

💡 **Pro Tip**: Save this checklist locally and use it whenever JSON parsing issues occur. The `responseMimeType: "application/json"` setting solves 95% of problems.