# Supabase Storage Setup

## Uploads Bucket Configuration

### 1. Create Storage Bucket

1. Go to Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **"New bucket"**
4. Configure:
   - **Name:** `uploads`
   - **Public bucket:** ❌ **No** (Keep private)
   - **File size limit:** 50MB (or your preferred limit)

### 2. Storage Policies

#### RLS (Row Level Security) Policies

```sql
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload
CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for service role to access all files
CREATE POLICY "Service role can access all files" ON storage.objects
  FOR ALL USING (auth.role() = 'service_role');
```

### 3. Access Control

- **Public read access:** ❌ **Disabled**
- **Signed URLs only:** ✅ **Enabled**
- **File access:** Via presigned URLs only

### 4. File Upload Flow

1. **Client** → `/api/input/upload/presign` → Get presigned URL
2. **Client** → **Presigned URL** → Upload file directly to Supabase
3. **Client** → `/api/input/upload` → Register file metadata
4. **Server** → Process file and create VDP

### 5. Security Considerations

- Files are not publicly accessible
- All access requires authentication
- Presigned URLs expire automatically
- File size and type validation on server side





