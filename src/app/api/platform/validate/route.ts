import { NextRequest, NextResponse } from 'next/server';

interface ValidationRequest {
  platform: string;
  url: string;
}

interface ValidationResponse {
  isValid: boolean;
  message: string;
  platform: string;
  suggestions?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { platform, url }: ValidationRequest = await request.json();

    if (!platform || !url) {
      return NextResponse.json(
        { error: 'Platform and URL are required' },
        { status: 400 }
      );
    }

    const validationResult = await validatePlatformUrl(platform, url);

    return NextResponse.json(validationResult);

  } catch (error) {
    console.error('Platform validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}

async function validatePlatformUrl(platform: string, url: string): Promise<ValidationResponse> {
  // 플랫폼별 URL 패턴 검증
  const patterns = {
    youtube: {
      pattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
      message: 'YouTube URL이 유효합니다.',
      suggestions: [
        'https://www.youtube.com/watch?v=VIDEO_ID',
        'https://youtu.be/VIDEO_ID'
      ]
    },
    instagram: {
      pattern: /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/.+/,
      message: 'Instagram URL이 유효합니다.',
      suggestions: [
        'https://www.instagram.com/p/POST_ID/',
        'https://www.instagram.com/reel/REEL_ID/'
      ]
    },
    tiktok: {
      pattern: /^(https?:\/\/)?(www\.)?(tiktok\.com|vm\.tiktok\.com)\/.+/,
      message: 'TikTok URL이 유효합니다.',
      suggestions: [
        'https://www.tiktok.com/@username/video/VIDEO_ID',
        'https://vm.tiktok.com/VIDEO_ID/'
      ]
    }
  };

  const config = patterns[platform as keyof typeof patterns];
  
  if (!config) {
    return {
      isValid: false,
      message: '지원하지 않는 플랫폼입니다.',
      platform,
      suggestions: ['youtube', 'instagram', 'tiktok']
    };
  }

  const isValid = config.pattern.test(url);

  return {
    isValid,
    message: isValid ? config.message : '유효하지 않은 URL 형식입니다.',
    platform,
    suggestions: isValid ? undefined : config.suggestions
  };
}
