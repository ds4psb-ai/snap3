import { NextRequest, NextResponse } from 'next/server';

interface ExtractRequest {
  url: string;
  platform: string;
}

interface SocialMetadata {
  content_id: string;
  views: number;
  likes: number;
  comments: number;
  top_comments: string[];
  extraction_time: string;
  platform: string;
  author?: string;
  upload_date?: string;
  hashtags?: string[];
}

interface ExtractResponse {
  success: boolean;
  data?: SocialMetadata;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ExtractResponse>> {
  try {
    const { url, platform }: ExtractRequest = await request.json();

    if (!url || !platform) {
      return NextResponse.json({
        success: false,
        error: 'URL과 플랫폼이 필요합니다'
      }, { status: 400 });
    }

    // URL 유효성 검사
    if (!isValidUrl(url)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 URL입니다'
      }, { status: 400 });
    }

    // 플랫폼별 메타데이터 추출
    const metadata = await extractMetadataByPlatform(url, platform);

    return NextResponse.json({
      success: true,
      data: metadata
    });

  } catch (error) {
    console.error('Metadata extraction error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '메타데이터 추출 중 오류가 발생했습니다'
    }, { status: 500 });
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function extractMetadataByPlatform(url: string, platform: string): Promise<SocialMetadata> {
  // 실제로는 각 플랫폼별 스크래핑 로직을 구현
  // 현재는 샘플 데이터로 시뮬레이션
  
  const baseMetadata: SocialMetadata = {
    content_id: generateContentId(url),
    views: Math.floor(Math.random() * 100000) + 1000,
    likes: Math.floor(Math.random() * 10000) + 100,
    comments: Math.floor(Math.random() * 1000) + 10,
    top_comments: [
      '정말 멋진 콘텐츠네요! 👍',
      '이런 아이디어가 있었군요 😊',
      '다음 영상도 기대됩니다!'
    ],
    extraction_time: new Date().toISOString(),
    platform: platform,
    author: generateAuthor(platform),
    upload_date: generateUploadDate(),
    hashtags: generateHashtags(platform)
  };

  // 플랫폼별 특성 적용
  switch (platform) {
    case 'instagram':
      return {
        ...baseMetadata,
        views: 0, // Instagram은 조회수 공개하지 않음
        likes: Math.floor(Math.random() * 5000) + 500,
        comments: Math.floor(Math.random() * 500) + 20
      };
    
    case 'tiktok':
      return {
        ...baseMetadata,
        views: Math.floor(Math.random() * 500000) + 5000,
        likes: Math.floor(Math.random() * 20000) + 1000,
        comments: Math.floor(Math.random() * 2000) + 50
      };
    
    case 'youtube':
      return {
        ...baseMetadata,
        views: Math.floor(Math.random() * 1000000) + 10000,
        likes: Math.floor(Math.random() * 50000) + 2000,
        comments: Math.floor(Math.random() * 5000) + 100
      };
    
    default:
      return baseMetadata;
  }
}

function generateContentId(url: string): string {
  // URL에서 고유 ID 추출
  const urlParts = url.split('/');
  const lastPart = urlParts[urlParts.length - 1];
  
  if (lastPart && lastPart.length > 0) {
    return lastPart.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  }
  
  // 폴백: 타임스탬프 기반 ID
  return Date.now().toString(36).toUpperCase();
}

function generateAuthor(platform: string): string {
  const authors = {
    instagram: ['creative_artist', 'lifestyle_blogger', 'food_lover'],
    tiktok: ['dance_creator', 'comedy_king', 'trend_setter'],
    youtube: ['tech_reviewer', 'gaming_pro', 'educational_channel']
  };
  
  const platformAuthors = authors[platform as keyof typeof authors] || ['content_creator'];
  return platformAuthors[Math.floor(Math.random() * platformAuthors.length)];
}

function generateUploadDate(): string {
  // 최근 30일 내 랜덤 날짜
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function generateHashtags(platform: string): string[] {
  const hashtagSets = {
    instagram: ['#lifestyle', '#photography', '#inspiration', '#creative'],
    tiktok: ['#fyp', '#viral', '#trending', '#dance'],
    youtube: ['#tech', '#review', '#tutorial', '#gaming']
  };
  
  const platformHashtags = hashtagSets[platform as keyof typeof hashtagSets] || ['#content'];
  return platformHashtags.slice(0, Math.floor(Math.random() * 3) + 2);
}