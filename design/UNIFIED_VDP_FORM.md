# 📱 Unified VDP Submission Form - Design Specification

## Overview

Single-page, mobile-first interface for VDP (Video Detail Processing) content submission across YouTube, Instagram, and TikTok platforms with automated backend processing.

---

## 🎯 Design Goals

### User Experience
- **Single Submit Action**: One form handles all platforms with intelligent routing
- **Mobile-First**: Optimized for mobile content creators (primary user base)
- **Real-Time Feedback**: Progress tracking and immediate error handling
- **Platform-Agnostic**: Unified experience regardless of content source

### Technical Requirements
- **Backend Automation**: Server handles entire pipeline (yt-dlp → t2-extract → validation → BigQuery)
- **RFC 9457 Compliance**: Structured error responses for clear user guidance
- **Quality Gates**: Hook Gate and schema validation with user-friendly feedback
- **File Handling**: Secure upload with progress indication

---

## 📐 UI/UX Design

### Layout Structure
```
┌─────────────────────────────────────┐
│ 🎬 VDP Content Processor            │
├─────────────────────────────────────┤
│                                     │
│ ┌─ Platform Selection ─┐            │
│ │ ○ YouTube  ○ Instagram  ○ TikTok │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Content Input ─┐                 │
│ │ [Dynamic Form Fields]            │ │
│ │                                  │ │
│ │ [Submit Button]                  │ │
│ └──────────────────────────────────┘ │
│                                     │
│ ┌─ Progress & Status ─┐             │
│ │ ████████░░ 80%                   │ │
│ │ Processing: Hook analysis...     │ │
│ └──────────────────────────────────┘ │
│                                     │
│ ┌─ Results & Errors ─┐              │
│ │ [Success/Error Messages]         │ │
│ └──────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Platform-Specific Form Fields

#### YouTube Mode
```html
<div class="platform-youtube">
  <label>YouTube Shorts URL</label>
  <input 
    type="url" 
    placeholder="https://www.youtube.com/shorts/..." 
    pattern=".*youtube\.com/shorts/.*"
    required 
  />
  
  <label>Language (Optional)</label>
  <select>
    <option value="ko">Korean (한국어)</option>
    <option value="en">English</option>
    <option value="ja">Japanese (日本語)</option>
  </select>
</div>
```

#### Instagram/TikTok Mode
```html
<div class="platform-manual">
  <label>Video File (.mp4)</label>
  <input 
    type="file" 
    accept="video/mp4"
    max-size="100MB"
    required 
  />
  
  <label>Metadata JSON File</label>
  <input 
    type="file" 
    accept="application/json,.json"
    max-size="10MB"
    required 
  />
  
  <div class="metadata-helper">
    <details>
      <summary>Need help creating metadata?</summary>
      <pre class="json-template">
{
  "platform": "instagram_reels",
  "source_url": "https://instagram.com/p/...",
  "view_count": 12500,
  "like_count": 850,
  "comment_count": 42,
  "hashtags": ["viral", "trending"],
  "upload_date": "2025-08-15T10:00:00Z"
}
      </pre>
    </details>
  </div>
</div>
```

---

## 🔧 Backend API Design

### Unified Submission Endpoint

```yaml
POST /api/vdp/submit
Content-Type: multipart/form-data

Request Schema:
  platform: youtube | instagram | tiktok
  
  # YouTube fields
  url?: string (YouTube Shorts URL)
  language?: string (ko|en|ja, default: ko)
  
  # Manual upload fields  
  video_file?: File (MP4, max 100MB)
  metadata_file?: File (JSON, max 10MB)
  
  # Common fields
  webhook_url?: string (optional progress notifications)
```

### Response Format

#### Success (202 Accepted)
```json
{
  "status": "accepted",
  "job_id": "vdp_job_1692123456789",
  "platform": "youtube",
  "content_id": "6_I2FmT1mbY",
  "estimated_duration": "45-90 seconds",
  "progress_url": "/api/jobs/vdp_job_1692123456789",
  "webhook_url": null
}
```

#### Error (RFC 9457 Problem Details)
```json
{
  "type": "https://api.example.com/problems/invalid-url",
  "title": "Invalid YouTube URL",
  "status": 400,
  "detail": "The provided URL is not a valid YouTube Shorts link. Please check the format.",
  "instance": "/api/vdp/submit",
  "code": "INVALID_YOUTUBE_URL",
  "fixes": [
    "Ensure URL starts with 'https://www.youtube.com/shorts/'",
    "Check that the video ID is valid",
    "Verify the video is publicly accessible"
  ]
}
```

### Job Progress Endpoint

```yaml
GET /api/jobs/{job_id}

