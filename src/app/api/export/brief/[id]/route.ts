import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors/withErrorHandling';
import { ApiProblems as Problems } from '@/lib/errors/problem';
import { generateEvidencePack, type EvidencePack } from '@/lib/schemas/evidence_pack.zod';
import { redactEvidence, loadRedactionRules } from '@/lib/evidence/redact';
import { evidenceDigest, auditRecord, createExportHeaders, logAuditEntry, validateETag } from '@/lib/evidence/audit';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const paramsSchema = z.object({
  id: z.string().regex(/^[A-Z0-9]{8}$/),
});

// Simple brief export function compatible with zod EvidencePack
function generateSimpleBriefExport(vdpMin: any, scenes: any[], evidencePack: EvidencePack) {
  return {
    digestId: vdpMin.digestId,
    title: `Snap3 Brief - ${vdpMin.category}`,
    scenes,
    evidencePack,
    exportedAt: new Date().toISOString(),
  };
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Check for streaming mode
  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  const isStreaming = format === 'stream';
  // Validate ID format
  const resolvedParams = await params;
  const validation = paramsSchema.safeParse(resolvedParams);
  if (!validation.success) {
    return Problems.badRequest('Invalid digest ID format');
  }
  
  const { id } = validation.data;
  
  // Mock data retrieval (replace with actual DB/storage call)
  const vdpData = await fetchVDPData(id);
  if (!vdpData) {
    return Problems.notFound(`Export not found for ID: ${id}`);
  }
  
  // Check rate limits (test mode)
  const rateLimitExceeded = request.headers.get('X-Rate-Limit-Test') === 'true';
  if (rateLimitExceeded) {
    return Problems.tooManyRequests('Export rate limit exceeded', 60);
  }
  
  
  try {
    // Load redaction rules
    const redactConfigPath = path.join(process.cwd(), 'config', 'evidence.redact.json');
    let redactionRules: any[] = [];
    
    try {
      const configData = fs.readFileSync(redactConfigPath, 'utf-8');
      redactionRules = loadRedactionRules(JSON.parse(configData));
    } catch (error) {
      console.warn('Could not load redaction config, using default rules:', error);
      // Fallback to basic redaction rules
      redactionRules = loadRedactionRules([
        '/overall_analysis',
        '/asr_transcript', 
        '/ocr_text',
        '/product_mentions',
        '/internal/*',
        '/debug/*'
      ]);
    }

    // Apply redaction to VDP data BEFORE processing
    const redactionResult = redactEvidence(vdpData, redactionRules);
    const redactedVDP = redactionResult.data;
    
    // Generate evidence pack from redacted data
    const evidencePack = generateEvidencePack(redactedVDP);
    
    // Generate VDP_MIN
    const vdpMin = {
      digestId: id,
      category: redactedVDP.metadata?.hashtags?.[0] || 'general',
      hookSec: 3.0,
      tempoBucket: 'medium',
      source: {
        embedEligible: true,
        platform: redactedVDP.platform_metadata?.platform || 'unknown',
      },
    };
    
    // Mock scenes (replace with actual textboard generation)
    const scenes = [
      {
        role: 'hook' as const,
        durationSec: 3,
        visual: 'Opening scene',
        audio: 'Upbeat music',
      },
      {
        role: 'development' as const,
        durationSec: 3,
        visual: 'Main content',
        audio: 'Narration',
      },
      {
        role: 'climax' as const,
        durationSec: 2,
        visual: 'Call to action',
        audio: 'Crescendo',
      },
    ];
    
    const briefExport = generateSimpleBriefExport(vdpMin, scenes, evidencePack);
    
    // Add title if not present (exclude timestamp for consistent ETag)
    const exportDataBase = {
      ...briefExport,
      title: `Export ${id}`,
    };
    
    // Generate audit digest WITHOUT timestamp for consistent ETag
    const digest = evidenceDigest(exportDataBase);
    
    // Add timestamp to final export
    const exportData = {
      ...exportDataBase,
      exportedAt: new Date().toISOString(),
    };
    const headers = createExportHeaders(digest, { 
      streaming: isStreaming,
      maxAge: isStreaming ? undefined : 3600,
      id: id // Pass ID for ETag generation
    });
    
    // Check ETag validation for non-streaming requests
    const clientETag = request.headers.get('If-None-Match');
    if (!isStreaming && clientETag && validateETag(clientETag, digest, id)) {
      const notModifiedRes = new NextResponse(null, { status: 304 });
      notModifiedRes.headers.set('ETag', headers['ETag']);
      notModifiedRes.headers.set('Cache-Control', headers['Cache-Control']);
      return notModifiedRes;
    }
    
    // Create audit record
    const auditContext = {
      route: '/api/export/brief/[id]',
      exporter: 'system',
      requestId: request.headers.get('X-Request-ID') || undefined,
      clientIp: request.headers.get('X-Real-IP') || request.headers.get('X-Forwarded-For') || undefined,
      userAgent: request.headers.get('User-Agent') || undefined,
      format: isStreaming ? 'stream' : 'json',
      streaming: isStreaming,
      cacheStatus: (clientETag ? 'miss' : 'bypass') as 'hit' | 'miss' | 'bypass',
      redaction: {
        rulesApplied: redactionRules.length,
        fieldsRedacted: redactionResult.redactedCount,
        originalSize: redactionResult.originalSize,
      },
    };
    
    const auditEntry = auditRecord(exportData, auditContext);
    logAuditEntry(auditEntry);
    
    // Handle streaming mode
    if (isStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Send chunks of evidence pack data
          controller.enqueue(encoder.encode('{"evidencePack":{'));
          
          // Chunk 1: Basic info
          controller.enqueue(encoder.encode(`"digestId":${JSON.stringify(evidencePack.digestId)}`));
          controller.enqueue(encoder.encode(`,"trustScore":${JSON.stringify(evidencePack.trustScore)}`));
          
          // Simulate async processing
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Chunk 2: Evidence chips
          controller.enqueue(encoder.encode(',"evidenceChips":'));
          controller.enqueue(encoder.encode(JSON.stringify(evidencePack.evidenceChips)));
          
          // Chunk 3: Detection flags
          controller.enqueue(encoder.encode(',"synthIdDetected":'));
          controller.enqueue(encoder.encode(JSON.stringify(evidencePack.synthIdDetected)));
          
          // Close the JSON properly
          controller.enqueue(encoder.encode('}}'));
          controller.close();
        },
      });
      
      const streamRes = new NextResponse(stream);
      Object.entries(headers).forEach(([key, value]) => {
        streamRes.headers.set(key, value);
      });
      return streamRes;
    }
    
    // Normal JSON response
    const res = NextResponse.json(exportData);
    Object.entries(headers).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
    return res;
  } catch (error) {
    console.error('Brief export error:', error);
    return Problems.internalServerError('Failed to generate brief export');
  }
});

