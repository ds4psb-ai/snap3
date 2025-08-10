import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors/withErrorHandling';
import { Problems } from '@/lib/errors/problem';
import { generateJSONExport } from '@/lib/exports/json';
import { extractEvidencePack } from '@/lib/exports/brief';
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
  
  // Mock data retrieval
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
    
    // Generate VideoGen IR
    const videoGenIR = {
      durationSec: 8,
      aspect: '16:9' as const,
      resolution: '1080p' as const,
      cuts: [
        { timestamp: 0, type: 'cut' },
        { timestamp: 3, type: 'cut' },
        { timestamp: 6, type: 'cut' },
      ],
    };
    
    // Generate Veo3 Prompt
    const veo3Prompt = {
      duration: 8,
      aspect: '16:9' as const,
      resolution: '1080p' as const,
      shots: [
        {
          duration: 3,
          description: 'Opening hook scene',
          camera: 'static',
        },
        {
          duration: 3,
          description: 'Main content',
          camera: 'slow_pan',
        },
        {
          duration: 2,
          description: 'Closing with CTA',
          camera: 'static',
        },
      ],
    };
    
    const jsonExport = generateJSONExport(id, videoGenIR, veo3Prompt, evidencePack);
    
    const response = NextResponse.json(jsonExport);
    response.headers.set('Cache-Control', 'private, max-age=3600');
    return response;
  } catch (error) {
    console.error('JSON export error:', error);
    return Problems.internalServerError('Failed to generate JSON export');
  }
});

// Mock functions - same as brief route
async function fetchVDPData(id: string): Promise<any | null> {
  if (id === 'C0008888') {
    return {
      content_id: id,
      metadata: {
        platform: 'Instagram',
        video_origin: 'Real-Footage',
        view_count: 5000000,
      },
      overall_analysis: {
        confidence: { overall: 0.95 },
      },
    };
  }
  return null;
}

async function checkRateLimit(request: NextRequest): Promise<boolean> {
  return false;
}