Response Schema:
  job_id: string
  status: queued | processing | completed | failed
  platform: youtube | instagram | tiktok
  content_id: string
  progress: number (0-100)
  current_step: string
  steps_completed: string[]
  estimated_remaining: string
  
  # On completion
  result?: {
    vdp_file_url: string (signed URL)
    hook_gate_status: pass | fail
    hook_analysis: {
      start_sec: number
      strength_score: number
      pattern_code: string
    }
    bigquery_loaded: boolean
    processing_time: number
  }
  
  # On error
  error?: RFC9457ProblemDetails
```

---

## ⚙️ Backend Processing Pipeline

### Automated Workflow
```yaml
1. Request Validation:
   - Platform detection
   - URL format validation (YouTube)
   - File validation (Instagram/TikTok)
   - Metadata schema check

2. Content Acquisition:
   YouTube: yt-dlp download + metadata extraction
   Manual: Direct file upload to GCS with metadata

3. VDP Generation:
   - Call t2-extract API with enhanced format
   - Vertex AI processing with schema enforcement
   - Real-time progress updates

4. Quality Validation:
   - Hook Gate validation (≤3s, ≥0.70)
   - AJV schema validation
   - Error handling with specific fix suggestions

5. Data Pipeline:
   - JSONL generation
   - GCS Gold bucket upload
   - BigQuery table loading
   - Success confirmation

6. Response Generation:
   - Result packaging
   - Signed URL generation
   - Final status update
```

### Error Mapping
```typescript
interface ErrorMapping {
  // YouTube specific
  INVALID_YOUTUBE_URL: {
    status: 400,
    fixes: ["Check URL format", "Verify video accessibility"]
  }
  YOUTUBE_VIDEO_UNAVAILABLE: {
    status: 404,
    fixes: ["Check if video is public", "Try a different video"]
  }
  
  // Upload specific
  FILE_TOO_LARGE: {
    status: 413,
    fixes: ["Compress video to under 100MB", "Use a shorter clip"]
  }
  INVALID_METADATA_JSON: {
    status: 422,
    fixes: ["Check JSON syntax", "Use provided template", "Validate required fields"]
  }
  
  // Processing specific
  HOOK_GATE_FAILED: {
    status: 422,
    fixes: ["Hook starts after 3 seconds", "Hook strength below 0.70", "Consider re-editing content"]
  }
  SCHEMA_VALIDATION_FAILED: {
    status: 422,
    fixes: ["Check metadata completeness", "Verify field types", "Review required properties"]
  }
  
  // System specific
  VERTEX_QUOTA_EXCEEDED: {
    status: 429,
    fixes: ["Try again in a few minutes", "Consider upgrading quota"]
  }
  PROCESSING_TIMEOUT: {
    status: 504,
    fixes: ["Try with shorter video", "Retry submission", "Contact support if persistent"]
  }
}
```

---

## 📱 Mobile-First Implementation

### Responsive Design Breakpoints
```css
/* Mobile First (320px+) */
.vdp-form {
  padding: 16px;
  max-width: 100vw;
}

.platform-selector {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .vdp-form {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
  }
}

/* Desktop (1024px+) */  
@media (min-width: 1024px) {
  .vdp-form {
    max-width: 800px;
  }
}
```

### Touch-Friendly Components
```html
<!-- Large touch targets (minimum 44px) -->
<button class="submit-btn" style="min-height: 44px; font-size: 16px;">
  Process Content
</button>

<!-- Progress indicator -->
<div class="progress-bar" role="progressbar">
  <div class="progress-fill" style="width: 75%"></div>
  <span class="progress-text">Hook analysis: 75%</span>
</div>

<!-- File upload with drag-drop -->
<div class="file-upload-zone" 
     ondrop="handleDrop(event)" 
     ondragover="handleDragOver(event)">
  <input type="file" id="video-file" accept="video/mp4" />
  <label for="video-file">
    📹 Tap to select or drag MP4 here
  </label>
</div>
```

---

## 🚀 Real-Time Progress Tracking

### WebSocket Integration
```typescript
// Client-side progress tracking
const ws = new WebSocket(`wss://api.example.com/jobs/${jobId}/progress`);

ws.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  updateProgressUI(progress);
};

interface ProgressUpdate {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  step: string;
  details?: string;
  error?: RFC9457ProblemDetails;
}
```

### Progress Steps
```yaml
Steps:
  0-10%: "Validating submission..."
  10-25%: "Downloading content..." (YouTube only)
  25-40%: "Uploading to processing..." 
  40-75%: "AI analysis in progress..."
  75-90%: "Quality validation..."
  90-95%: "Saving to database..."
  95-100%: "Processing complete!"
