import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiProblems } from '@/lib/errors/problem';
import { GCSProvider } from '@/lib/storage/providers/gcs';

// Enhanced schema for multi-platform ingest - Final Standard Payload
const IngestSchema = z.object({
  platform: z.enum(['youtube', 'tiktok', 'instagram']),
  content_id: z.string().min(1, 'content_id is required'),
  content_key: z.string().optional(), // Auto-generated if not provided
  source_url: z.string().url('Invalid URL format').optional(), // Required for YouTube only
  uploaded_gcs_uri: z.string().optional(), // Required for IG/TT
  metadata: z.object({
    video_origin: z.string().default('Real-Footage'),
    original_sound: z.boolean().default(true),
    language: z.string().default('ko'),
  }).optional(),
  processing_options: z.object({
    hook_genome_analysis: z.boolean().optional(),
    audio_fingerprint: z.boolean().optional(),
    brand_detection: z.boolean().optional(),
    force_full_pipeline: z.boolean().optional(),
    use_vertex: z.boolean().optional(),
  }).optional(),
}).refine((data) => {
  // YouTube requires source_url
  if (data.platform === 'youtube' && !data.source_url) {
    return false;
  }
  // IG/TT require uploaded_gcs_uri
  if (['instagram', 'tiktok'].includes(data.platform) && !data.uploaded_gcs_uri) {
    return false;
  }
  return true;
}, {
  message: "YouTube requires source_url, Instagram/TikTok require uploaded_gcs_uri",
});

// URL pattern matchers for content_id extraction
const URL_PATTERNS = {
  youtube: [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  ],
  tiktok: [
    /tiktok\.com\/.*\/video\/(\d+)/,
    /vm\.tiktok\.com\/([a-zA-Z0-9]+)/,
  ],
  instagram: [
    /instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/,
  ],
};

// Extract content_id from URL based on platform
function extractContentId(platform: string, url: string): string | null {
  const patterns = URL_PATTERNS[platform as keyof typeof URL_PATTERNS];
  if (!patterns) return null;
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Generate correlation ID for request tracing
function generateCorrelationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

// Platform normalization
function normalizePlatform(platform: string): string {
  const normalized = platform.toLowerCase();
  if (normalized === 'youtube') return 'youtube';
  if (['tiktok', 'tik-tok'].includes(normalized)) return 'tiktok';
  if (['instagram', 'ig'].includes(normalized)) return 'instagram';
  return normalized;
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    const body = await request.json();
    
    // Validate and normalize platform
    if (!body.platform) {
      return ApiProblems.validation([
        { field: 'platform', message: 'Platform is required', code: 'PLATFORM_MISSING' }
      ]);
    }
    
    body.platform = normalizePlatform(body.platform);
    
    // Validate content_id is provided
    if (!body.content_id) {
      return ApiProblems.validation([
        { field: 'content_id', message: 'content_id is required', code: 'CONTENT_ID_MISSING' }
      ]);
    }
    
    const validatedData = IngestSchema.parse(body);
    
    // Generate content_key if not provided
    const content_key = validatedData.content_key || `${validatedData.platform}:${validatedData.content_id}`;
    
    // Merge provided metadata with defaults
    const metadata = {
      video_origin: 'Real-Footage',
      original_sound: true,
      language: 'ko',
      ...validatedData.metadata,
      requested_at: new Date().toISOString(),
      request_source: 'ui_proxy',
      platform_normalized: validatedData.platform,
    };
    
    // Set up processing options - Hook analysis enabled, Evidence OFF for faster processing
    const processing_options = {
      hook_genome_analysis: true,   // Hook analysis enabled by default
      audio_fingerprint: false,     // Evidence OFF: Audio fingerprint disabled  
      brand_detection: false,       // Evidence OFF: Brand detection disabled
      force_full_pipeline: true,    // Full pipeline enabled for all platforms
      ...validatedData.processing_options, // User settings override defaults
    };
    
    // Prepare final ingest request for worker
    const ingestRequest = {
      content_id: validatedData.content_id,
      content_key,
      platform: validatedData.platform,
      correlation_id: correlationId,
      metadata,
      processing_options,
      ...(validatedData.source_url && { source_url: validatedData.source_url }),
      ...(validatedData.uploaded_gcs_uri && { uploaded_gcs_uri: validatedData.uploaded_gcs_uri }),
    };
    
    // Send request to worker queue via GCS
    try {
      // 🚨 CRITICAL: Bucket Policy Enforcement (2025-08-19)
      const ALLOWED_RAW_BUCKET = 'tough-variety-raw-central1';
      const rawBucket = process.env.RAW_BUCKET || ALLOWED_RAW_BUCKET;
      
      // Bucket validation before GCS operation
      if (rawBucket !== ALLOWED_RAW_BUCKET) {
        console.error(`🚨 CRITICAL ERROR: Invalid RAW_BUCKET in Next.js API!`, {
          expected: ALLOWED_RAW_BUCKET,
          actual: rawBucket,
          source: process.env.RAW_BUCKET ? 'Environment Variable' : 'Default',
          correlationId
        });
        return ApiProblems.validation([
          { field: 'bucket', message: 'Invalid bucket configuration', code: 'BUCKET_VALIDATION_FAILED' }
        ]);
      }
      
      console.log(`✅ Next.js API bucket validation passed: ${rawBucket}`, { correlationId });
      const gcsProvider = new GCSProvider(rawBucket);
      
      // Platform-segmented path for optimal worker polling - Final Standard Structure
      const requestPath = `ingest/requests/${validatedData.platform}/${validatedData.content_id}_${Date.now()}.json`;
      
      const success = await gcsProvider.writeFile(requestPath, JSON.stringify(ingestRequest, null, 2));
      
      if (!success) {
        console.error('Failed to write ingest request to GCS', { correlationId, requestPath });
        return ApiProblems.validation([
          { field: 'storage', message: 'Failed to queue ingest request', code: 'STORAGE_WRITE_FAILED' }
        ]);
      }
      
      console.log(`Ingest request queued: ${requestPath}`, { correlationId, content_key });
      
    } catch (error) {
      console.error('GCS write error:', error, { correlationId });
      return ApiProblems.validation([
        { field: 'storage', message: 'Storage service unavailable', code: 'STORAGE_UNAVAILABLE' }
      ]);
    }
    
    return NextResponse.json({
      status: 'accepted',
      correlation_id: correlationId,
      content_id: validatedData.content_id,
      content_key,
      platform: validatedData.platform,
      processing_mode: processing_options.force_full_pipeline ? 'full_pipeline' : 'metadata_staging',
      message: 'Ingest request accepted and queued for processing',
      estimated_processing_time: validatedData.platform === 'youtube' ? '60-120s' : '30-60s',
    }, { status: 202 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const violations = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return ApiProblems.validation(violations);
    }
    
    console.error('Ingest API error:', error, { correlationId });
    return ApiProblems.validation([
      { field: 'request', message: 'Invalid ingest data', correlation_id: correlationId }
    ]);
  }
}

export async function GET() {
  return ApiProblems.methodNotAllowed('GET', ['POST']);
}

export async function PUT() {
  return ApiProblems.methodNotAllowed('PUT', ['POST']);
}

export async function DELETE() {
  return ApiProblems.methodNotAllowed('DELETE', ['POST']);
}














