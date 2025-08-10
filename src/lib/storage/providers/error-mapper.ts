/**
 * Storage Provider Error Mapper
 * Maps vendor-specific errors to RFC 9457 Problem Details
 */

import { ErrorCode } from '@/lib/errors/codes';
import { AppError } from '@/lib/errors/app-error';

export interface ProviderErrorContext {
  provider: 'supabase' | 'aws' | 'gcp' | 'azure';
  operation: string;
  error: any;
  key?: string;
}

/**
 * Maps provider-specific errors to standardized ErrorCodes
 */
export function mapProviderError(context: ProviderErrorContext): AppError {
  const { provider, operation, error, key } = context;

  // If already an AppError, return as-is
  if (error instanceof AppError) {
    return error;
  }

  // Extract error details based on provider
  const errorDetails = extractErrorDetails(provider, error);

  // Map to appropriate ErrorCode based on error patterns
  const { code, retryAfter } = determineErrorCode(errorDetails, operation);

  // Build sanitized error message (no sensitive info)
  const detail = buildSafeErrorMessage(errorDetails, operation, key);

  return new AppError(code, {
    detail,
    retryAfter,
    metadata: {
      provider,
      operation,
      // Never include: bucket names, URLs, credentials, internal paths
    },
  });
}

/**
 * Extract error details from provider-specific error objects
 */
function extractErrorDetails(provider: string, error: any): {
  code?: string;
  message?: string;
  statusCode?: number;
  isQuotaError?: boolean;
  isPolicyError?: boolean;
  isRateLimitError?: boolean;
  isNotFoundError?: boolean;
  isAuthError?: boolean;
  retryable?: boolean;
} {
  switch (provider) {
    case 'supabase':
      return extractSupabaseError(error);
    case 'aws':
      return extractAwsError(error);
    case 'gcp':
      return extractGcpError(error);
    case 'azure':
      return extractAzureError(error);
    default:
      return {
        message: error?.message || 'Unknown error',
        statusCode: error?.status || error?.statusCode || 500,
      };
  }
}

/**
 * Supabase-specific error extraction
 */
function extractSupabaseError(error: any) {
  const statusCode = error?.status || error?.statusCode;
  const message = error?.message || '';
  const code = error?.code || '';

  return {
    code,
    message,
    statusCode,
    isQuotaError: 
      message.toLowerCase().includes('quota') ||
      message.toLowerCase().includes('storage quota'),
    isPolicyError:
      statusCode === 403 ||
      message.includes('policy') ||
      message.includes('permission') ||
      message.includes('forbidden') ||
      message.includes('not authorized'),
    isRateLimitError:
      statusCode === 429 ||
      message.toLowerCase().includes('rate limit') ||
      message.toLowerCase().includes('too many') ||
      message.toLowerCase().includes('slow down'),
    isNotFoundError:
      statusCode === 404 ||
      message.includes('not found') ||
      message.includes('does not exist'),
    isAuthError:
      statusCode === 401 ||
      message.includes('unauthorized') ||
      message.includes('authentication'),
    retryable:
      statusCode === 429 ||
      statusCode === 503 ||
      statusCode >= 500,
  };
}

/**
 * AWS S3-specific error extraction
 */
function extractAwsError(error: any) {
  const code = error?.Code || error?.code || '';
  const statusCode = error?.$metadata?.httpStatusCode || error?.statusCode;
  const message = error?.message || '';

  return {
    code,
    message,
    statusCode,
    isQuotaError:
      code === 'ServiceQuotaExceededException' ||
      code === 'RequestLimitExceeded' ||
      code === 'BandwidthLimitExceeded',
    isPolicyError:
      code === 'AccessDenied' ||
      code === 'PolicyNotFulfilled' ||
      code === 'InvalidPolicyDocument',
    isRateLimitError:
      code === 'Throttling' ||
      code === 'ThrottlingException' ||
      code === 'TooManyRequests' ||
      code === 'RequestThrottled',
    isNotFoundError:
      code === 'NoSuchKey' ||
      code === 'NoSuchBucket' ||
      code === 'NotFound',
    isAuthError:
      code === 'UnauthorizedAccess' ||
      code === 'InvalidUserCredentials' ||
      code === 'TokenRefreshRequired',
    retryable:
      code === 'RequestTimeout' ||
      code === 'ServiceUnavailable' ||
      statusCode === 503 ||
      statusCode >= 500,
  };
}

/**
 * Google Cloud Storage-specific error extraction
 */
function extractGcpError(error: any) {
  const code = error?.code || error?.errors?.[0]?.reason;
  const statusCode = error?.code || error?.response?.status;
  const message = error?.message || '';

  return {
    code,
    message,
    statusCode,
    isQuotaError:
      code === 'quotaExceeded',
    isPolicyError:
      code === 'forbidden' ||
      code === 'insufficientPermissions' ||
      code === 'accessDenied',
    isRateLimitError:
      code === 'rateLimitExceeded' ||
      code === 'userRateLimitExceeded' ||
      statusCode === 429,
    isNotFoundError:
      code === 'notFound' ||
      statusCode === 404,
    isAuthError:
      code === 'unauthorized' ||
      code === 'authError' ||
      statusCode === 401,
    retryable:
      code === 'backendError' ||
      code === 'internalError' ||
      statusCode >= 500,
  };
}