```

---

## 🎨 UI Components Specification

### Platform Selector
```html
<fieldset class="platform-selector" role="radiogroup">
  <legend>Choose Content Platform</legend>
  
  <input type="radio" id="youtube" name="platform" value="youtube" checked>
  <label for="youtube" class="platform-option">
    <span class="platform-icon">🎬</span>
    <span class="platform-name">YouTube</span>
    <span class="platform-desc">Shorts URL</span>
  </label>
  
  <input type="radio" id="instagram" name="platform" value="instagram">
  <label for="instagram" class="platform-option">
    <span class="platform-icon">📷</span>
    <span class="platform-name">Instagram</span>
    <span class="platform-desc">MP4 + JSON</span>
  </label>
  
  <input type="radio" id="tiktok" name="platform" value="tiktok">
  <label for="tiktok" class="platform-option">
    <span class="platform-icon">🎵</span>
    <span class="platform-name">TikTok</span>
    <span class="platform-desc">MP4 + JSON</span>
  </label>
</fieldset>
```

### Error Display
```html
<div class="error-container" role="alert" aria-live="polite">
  <div class="error-header">
    <span class="error-icon">⚠️</span>
    <span class="error-title">Hook Gate Failed</span>
    <span class="error-code">HOOK_GATE_FAILED</span>
  </div>
  
  <div class="error-message">
    Your content's hook starts at 4.2 seconds, but must begin within 3 seconds 
    for optimal engagement.
  </div>
  
  <div class="error-fixes">
    <h4>How to fix:</h4>
    <ul>
      <li>Edit your video to start the hook earlier</li>
      <li>Consider trimming the opening</li>
      <li>Try a more immediate opening statement</li>
    </ul>
  </div>
  
  <button class="retry-btn">Try Again</button>
</div>
```

### Success Display
```html
<div class="success-container" role="status" aria-live="polite">
  <div class="success-header">
    <span class="success-icon">✅</span>
    <span class="success-title">VDP Processing Complete!</span>
  </div>
  
  <div class="success-details">
    <div class="metric">
      <span class="label">Hook Quality:</span>
      <span class="value good">0.85/1.00</span>
    </div>
    <div class="metric">
      <span class="label">Hook Timing:</span>
      <span class="value good">1.2s</span>
    </div>
    <div class="metric">
      <span class="label">Processing Time:</span>
      <span class="value">47 seconds</span>
    </div>
  </div>
  
  <div class="success-actions">
    <a href="/vdp/results/{{job_id}}" class="view-results-btn">
      View Full Analysis
    </a>
    <button class="process-another-btn">Process Another</button>
  </div>
</div>
```

---

## 🔒 Security Considerations

### Input Validation
- **URL Sanitization**: Prevent injection via malicious URLs
- **File Type Verification**: MIME type + magic number validation
- **Size Limits**: Enforce maximum file sizes (100MB video, 10MB JSON)
- **Rate Limiting**: Per-user submission limits

### Data Privacy
- **Secure Upload**: Signed URLs for temporary file access
- **Auto-Cleanup**: Remove uploaded files after processing
- **Audit Logging**: Track all submissions for security monitoring

---

## 📊 Analytics Integration

### User Behavior Tracking
```typescript
// Track form interactions
analytics.track('vdp_platform_selected', { platform: 'youtube' });
analytics.track('vdp_submission_started', { platform, file_size });
analytics.track('vdp_processing_completed', { 
  platform, 
  processing_time, 
  hook_quality,
  success: true 
});
```

### Performance Metrics
- **Submission Success Rate**: Platform-specific completion rates
- **Processing Times**: Average duration by platform and content type
- **Error Frequency**: Most common error types for UX improvements
- **User Flow**: Drop-off points in the submission process

---

## 🎯 Implementation Priority

### Phase 1: Core Functionality
1. ✅ Basic form layout with platform selection
2. ✅ YouTube URL submission flow
3. ✅ Backend API endpoint setup
4. ✅ RFC 9457 error handling

### Phase 2: Manual Upload
1. 📝 File upload components
2. 📝 Instagram/TikTok metadata handling
3. 📝 Progress tracking implementation
4. 📝 Error recovery flows

### Phase 3: Enhanced UX
1. 📋 Real-time progress updates
2. 📋 Mobile optimization
3. 📋 Accessibility improvements
4. 📋 Analytics integration

### Phase 4: Advanced Features
1. ⏳ Batch processing
2. ⏳ Template management
3. ⏳ Advanced error recovery
4. ⏳ Performance optimization

---

This unified form design provides a streamlined, mobile-first experience while maintaining the robust backend processing pipeline we've built. The RFC 9457 error handling ensures users get clear, actionable feedback when issues occur.