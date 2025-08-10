# Storage Provider Abstraction Rules v2

## Purpose
Enforce vendor-neutral storage operations to prevent vendor lock-in and maintain abstraction boundaries.
Supports resumable uploads and signed reads.

## Vendor Isolation Rules

### ❌ NEVER Import Vendor SDKs Outside Provider Directory
- NEVER import `@supabase/*` outside of `src/lib/storage/providers/`
- NEVER import `aws-sdk` or `@aws-sdk/*` outside of `src/lib/storage/providers/`
- NEVER import `@google-cloud/*` outside of `src/lib/storage/providers/`
- NEVER import `@azure/*` outside of `src/lib/storage/providers/`
- NEVER import any storage vendor SDK in application code

### ✅ ALWAYS Use the Storage Abstraction
- Always import from `@/lib/storage` for storage operations
- Always use `getStorageProvider()` to get storage instance
- Always use `StorageProvider` interface types
- Always handle errors with Problem+JSON format

## Security Rules

### 🔒 Credential Protection
- NEVER log storage URLs (they contain signatures)
- NEVER log bucket names or storage keys
- NEVER expose provider-specific error details to clients
- NEVER include credentials in error messages
- NEVER commit `.env` files with real credentials

### 🛡️ Error Handling
- Always map provider errors to AppError
- Always use ErrorCode.PROVIDER_QUOTA_EXCEEDED for rate limits
- Always use ErrorCode.PROVIDER_POLICY_BLOCKED for access denied
- Always return Problem+JSON format for API errors
- Never expose internal storage paths or bucket structure

### 🔗 URL Security
- NEVER hardcode public URLs - always use signed URLs
- Always use getSignedReadUrl() for read access
- Always specify TTL for signed URLs
- Never expose permanent/unsigned URLs to clients
- Always use response disposition for downloads

## Code Examples

### ✅ CORRECT - Using the Abstraction v2
```typescript
import { getStorageProvider } from '@/lib/storage';

// Simple upload
export async function uploadFile(key: string, file: File) {
  const storage = getStorageProvider();
  
  // Get signed upload URL with content type
  const { url, headers } = await storage.createSignedUploadUrl(
    key,
    file.type,
    {
      maxSizeBytes: file.size,
    }
  );
  
  // Upload directly from client
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: file,
  });
  
  return response.ok;
}

// Resumable upload for large files
export async function uploadLargeFile(key: string, file: File) {
  const storage = getStorageProvider();
  
  // Initialize resumable upload
  const { uploadId } = await storage.createSignedUploadUrl(
    key,
    file.type,
    {
      resumable: true,
    }
  );
  
  // Upload would continue with parts...
  return uploadId;
}

// Signed read with TTL
export async function getFileUrl(key: string, download = false) {
  const storage = getStorageProvider();
  
  const { url } = await storage.getSignedReadUrl(key, {
    ttlSec: 3600, // 1 hour
    responseDisposition: download ? 'attachment' : 'inline',
  });
  
  return url;
}
```

### ❌ WRONG - Direct Vendor Import
```typescript
// DON'T DO THIS!
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
const { data } = await supabase.storage.from('bucket').upload(path, file);
```

### ✅ CORRECT - Error Handling
```typescript
import { getStorageProvider } from '@/lib/storage';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode } from '@/lib/errors/codes';

export async function getFileUrl(key: string) {
  const storage = getStorageProvider();
  
  try {
    const { url } = await storage.getSignedReadUrl(key);
    return url;
  } catch (error) {
    // Map to generic error - don't expose provider details
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      ErrorCode.RESOURCE_NOT_FOUND,
      'File not found'
    );
  }
}
```

### ❌ WRONG - Exposing Provider Details
```typescript
// DON'T DO THIS!
try {
  const url = await getSignedUrl(key);
} catch (error) {
  // Exposing Supabase-specific error
  return res.status(500).json({
    error: `Supabase error: ${error.message}`,
    bucket: 'previews', // Never expose bucket names!
  });
}
```

## Testing Guidelines

### Unit Tests
- Use `FakeStorageProvider` for unit tests
- Never call real storage APIs in unit tests
- Mock all external storage operations
- Test error handling paths

### Integration Tests
- Use test-specific buckets/containers
- Clean up test data after each run
- Never use production storage accounts
- Use short TTLs for test URLs

## Migration Checklist

When migrating existing code:

1. [ ] Identify all direct vendor imports
2. [ ] Replace with `getStorageProvider()` calls
3. [ ] Update error handling to use AppError
4. [ ] Remove bucket names from logs/errors
5. [ ] Add proper Problem+JSON responses
6. [ ] Update tests to use FakeStorageProvider
7. [ ] Verify no vendor imports outside providers/

## File Organization

```
src/lib/storage/
├── index.ts              # Factory and public API
├── types.ts              # StorageProvider interface
└── providers/
    ├── supabase.ts       # Supabase implementation
    ├── s3.ts            # Future: AWS S3 implementation
    ├── gcs.ts           # Future: Google Cloud Storage
    └── azure.ts         # Future: Azure Blob Storage
```

## Enforcement

These rules should be enforced via:
- ESLint rules for import restrictions
- TypeScript paths configuration
- Code review checklist
- CI/CD validation scripts

## Questions to Ask During Code Review

1. Are there any direct vendor SDK imports outside `providers/`?
2. Are storage URLs or bucket names being logged?
3. Are errors properly mapped to AppError codes?
4. Is the code using the StorageProvider interface?
5. Are credentials or internal paths exposed in errors?
6. Are tests using FakeStorageProvider instead of real APIs?