/**
 * Azure Blob Storage-specific error extraction
 */
function extractAzureError(error: any) {
  const code = error?.code || error?.errorCode;
  const statusCode = error?.statusCode || error?.response?.status;
  const message = error?.message || '';

  return {
    code,
    message,
    statusCode,
    isQuotaError:
      code === 'QuotaExceeded' ||
      code === 'InsufficientAccountPermissions',
    isPolicyError:
      code === 'AuthorizationFailure' ||
      code === 'AuthorizationPermissionMismatch' ||
      code === 'Forbidden',
    isRateLimitError:
      code === 'ServerBusy' ||
      code === 'TooManyRequests' ||
      statusCode === 429,
    isNotFoundError:
      code === 'BlobNotFound' ||
      code === 'ContainerNotFound' ||
      statusCode === 404,
    isAuthError:
      code === 'AuthenticationFailed' ||
      code === 'InvalidAuthenticationInfo' ||
      statusCode === 401,
    retryable:
      code === 'ServerBusy' ||
      code === 'InternalError' ||
      code === 'OperationTimedOut' ||
      statusCode === 503 ||
      statusCode >= 500,
  };
}

/**
 * Determine the appropriate ErrorCode based on error details
 */
function determineErrorCode(
  details: ReturnType<typeof extractErrorDetails>,
  operation: string
): { code: ErrorCode; retryAfter?: number } {
  // Quota errors
  if (details.isQuotaError) {
    return {
      code: ErrorCode.PROVIDER_QUOTA_EXCEEDED,
      retryAfter: 3600, // 1 hour default
    };
  }

  // Rate limiting
  if (details.isRateLimitError) {
    return {
      code: ErrorCode.RATE_LIMITED,
      retryAfter: 60, // 1 minute default
    };
  }

  // Policy/permission errors
  if (details.isPolicyError) {
    return {
      code: ErrorCode.PROVIDER_POLICY_BLOCKED,
    };
  }

  // Not found errors
  if (details.isNotFoundError) {
    return {
      code: ErrorCode.RESOURCE_NOT_FOUND,
    };
  }

  // Authentication errors
  if (details.isAuthError) {
    return {
      code: ErrorCode.UNAUTHORIZED,
    };
  }

  // Default to internal error for retryable errors
  if (details.retryable) {
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      retryAfter: 30,
    };
  }

  // Default based on operation
  switch (operation) {
    case 'createSignedUploadUrl':
    case 'initResumableUpload':
      return { code: ErrorCode.PROVIDER_POLICY_BLOCKED };
    case 'getSignedReadUrl':
    case 'headObject':
      return { code: ErrorCode.RESOURCE_NOT_FOUND };
    default:
      return { code: ErrorCode.INTERNAL_ERROR };
  }
}

/**
 * Build a safe error message without exposing sensitive information
 */
function buildSafeErrorMessage(
  details: ReturnType<typeof extractErrorDetails>,
  operation: string,
  key?: string
): string {
  // Never include: bucket names, full URLs, credentials, internal paths
  
  if (details.isQuotaError) {
    return 'Storage quota exceeded. Please try again later.';
  }

  if (details.isRateLimitError) {
    return 'Too many requests. Please slow down.';
  }

  if (details.isPolicyError) {
    return 'Access denied by storage policy.';
  }

  if (details.isNotFoundError) {
    return 'Requested resource not found.';
  }

  if (details.isAuthError) {
    return 'Authentication required for this operation.';
  }

  // Generic messages based on operation
  switch (operation) {
    case 'createSignedUploadUrl':
      return 'Failed to create upload URL.';
    case 'getSignedReadUrl':
      return 'Failed to create read URL.';
    case 'deleteObject':
      return 'Failed to delete object.';
    case 'objectExists':
      return 'Failed to check object existence.';
    case 'headObject':
      return 'Failed to retrieve object metadata.';
    case 'initResumableUpload':
      return 'Failed to initialize resumable upload.';
    case 'completeResumableUpload':
      return 'Failed to complete resumable upload.';
    case 'abortResumableUpload':
      return 'Failed to abort resumable upload.';
    default:
      return 'Storage operation failed.';
  }
}

/**
 * Extract retry-after value from various error formats
 */
export function extractRetryAfter(error: any): number | undefined {
  // Check for explicit retry-after headers or fields
  const retryAfter = 
    error?.headers?.['retry-after'] ||
    error?.headers?.['Retry-After'] ||
    error?.retryAfter ||
    error?.RetryAfter;

  if (retryAfter) {
    // If it's a date string, calculate seconds
    if (isNaN(Number(retryAfter))) {
      const retryDate = new Date(retryAfter);
      if (!isNaN(retryDate.getTime())) {
        return Math.max(0, Math.floor((retryDate.getTime() - Date.now()) / 1000));
      }
    }
    // Otherwise treat as seconds
    return Number(retryAfter);
  }

  // Default retry-after based on error type
  if (error?.statusCode === 429 || error?.status === 429) {
    return 60; // 1 minute for rate limiting
  }

  if (error?.statusCode === 503 || error?.status === 503) {
    return 30; // 30 seconds for service unavailable
  }

  return undefined;
}