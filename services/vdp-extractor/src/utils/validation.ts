import { z } from 'zod';
import { ExtractVDPRequest, BatchExtractRequest } from '../types';

// URL validation schema
const urlSchema = z.string().url().refine(
  (url) => {
    // Check if URL is from supported platforms
    const supportedDomains = [
      'youtube.com',
      'youtu.be',
      'tiktok.com',
      'instagram.com',
      'vm.tiktok.com',
    ];
    
    try {
      const parsedUrl = new URL(url);
      return supportedDomains.some(domain => 
        parsedUrl.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  },
  {
    message: 'URL must be from a supported platform (YouTube, TikTok, Instagram)',
  }
);

// Extract VDP request validation schema
const extractVDPRequestSchema = z.object({
  url: urlSchema,
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'auto']).optional(),
  options: z.object({
    includeContentAnalysis: z.boolean().optional(),
    includeViralFactors: z.boolean().optional(),
    maxComments: z.number().min(0).max(100).optional(),
    deepAnalysis: z.boolean().optional(),
    skipCache: z.boolean().optional(),
  }).optional(),
});

// Batch extract request validation schema
const batchExtractRequestSchema = z.object({
  urls: z.array(urlSchema).min(1).max(50), // Limit to 50 URLs per batch
  options: extractVDPRequestSchema.shape.options.optional(),
});

/**
 * Validate extract VDP request
 */
export function validateExtractVDPRequest(data: unknown): ExtractVDPRequest {
  try {
    return extractVDPRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new Error(`Validation error: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Validate batch extract request
 */
export function validateBatchExtractRequest(data: unknown): BatchExtractRequest {
  try {
    return batchExtractRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new Error(`Validation error: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Validate and normalize URL
 */
export function validateAndNormalizeUrl(url: string): string {
  try {
    // Basic URL validation
    const parsedUrl = new URL(url);
    
    // Normalize YouTube URLs
    if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')) {
      // Extract video ID and create standard URL
      const videoIdPatterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      ];
      
      for (const pattern of videoIdPatterns) {
        const match = url.match(pattern);
        if (match) {
          return `https://www.youtube.com/watch?v=${match[1]}`;
        }
      }
    }
    
    // Return original URL if no normalization needed
    return url;
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Validate file upload parameters
 */
export function validateFileUpload(file: any, maxSizeMB: number = 100): void {
  if (!file) {
    throw new Error('No file provided');
  }
  
  if (!file.mimetype) {
    throw new Error('File mimetype is required');
  }
  
  // Check file type
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/avi',
    'video/mov',
    'video/quicktime',
    'video/x-msvideo',
  ];
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Unsupported file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${maxSizeMB}MB`);
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(query: any): {
  includeContentAnalysis?: boolean;
  includeViralFactors?: boolean;
  maxComments?: number;
  deepAnalysis?: boolean;
  skipCache?: boolean;
} {
  const params: any = {};
  
  // Boolean parameters
  const booleanParams = ['includeContentAnalysis', 'includeViralFactors', 'deepAnalysis', 'skipCache'];
  for (const param of booleanParams) {
    if (query[param] !== undefined) {
      params[param] = query[param] === 'true' || query[param] === '1';
    }
  }
  
  // Numeric parameters
  if (query.maxComments !== undefined) {
    const maxComments = parseInt(query.maxComments);
    if (isNaN(maxComments) || maxComments < 0 || maxComments > 100) {
      throw new Error('maxComments must be a number between 0 and 100');
    }
    params.maxComments = maxComments;
  }
  
  return params;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Remove potentially dangerous characters
  const sanitized = input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
  
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate and parse JSON
 */
export function validateJSON(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(
  clientId: string,
  requests: Map<string, number[]>,
  windowMs: number,
  maxRequests: number
): boolean {
  const now = Date.now();
  const clientRequests = requests.get(clientId) || [];
  
  // Remove old requests outside the window
  const validRequests = clientRequests.filter(timestamp => 
    now - timestamp < windowMs
  );
  
  // Check if limit exceeded
  if (validRequests.length >= maxRequests) {
    return false;
  }
  
  // Add current request
  validRequests.push(now);
  requests.set(clientId, validRequests);
  
  return true;
}

/**
 * Input sanitization for search queries
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  return query
    .trim()
    .replace(/[^\w\s\-_.]/g, '') // Only allow alphanumeric, spaces, hyphens, underscores, dots
    .substring(0, 100); // Limit length
}