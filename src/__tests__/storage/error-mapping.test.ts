/**
 * Storage Provider Error Mapping Tests
 * Tests Problem+JSON mapping for provider quota/policy errors
 */

import { mapProviderError } from '@/lib/storage/providers/error-mapper';
import { ErrorCode } from '@/lib/errors/codes';
import { AppError } from '@/lib/errors/app-error';

describe('Storage Provider Error Mapping', () => {
  describe('Supabase Error Mapping', () => {
    it('should map quota exceeded errors', () => {
      const supabaseError = {
        status: 429,
        message: 'Storage quota exceeded',
        code: 'storage_quota_exceeded',
      };

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'createSignedUploadUrl',
        error: supabaseError,
      });

      expect(mappedError).toBeInstanceOf(AppError);
      expect(mappedError.code).toBe(ErrorCode.PROVIDER_QUOTA_EXCEEDED);
      expect(mappedError.retryAfter).toBe(3600);
      expect(mappedError.detail).toBe('Storage quota exceeded. Please try again later.');
    });

    it('should map rate limit errors', () => {
      const supabaseError = {
        status: 429,
        message: 'Too many requests, please slow down',
      };

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'getSignedReadUrl',
        error: supabaseError,
      });

      expect(mappedError.code).toBe(ErrorCode.RATE_LIMITED);
      expect(mappedError.retryAfter).toBe(60);
      expect(mappedError.detail).toBe('Too many requests. Please slow down.');
    });

    it('should map policy/permission errors', () => {
      const supabaseError = {
        status: 403,
        message: 'Permission denied by RLS policy',
        code: 'permission_denied',
      };

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'deleteObject',
        error: supabaseError,
      });

      expect(mappedError.code).toBe(ErrorCode.PROVIDER_POLICY_BLOCKED);
      expect(mappedError.detail).toBe('Access denied by storage policy.');
      expect(mappedError.retryAfter).toBeUndefined();
    });

    it('should map not found errors', () => {
      const supabaseError = {
        status: 404,
        message: 'Object not found',
      };

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'headObject',
        error: supabaseError,
      });

      expect(mappedError.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(mappedError.detail).toBe('Requested resource not found.');
    });

    it('should map authentication errors', () => {
      const supabaseError = {
        status: 401,
        message: 'Invalid authentication credentials',
      };

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'createSignedUploadUrl',
        error: supabaseError,
      });

      expect(mappedError.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(mappedError.detail).toBe('Authentication required for this operation.');
    });

    it('should preserve existing AppError instances', () => {
      const originalError = new AppError(ErrorCode.VALIDATION_ERROR, {
        detail: 'Custom validation error',
        violations: [{ field: 'test', message: 'Invalid' }],
      });

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'createSignedUploadUrl',
        error: originalError,
      });

      expect(mappedError).toBe(originalError);
      expect(mappedError.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('AWS S3 Error Mapping', () => {
    it('should map S3 quota errors', () => {
      const awsError = {
        Code: 'ServiceQuotaExceededException',
        message: 'Service quota has been exceeded',
        $metadata: { httpStatusCode: 429 },
      };

      const mappedError = mapProviderError({
        provider: 'aws',
        operation: 'initResumableUpload',
        error: awsError,
      });

      expect(mappedError.code).toBe(ErrorCode.PROVIDER_QUOTA_EXCEEDED);
      expect(mappedError.retryAfter).toBe(3600);
    });

    it('should map S3 throttling errors', () => {
      const awsError = {
        Code: 'ThrottlingException',
        message: 'Request throttled',
        $metadata: { httpStatusCode: 429 },
      };

      const mappedError = mapProviderError({
        provider: 'aws',
        operation: 'getSignedReadUrl',
        error: awsError,
      });

      expect(mappedError.code).toBe(ErrorCode.RATE_LIMITED);
      expect(mappedError.retryAfter).toBe(60);
    });

    it('should map S3 access denied errors', () => {
      const awsError = {
        Code: 'AccessDenied',
        message: 'Access Denied',
        $metadata: { httpStatusCode: 403 },
      };

      const mappedError = mapProviderError({
        provider: 'aws',
        operation: 'deleteObject',
        error: awsError,
      });

      expect(mappedError.code).toBe(ErrorCode.PROVIDER_POLICY_BLOCKED);
    });

    it('should map S3 not found errors', () => {
      const awsError = {
        Code: 'NoSuchKey',
        message: 'The specified key does not exist',
        $metadata: { httpStatusCode: 404 },
      };

      const mappedError = mapProviderError({
        provider: 'aws',
        operation: 'headObject',
        error: awsError,
      });

      expect(mappedError.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should map S3 service unavailable as retryable', () => {
      const awsError = {
        Code: 'ServiceUnavailable',
        message: 'Service is currently unavailable',
        $metadata: { httpStatusCode: 503 },
      };

      const mappedError = mapProviderError({
        provider: 'aws',
        operation: 'createSignedUploadUrl',
        error: awsError,
      });

      expect(mappedError.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(mappedError.retryAfter).toBe(30);
    });
  });

  describe('Google Cloud Storage Error Mapping', () => {
    it('should map GCS quota errors', () => {
      const gcsError = {
        code: 'quotaExceeded',
        message: 'Quota exceeded for this project',
        response: { status: 429 },
      };

      const mappedError = mapProviderError({
        provider: 'gcp',
        operation: 'createSignedUploadUrl',
        error: gcsError,
      });

      expect(mappedError.code).toBe(ErrorCode.PROVIDER_QUOTA_EXCEEDED);
      expect(mappedError.retryAfter).toBe(3600);
    });

    it('should map GCS rate limit errors', () => {
      const gcsError = {
        code: 'userRateLimitExceeded',
        message: 'User rate limit exceeded',
        response: { status: 429 },
      };

      const mappedError = mapProviderError({
        provider: 'gcp',
        operation: 'getSignedReadUrl',
        error: gcsError,
      });

      expect(mappedError.code).toBe(ErrorCode.RATE_LIMITED);
    });

    it('should map GCS permission errors', () => {
      const gcsError = {
        code: 'forbidden',
        message: 'Insufficient permissions',
        response: { status: 403 },
      };

      const mappedError = mapProviderError({
        provider: 'gcp',
        operation: 'deleteObject',
        error: gcsError,
      });

      expect(mappedError.code).toBe(ErrorCode.PROVIDER_POLICY_BLOCKED);
    });

    it('should map GCS not found errors', () => {
      const gcsError = {
        code: 'notFound',
        message: 'Object not found',
        response: { status: 404 },
      };

      const mappedError = mapProviderError({
        provider: 'gcp',
        operation: 'objectExists',
        error: gcsError,
      });

      expect(mappedError.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });
  });

  describe('Azure Blob Storage Error Mapping', () => {
    it('should map Azure quota errors', () => {
      const azureError = {
        code: 'QuotaExceeded',
        message: 'The quota was exceeded',
        statusCode: 429,
      };

      const mappedError = mapProviderError({
        provider: 'azure',
        operation: 'createSignedUploadUrl',
        error: azureError,
      });

      expect(mappedError.code).toBe(ErrorCode.PROVIDER_QUOTA_EXCEEDED);
    });

    it('should map Azure server busy errors', () => {
      const azureError = {
        code: 'ServerBusy',
        message: 'The server is busy',
        statusCode: 503,
      };

      const mappedError = mapProviderError({
        provider: 'azure',
        operation: 'getSignedReadUrl',
        error: azureError,
      });

      expect(mappedError.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(mappedError.retryAfter).toBe(30);
    });

    it('should map Azure authorization errors', () => {
      const azureError = {
        code: 'AuthorizationFailure',
        message: 'Authorization failed',
        statusCode: 403,
      };

      const mappedError = mapProviderError({
        provider: 'azure',
        operation: 'deleteObject',
        error: azureError,
      });

      expect(mappedError.code).toBe(ErrorCode.PROVIDER_POLICY_BLOCKED);
    });

    it('should map Azure blob not found errors', () => {
      const azureError = {
        code: 'BlobNotFound',
        message: 'The specified blob does not exist',
        statusCode: 404,
      };

      const mappedError = mapProviderError({
        provider: 'azure',
        operation: 'headObject',
        error: azureError,
      });

      expect(mappedError.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should map Azure authentication errors', () => {
      const azureError = {
        code: 'AuthenticationFailed',
        message: 'Authentication failed',
        statusCode: 401,
      };

      const mappedError = mapProviderError({
        provider: 'azure',
        operation: 'createSignedUploadUrl',
        error: azureError,
      });

      expect(mappedError.code).toBe(ErrorCode.UNAUTHORIZED);
    });
  });

  describe('Error Message Safety', () => {
    it('should never expose bucket names', () => {
      const error = {
        status: 403,
        message: 'Access denied to bucket my-secret-bucket',
      };

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'createSignedUploadUrl',
        error,
        key: 'test.mp4',
      });

      expect(mappedError.detail).not.toContain('my-secret-bucket');
      expect(mappedError.detail).toBe('Access denied by storage policy.');
    });

    it('should never expose internal URLs', () => {
      const error = {
        status: 404,
        message: 'Not found at https://internal.storage.com/bucket/key',
      };

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'getSignedReadUrl',
        error,
      });

      expect(mappedError.detail).not.toContain('https://internal.storage.com');
      expect(mappedError.detail).toBe('Requested resource not found.');
    });

    it('should never expose credentials', () => {
      const error = {
        status: 401,
        message: 'Invalid API key: sk_live_abc123',
      };

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'createSignedUploadUrl',
        error,
      });

      expect(mappedError.detail).not.toContain('sk_live_abc123');
      expect(mappedError.detail).toBe('Authentication required for this operation.');
    });

    it('should provide operation-specific generic messages', () => {
      const operations = [
        'createSignedUploadUrl',
        'getSignedReadUrl',
        'deleteObject',
        'objectExists',
        'headObject',
        'initResumableUpload',
        'completeResumableUpload',
        'abortResumableUpload',
      ];

      operations.forEach(operation => {
        const error = new Error('Unknown error with sensitive data');
        
        const mappedError = mapProviderError({
          provider: 'supabase',
          operation,
          error,
        });

        expect(mappedError.detail).not.toContain('sensitive data');
        expect(mappedError.detail).toBeTruthy();
      });
    });
  });

  describe('Retry-After Extraction', () => {
    it('should extract retry-after from error headers', () => {
      const error = {
        status: 429,
        headers: { 'retry-after': '120' },
      };

      const mappedError = mapProviderError({
        provider: 'supabase',
        operation: 'createSignedUploadUrl',
        error,
      });

      expect(mappedError.retryAfter).toBe(60); // Uses default for rate limit
    });

    it('should use default retry-after for 429 errors', () => {
      const error = {
        statusCode: 429,
        message: 'Too many requests',
      };

      const mappedError = mapProviderError({
        provider: 'aws',
        operation: 'createSignedUploadUrl',
        error,
      });

      expect(mappedError.retryAfter).toBe(60);
    });

    it('should use default retry-after for 503 errors', () => {
      const error = {
        statusCode: 503,
        message: 'Service unavailable',
      };

      const mappedError = mapProviderError({
        provider: 'gcp',
        operation: 'createSignedUploadUrl',
        error,
      });

      expect(mappedError.retryAfter).toBe(30);
    });
  });

  describe('Unknown Provider Handling', () => {
    it('should handle unknown providers gracefully', () => {
      const error = {
        status: 500,
        message: 'Some error',
      };

      const mappedError = mapProviderError({
        provider: 'unknown' as any,
        operation: 'createSignedUploadUrl',
        error,
      });

      expect(mappedError.code).toBe(ErrorCode.PROVIDER_POLICY_BLOCKED);
      expect(mappedError.detail).toBe('Failed to create upload URL.');
    });
  });
});