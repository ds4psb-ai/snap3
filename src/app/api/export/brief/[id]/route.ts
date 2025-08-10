import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors/withErrorHandling';
import { Problems } from '@/lib/errors/problem';
import { generateBriefExport, extractEvidencePack } from '@/lib/exports/brief';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().regex(/^[A-Z0-9]{8}$/),
});

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // Validate ID format
  const validation = paramsSchema.safeParse(params);
  if (!validation.success) {
    return Problems.badRequest('Invalid digest ID format');
  }
  
  const { id } = validation.data;
  
  // Mock data retrieval (replace with actual DB/storage call)
  const vdpData = await fetchVDPData(id);
  if (!vdpData) {
    return Problems.notFound(`Export not found for ID: ${id}`);
  }
  
  // Check rate limits
  const rateLimitExceeded = await checkRateLimit(request);
  if (rateLimitExceeded) {
    return Problems.tooManyRequests('Export rate limit exceeded', 60);
  }
  
  try {
    // Extract evidence (masks VDP_FULL)
    const evidencePack = extractEvidencePack(vdpData);
    
    // Generate VDP_MIN
    const vdpMin = {
      digestId: id,
      category: vdpData.metadata?.hashtags?.[0] || 'general',
      hookSec: 3.0,
      tempoBucket: 'medium',
      source: {
        embedEligible: true,
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
    
    const briefExport = generateBriefExport(vdpMin, scenes, evidencePack);
    
    return NextResponse.json(briefExport, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Brief export error:', error);
    return Problems.internalServerError('Failed to generate brief export');
  }
});

// Mock functions - replace with actual implementations
async function fetchVDPData(id: string): Promise<any | null> {
  // Simulate fetching VDP data
  if (id === 'C0008888') {
    return {
      content_id: id,
      metadata: {
        platform: 'Instagram',
        video_origin: 'Real-Footage',
        view_count: 5000000,
        hashtags: ['CarGadgets'],
      },
      overall_analysis: {
        confidence: { overall: 0.95 },
      },
    };
  }
  return null;
}

async function checkRateLimit(request: NextRequest): Promise<boolean> {
  // Implement actual rate limiting
  return false;
}