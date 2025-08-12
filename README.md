# File-Only Curation System

A scalable file curation system with bulk upload capabilities, manual field entry, CSV/TSV import, and intelligent merge policies.

## Features

### 1. Bulk Upload with Direct GCS Upload
- **Drag & Drop Multi-File**: Support for up to 100 files per batch
- **Signed URL Generation**: Secure direct upload to Google Cloud Storage
- **Progress Tracking**: Real-time upload progress for each file
- **Batch Management**: Group uploads by batch ID for easier management

### 2. Manual Curation Fields
- **Required Fields**:
  - `uploadDateTime`: Original upload timestamp
  - `viewCount`: View count from platform
  - `likeCount`: Like/favorite count
  - `commentCount`: Comment count
  - `platform`: Source platform (YouTube, TikTok, Instagram, etc.)
  - `origin`: Original URL

- **Optional Fields**:
  - `topComments`: Top 5 comments with metadata
  - `soundId` / `soundTitle`: Audio track information
  - `curatorNotes`: Additional notes from curator
  - `tags`: Content tags
  - `category`: Content category

### 3. Intelligent Merge Policy
- **Manual Priority**: Curator-provided fields override model-extracted data by default
- **Conflict Tracking**: All merge conflicts are logged for review
- **Custom Merge Rules**: Field-level merge strategies (replace, append, average, etc.)
- **Validation**: Schema validation ensures data integrity

### 4. CSV/TSV Import Wizard
- **Column Mapping**: Visual interface to map CSV columns to schema fields
- **Data Transformation**: Built-in transformers (number, date, JSON, case conversion)
- **Dry-Run Validation**: Preview validation errors before import
- **Batch Processing**: Efficient chunk-based import for large files

## Architecture

### API Endpoints

#### `POST /api/upload`
Generate signed URLs for bulk file upload
```typescript
{
  files: Array<{
    filename: string
    contentType: string
    size: number
  }>
  metadata: {
    curatorId: string
    projectId: string
  }
}
```

#### `POST /api/curation/import`
Import CSV/TSV records
```typescript
{
  batchId: string
  projectId: string
  records: Array<ManualCurationFields>
}
```

### Job Queue System

Uses BullMQ with Redis for async processing:

1. **File Processing Queue** (`file-processing`)
   - Downloads files from GCS
   - Extracts model fields
   - Merges with manual fields
   - Stores curation records

2. **Batch Import Queue** (`batch-import`)
   - Processes CSV/TSV imports
   - Creates virtual file entries
   - Queues individual records for processing

### Data Schema

#### CurationRecord
```typescript
{
  id: string
  fileId: string
  batchId: string
  curatorId: string
  projectId: string
  
  // File metadata
  filename: string
  contentType: string
  size: number
  gcsPath: string
  
  // Curation data
  manualFields: ManualCurationFields
  modelFields: ModelExtractedFields
  mergedFields: Record<string, any>
  
  // Merge metadata
  mergeStrategy: 'manual_priority' | 'model_priority' | 'custom'
  mergeConflicts: Array<ConflictRecord>
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed'
  processedAt: string
}
```

## Setup

### Prerequisites
- Node.js 18+
- Redis server
- Google Cloud Storage bucket
- PostgreSQL database

### Environment Variables
```env
# Google Cloud Storage
GCP_PROJECT_ID=your-project-id
GCP_KEY_FILE=path/to/service-account.json
GCS_BUCKET_NAME=curation-uploads

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional-password

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/curation

# Worker Configuration
FILE_PROCESSING_CONCURRENCY=5
BATCH_IMPORT_CONCURRENCY=3
```

### Installation
```bash
npm install
```

### Running the System

1. **Start the web server**:
```bash
npm run dev
```

2. **Start the job workers**:
```bash
npm run worker
```

3. **Monitor queues** (optional):
```bash
npm run queue-ui
```

## Usage

### Bulk File Upload

```javascript
// Client-side upload
const uploadFiles = async (files) => {
  // 1. Request signed URLs
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      files: files.map(f => ({
        filename: f.name,
        contentType: f.type,
        size: f.size
      })),
      metadata: {
        curatorId: userId,
        projectId: projectId
      }
    })
  });
  
  const { signedUrls } = await response.json();
  
  // 2. Upload directly to GCS
  for (let i = 0; i < files.length; i++) {
    await fetch(signedUrls[i].uploadUrl, {
      method: 'PUT',
      headers: signedUrls[i].uploadHeaders,
      body: files[i]
    });
  }
};
```

### CSV Import

```javascript
// Use the CSV Import Wizard component
import { CSVImportWizard } from './components/CSVImportWizard';

<CSVImportWizard
  projectId={projectId}
  onImportComplete={(batchId, count) => {
    console.log(`Imported ${count} records in batch ${batchId}`);
  }}
  onError={(error) => {
    console.error('Import failed:', error);
  }}
/>
```

### Custom Merge Policy

```javascript
import { MergePolicy } from './schemas/curation';

const customPolicy: MergePolicy = {
  strategy: 'custom',
  fieldRules: {
    viewCount: { source: 'merge', mergeFunction: 'max' },
    tags: { source: 'merge', mergeFunction: 'append' },
    category: { source: 'manual' }
  },
  conflictResolution: {
    defaultSource: 'manual',
    requireReview: true,
    notifyOnConflict: true
  }
};
```

## Monitoring

### Queue Health Check
```bash
curl http://localhost:3000/api/health/queues
```

### Metrics
- Upload success rate
- Processing time per file
- Merge conflict rate
- Import validation errors

## Scaling Considerations

1. **GCS Upload**: Direct upload bypasses server, scales with GCS limits
2. **Job Processing**: Adjust concurrency via environment variables
3. **Database**: Use connection pooling and read replicas
4. **Redis**: Consider Redis Cluster for high throughput
5. **CSV Import**: Process in chunks to avoid memory issues

## Security

- Signed URLs expire after 1 hour
- File size limits enforced (500MB per file)
- Authentication required for all endpoints
- Row-level security in database
- Input validation with Zod schemas

## License

MIT