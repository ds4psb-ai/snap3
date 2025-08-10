/**
 * Error code taxonomy following CLAUDE.md specifications
 * RFC 9457 Problem Details compliant
 */

export enum ErrorCode {
  // Preview & Format Errors
  UNSUPPORTED_AR_FOR_PREVIEW = 'UNSUPPORTED_AR_FOR_PREVIEW',
  INVALID_DURATION = 'INVALID_DURATION',
  MISSING_FIRST_FRAME = 'MISSING_FIRST_FRAME',
  
  // Provider & Rate Limiting
  PROVIDER_QUOTA_EXCEEDED = 'PROVIDER_QUOTA_EXCEEDED',
  PROVIDER_POLICY_BLOCKED = 'PROVIDER_POLICY_BLOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Content & Embedding
  EMBED_DENIED = 'EMBED_DENIED',
  
  // Quality Assurance
  QA_RULE_VIOLATION = 'QA_RULE_VIOLATION',
  
  // Additional common errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export interface ErrorMetadata {
  status: number;
  title: string;
  fix: string;
  type: string;
  retryable?: boolean;
  retryAfter?: number;
}

export const ERROR_META: Record<ErrorCode, ErrorMetadata> = {
  [ErrorCode.UNSUPPORTED_AR_FOR_PREVIEW]: {
    status: 422,
    title: 'Preview aspect ratio not supported',
    fix: 'Render 16:9; return crop-proxy metadata or switch AR.',
    type: 'https://api.snap3.com/problems/unsupported-ar',
  },
  
  [ErrorCode.INVALID_DURATION]: {
    status: 422,
    title: 'Preview duration must be 8 seconds',
    fix: 'Set duration to exactly 8.0 seconds and re-validate.',
    type: 'https://api.snap3.com/problems/invalid-duration',
  },
  
  [ErrorCode.MISSING_FIRST_FRAME]: {
    status: 400,
    title: 'First frame image required',
    fix: 'Upload product/first frame image and re-compile.',
    type: 'https://api.snap3.com/problems/missing-first-frame',
  },
  
  [ErrorCode.PROVIDER_QUOTA_EXCEEDED]: {
    status: 429,
    title: 'Provider quota exceeded',
    fix: 'Honor Retry-After header; reduce batch size.',
    type: 'https://api.snap3.com/problems/provider-quota',
    retryable: true,
    retryAfter: 3600,
  },
  
  [ErrorCode.PROVIDER_POLICY_BLOCKED]: {
    status: 403,
    title: 'Blocked by provider policy',
    fix: 'Remove flagged params; resubmit.',
    type: 'https://api.snap3.com/problems/provider-policy',
  },
  
  [ErrorCode.RATE_LIMITED]: {
    status: 429,
    title: 'Too many requests',
    fix: 'Backoff per headers.',
    type: 'https://api.snap3.com/problems/rate-limited',
    retryable: true,
    retryAfter: 60,
  },
  
  [ErrorCode.EMBED_DENIED]: {
    status: 403,
    title: 'Embed denied',
    fix: 'Use official embeds only; link out if needed.',
    type: 'https://api.snap3.com/problems/embed-denied',
  },
  
  [ErrorCode.QA_RULE_VIOLATION]: {
    status: 422,
    title: 'QA validation failed',
    fix: 'Fix Hook≤3s, safezones, fps/bitrate; re-run QA.',
    type: 'https://api.snap3.com/problems/qa-violation',
  },
  
  [ErrorCode.VALIDATION_ERROR]: {
    status: 400,
    title: 'Validation error',
    fix: 'Check request format and required fields.',
    type: 'https://api.snap3.com/problems/validation-error',
  },
  
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    status: 404,
    title: 'Resource not found',
    fix: 'Check resource ID and try again.',
    type: 'https://api.snap3.com/problems/not-found',
  },
  
  [ErrorCode.UNAUTHORIZED]: {
    status: 401,
    title: 'Authentication required',
    fix: 'Provide valid authentication credentials.',
    type: 'https://api.snap3.com/problems/unauthorized',
  },
  
  [ErrorCode.FORBIDDEN]: {
    status: 403,
    title: 'Access forbidden',
    fix: 'Check permissions for this resource.',
    type: 'https://api.snap3.com/problems/forbidden',
  },
  
  [ErrorCode.METHOD_NOT_ALLOWED]: {
    status: 405,
    title: 'Method not allowed',
    fix: 'Use a supported HTTP method for this endpoint.',
    type: 'https://api.snap3.com/problems/method-not-allowed',
  },
  
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    status: 500,
    title: 'Internal server error',
    fix: 'Contact support if issue persists.',
    type: 'https://api.snap3.com/problems/internal-error',
    retryable: true,
    retryAfter: 30,
  },
};