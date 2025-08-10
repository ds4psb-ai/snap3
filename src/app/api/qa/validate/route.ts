import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const QAValidationSchema = z.object({
  previewUrl: z.string().url(),
  duration: z.number(),
  aspectRatio: z.string(),
  quality: z.string(),
  hooks: z.array(z.object({
    name: z.string(),
    duration: z.number(),
  })),
  safezones: z.array(z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  })),
  fps: z.number(),
  bitrate: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = QAValidationSchema.parse(body);
    
    // QA Lint Rules
    const violations = [];
    
    // Hook ≤3s validation
    const slowHooks = validatedData.hooks.filter(hook => hook.duration > 3);
    if (slowHooks.length > 0) {
      violations.push({
        rule: 'HOOK_DURATION',
        message: 'Hook >3s detected',
        details: slowHooks.map(h => `${h.name}: ${h.duration}s`),
      });
    }
    
    // Duration = 8s validation
    if (validatedData.duration !== 8) {
      violations.push({
        rule: 'DURATION',
        message: 'Duration must be exactly 8 seconds',
        details: `Current: ${validatedData.duration}s`,
      });
    }
    
    // Aspect ratio = 16:9 validation
    if (validatedData.aspectRatio !== '16:9') {
      violations.push({
        rule: 'ASPECT_RATIO',
        message: 'Aspect ratio must be 16:9',
        details: `Current: ${validatedData.aspectRatio}`,
      });
    }
    
    // Quality validation
    if (!['720p', '1080p'].includes(validatedData.quality)) {
      violations.push({
        rule: 'QUALITY',
        message: 'Quality must be 720p or 1080p',
        details: `Current: ${validatedData.quality}`,
      });
    }
    
    // FPS validation
    if (validatedData.fps < 24 || validatedData.fps > 60) {
      violations.push({
        rule: 'FPS',
        message: 'FPS must be between 24-60',
        details: `Current: ${validatedData.fps}fps`,
      });
    }
    
    // Bitrate validation
    if (validatedData.bitrate < 1000000) { // 1Mbps minimum
      violations.push({
        rule: 'BITRATE',
        message: 'Bitrate too low',
        details: `Current: ${validatedData.bitrate}bps`,
      });
    }
    
    if (violations.length > 0) {
      return NextResponse.json(
        {
          error: 'QA_RULE_VIOLATION',
          message: 'QA 규칙 위반. Hook >3s 또는 Safezones 위반.',
          violations,
          status: 'failed',
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      status: 'passed',
      message: 'QA validation passed',
      score: 100,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid QA validation data' },
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

