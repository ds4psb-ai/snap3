import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiProblems } from '@/lib/errors/problem';

// Import the existing URL normalizer
import { normalizeSocialUrl } from '@/../server/utils/url-normalizer.js';

// URL normalization schema
const UrlNormalizeSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

// Generate correlation ID for request tracing
function generateCorrelationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `normalize_${timestamp}_${random}`;
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = UrlNormalizeSchema.parse(body);
    const url = validatedData.url.trim();
    
    // Use the existing URL normalizer
    const result = await normalizeSocialUrl(url);
    
    // Generate content_key from platform and id
    const content_key = `${result.platform}:${result.id}`;
    
    console.log(`URL normalized successfully: ${url} → ${result.platform}:${result.id}`, { correlationId });
    
    return NextResponse.json({
      platform: result.platform,
      content_id: result.id,
      content_key,
      original_url: result.originalUrl,
      normalized_url: result.canonicalUrl,
      expanded_url: result.expandedUrl,
      correlation_id: correlationId,
      message: 'URL 정규화 완료',
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const violations = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return ApiProblems.validation(violations);
    }
    
    console.error('URL normalize API error:', error, { correlationId });
    
    // Handle normalization errors with specific messages
    const errorMessage = error instanceof Error ? error.message : 'URL 정규화 중 오류가 발생했습니다';
    
    return ApiProblems.validation([
      { 
        field: 'url', 
        message: errorMessage, 
        code: 'CONTENT_ID_EXTRACTION_FAILED',
        correlation_id: correlationId 
      }
    ]);
  }
}

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    // Extract URL from query parameters for GET requests
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return ApiProblems.validation([
        { 
          field: 'url', 
          message: 'URL parameter is required', 
          code: 'URL_REQUIRED' 
        }
      ]);
    }

    // Validate input
    const validatedData = UrlNormalizeSchema.parse({ url });
    const normalizedUrl = validatedData.url.trim();
    
    // Use the existing URL normalizer
    const result = await normalizeSocialUrl(normalizedUrl);
    
    // Generate content_key from platform and id
    const content_key = `${result.platform}:${result.id}`;
    
    console.log(`URL normalized successfully (GET): ${normalizedUrl} → ${result.platform}:${result.id}`, { correlationId });
    
    return NextResponse.json({
      platform: result.platform,
      content_id: result.id,
      content_key,
      original_url: result.originalUrl,
      normalized_url: result.canonicalUrl,
      expanded_url: result.expandedUrl,
      correlation_id: correlationId,
      message: 'URL 정규화 완료',
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const violations = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return ApiProblems.validation(violations);
    }
    
    console.error('URL normalize API error (GET):', error, { correlationId });
    
    // Handle normalization errors with specific messages
    const errorMessage = error instanceof Error ? error.message : 'URL 정규화 중 오류가 발생했습니다';
    
    return ApiProblems.validation([
      { 
        field: 'url', 
        message: errorMessage, 
        code: 'CONTENT_ID_EXTRACTION_FAILED',
        correlation_id: correlationId 
      }
    ]);
  }
}

export async function PUT() {
  return ApiProblems.methodNotAllowed('PUT', ['POST']);
}

export async function DELETE() {
  return ApiProblems.methodNotAllowed('DELETE', ['POST']);
}