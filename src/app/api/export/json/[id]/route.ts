import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors/withErrorHandling';
import { ApiProblems as Problems, buildProblemJSON } from '@/lib/errors/problem';
import { ErrorCode } from '@/lib/errors/codes';
import { generateEvidencePack } from '@/lib/schemas/evidence_pack.zod';
import { redactEvidence, loadRedactionRules } from '@/lib/evidence/redact';
import { evidenceDigest, auditRecord, createExportHeaders, logAuditEntry, validateETag } from '@/lib/evidence/audit';
import { z } from 'zod';
import { getSignedReadUrl } from '@/lib/storage/provider';
import fs from 'fs';
import path from 'path';

const paramsSchema = z.object({
  id: z.string().regex(/^[A-Z0-9]{8}$/),
});

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Validate ID format
  const resolvedParams = await params;
  const validation = paramsSchema.safeParse(resolvedParams);
  if (!validation.success) {
    return Problems.badRequest('Invalid digest ID format');
  }
  
  const { id } = validation.data;
  
  // Check for vertical format request
  const aspectRatio = request.headers.get('X-Aspect-Ratio');
  if (aspectRatio === '9:16') {
    // Return crop-proxy metadata only
    return Problems.unsupportedAspectRatio('9:16', {
      sourceAspect: '16:9',
      targetAspect: '9:16',
      cropRegion: { 
        x: 0.34375,  // Center crop: (1 - 0.3125) / 2
        y: 0,
        width: 0.3125,  // 9:16 width in 16:9 frame
        height: 1,
      },
    });
  }
  
  // Validate embed eligibility
  const embedUrl = request.headers.get('X-Embed-URL');
  if (embedUrl && !isOfficialEmbed(embedUrl)) {
    return Problems.embedDenied(embedUrl, 'Only YouTube and Vimeo embeds are allowed');
  }
  
  // Fetch VDP data
  const vdpData = await fetchVDPData(id);
  if (!vdpData) {
    return Problems.notFound(`Export not found for ID: ${id}`);
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
    
    // Generate evidence pack from redacted data (masks VDP_FULL)
    const evidencePack = generateEvidencePack(redactedVDP);
    
    // Create JSON export with VideoGenIR and Veo3Prompt
    const jsonExportBase = {
      digestId: id,
      videoGenIR: {
        durationSec: 8,
        aspect: '16:9' as const,
        resolution: '720p' as const,
        cuts: [
          {
            timestamp: 0,
            type: 'hard',
            transition: 'cut',
          },
          {
            timestamp: 3,
            type: 'soft',
            transition: 'dissolve',
          },
        ],
      },
      veo3Prompt: {
        durationSec: 8,
        duration: 8,  // Add for backward compatibility 
        aspect: '16:9' as const,
        resolution: '720p' as const,
        shots: [
          {
            duration: 3,
            description: 'Opening hook shot',
            cameraMovement: 'static',
          },
          {
            duration: 3,
            description: 'Development shot',
            cameraMovement: 'pan',
          },
          {
            duration: 2,
            description: 'Closing shot',
            cameraMovement: 'zoom',
          },
        ],
      },
      evidencePack,
    };
    
    // Add timestamp to final export
    const jsonExport = {
      ...jsonExportBase,
      exportedAt: new Date().toISOString(),
    };
    
    // For ETag: Calculate digest WITHOUT timestamp for deterministic caching
    const etagDigest = evidenceDigest(jsonExportBase);
    
    // For X-Export-SHA256: Calculate digest on actual response content
    const contentDigest = evidenceDigest(jsonExport);
    
    const headers = createExportHeaders(contentDigest, { 
      streaming: false,
      maxAge: 3600,
      id: id, // Pass ID for ETag generation
      etagDigest: etagDigest // Deterministic digest for ETag
    });
    
    // Check ETag validation for caching
    const clientETag = request.headers.get('If-None-Match');
    if (clientETag && validateETag(clientETag, etagDigest, id)) {
      const notModifiedRes = new NextResponse(null, { status: 304 });
      notModifiedRes.headers.set('ETag', headers['ETag']);
      notModifiedRes.headers.set('Cache-Control', headers['Cache-Control']);
      return notModifiedRes;
    }
    
    // Create audit record
    const auditContext = {
      route: '/api/export/json/[id]',
      exporter: 'system',
      requestId: request.headers.get('X-Request-ID') || undefined,
      clientIp: request.headers.get('X-Real-IP') || request.headers.get('X-Forwarded-For') || undefined,
      userAgent: request.headers.get('User-Agent') || undefined,
      format: 'json',
      streaming: false,
      cacheStatus: (clientETag ? 'miss' : 'bypass') as 'hit' | 'miss' | 'bypass',
      redaction: {
        rulesApplied: redactionRules.length,
        fieldsRedacted: redactionResult.redactedCount,
        originalSize: redactionResult.originalSize,
      },
    };
    
    const auditEntry = auditRecord(jsonExport, auditContext);
    logAuditEntry(auditEntry);
    
    // Generate signed URL for export artifact if exists
    const exportArtifactUrl = await getExportArtifactUrl(id);
    
    const res = NextResponse.json(jsonExport);
    
    // Set headers using the proper pattern
    Object.entries(headers).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
    
    // Add download hint if artifact exists
    if (exportArtifactUrl) {
      res.headers.set('Content-Disposition', `attachment; filename="export-${id}.json"`);
      res.headers.set('X-Export-Artifact-URL', exportArtifactUrl);
    }
    return res;
  } catch (error) {
    console.error('JSON export error:', error);
    return Problems.internalServerError('Failed to generate JSON export');
  }
});

function isOfficialEmbed(url: string): boolean {
  const official = [
    /^https:\/\/(www\.)?youtube\.com\/embed\//,
    /^https:\/\/player\.vimeo\.com\/video\//,
  ];
  return official.some(pattern => pattern.test(url));
}

// Mock function - replace with actual implementation
async function fetchVDPData(id: string): Promise<any | null> {
  // Simulate fetching VDP data
  if (id === 'C0008888') {
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

// Get signed URL for export artifact from storage
async function getExportArtifactUrl(id: string): Promise<string | null> {
  try {
    // Mock implementation - replace with actual storage provider
    return null; // Will be implemented with actual storage provider
  } catch (error) {
    console.error('Failed to get export artifact URL:', error);
    return null;
  }
}