// Mock functions - replace with actual implementations
async function fetchVDPData(id: string): Promise<any | null> {
  // Simulate fetching VDP data
  if (id === 'C0008888' || id === 'C0008889') {
    return {
      content_id: id,
      metadata: {
        platform: 'Instagram',
        video_origin: 'Real-Footage',
        view_count: 5234567,
        like_count: 234567,
        hashtags: ['CarGadgets'],
        source_url: 'https://instagram.com/p/C000888',
      },
      overall_analysis: {
        confidence: { overall: 0.95 },
        audience_reaction: {
          overall_sentiment: 'Highly Positive',
        },
      },
    };
  }
  if (id === 'C0008889') {
    return {
      content_id: id,
      metadata: {
        platform: 'TikTok',
        video_origin: 'AI-Generated',
        view_count: 12345678,
        like_count: 1234567,
        hashtags: ['Tech'],
      },
      overall_analysis: {
        confidence: { overall: 0.88 },
        audience_reaction: {
          overall_sentiment: 'Curious and Engaged',
        },
      },
    };
  }
  if (id.match(/^[A-Z0-9]{8}$/)) {
    // Valid format but not found
    return null;
  }
  return null;
}

async function checkRateLimit(request: NextRequest): Promise<boolean> {
  // Implement actual rate limiting
  return false;
}