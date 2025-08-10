import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Veo3PromptSchema = z.object({
  prompt: z.string().min(1),
  duration: z.literal(8),
  aspectRatio: z.literal('16:9'),
  quality: z.enum(['720p', '1080p']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = Veo3PromptSchema.parse(body);
    
    // Validate constraints
    if (validatedData.duration !== 8) {
      return NextResponse.json(
        { 
          error: 'INVALID_DURATION',
          message: '지속시간이 8초가 아닙니다. 8초로 조정됩니다.',
          fix: 'duration을 8로 설정하세요.'
        },
        { status: 400 }
      );
    }
    
    if (validatedData.aspectRatio !== '16:9') {
      return NextResponse.json(
        { 
          error: 'UNSUPPORTED_AR_FOR_PREVIEW',
          message: '세로 비율은 지원되지 않습니다. 16:9로 변환 후 crop-proxy를 사용하세요.',
          fix: 'aspectRatio를 16:9로 설정하세요.'
        },
        { status: 400 }
      );
    }
    
    // TODO: Implement Veo3 prompt compilation
    return NextResponse.json({
      id: 'veo3-' + Date.now(),
      prompt: validatedData.prompt,
      duration: validatedData.duration,
      aspectRatio: validatedData.aspectRatio,
      quality: validatedData.quality,
      status: 'compiled',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid Veo3 prompt' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}




