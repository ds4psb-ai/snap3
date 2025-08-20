import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 요청 스키마 검증
const extractRequestSchema = z.object({
  url: z.string().url('유효한 URL을 입력해주세요'),
  platform: z.enum(['instagram', 'tiktok'], {
    errorMap: () => ({ message: 'platform은 instagram 또는 tiktok이어야 합니다' })
  })
});

// Instagram 메타데이터 추출 함수
async function extractInstagramMetadata(url: string) {
  try {
    console.log('🔍 Instagram 메타데이터 추출 시작:', url);
    
    // 1단계: 기본 웹스크래핑
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // 2단계: JSON-LD 데이터 추출
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.interactionStatistic) {
          return {
            view_count: jsonLd.interactionStatistic.find((stat: any) => stat.interactionType === 'https://schema.org/WatchAction')?.userInteractionCount || 0,
            like_count: jsonLd.interactionStatistic.find((stat: any) => stat.interactionType === 'https://schema.org/LikeAction')?.userInteractionCount || 0,
            comment_count: jsonLd.interactionStatistic.find((stat: any) => stat.interactionType === 'https://schema.org/CommentAction')?.userInteractionCount || 0,
            author: jsonLd.author?.name || 'Unknown',
            upload_date: jsonLd.uploadDate || new Date().toISOString(),
            hashtags: jsonLd.keywords?.split(',').map((tag: string) => tag.trim()) || [],
            source: 'json_ld'
          };
        }
      } catch (e) {
        console.log('JSON-LD 파싱 실패, 다음 단계 진행');
      }
    }
    
    // 3단계: window._sharedData 추출
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});/s);
    if (sharedDataMatch) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        const media = sharedData.entry_data.PostPage?.[0]?.graphql?.shortcode_media;
        if (media) {
          return {
            view_count: media.video_view_count || 0,
            like_count: media.edge_media_preview_like?.count || 0,
            comment_count: media.edge_media_to_parent_comment?.count || 0,
            author: media.owner?.username || 'Unknown',
            upload_date: new Date(media.taken_at_timestamp * 1000).toISOString(),
            hashtags: media.edge_media_to_caption?.edges?.[0]?.node?.text?.match(/#\w+/g) || [],
            source: 'shared_data'
          };
        }
      } catch (e) {
        console.log('window._sharedData 파싱 실패, 다음 단계 진행');
      }
    }
    
    // 4단계: 인라인 스크립트 데이터 추출
    const scriptMatches = html.match(/<script[^>]*>([^<]+)<\/script>/g);
    for (const script of scriptMatches || []) {
      const dataMatch = script.match(/"video_view_count":\s*(\d+)/);
      if (dataMatch) {
        const viewCount = parseInt(dataMatch[1]);
        const likeMatch = script.match(/"like_count":\s*(\d+)/);
        const commentMatch = script.match(/"comment_count":\s*(\d+)/);
        const authorMatch = script.match(/"username":\s*"([^"]+)"/);
        
        return {
          view_count: viewCount,
          like_count: likeMatch ? parseInt(likeMatch[1]) : 0,
          comment_count: commentMatch ? parseInt(commentMatch[1]) : 0,
          author: authorMatch ? authorMatch[1] : 'Unknown',
          upload_date: new Date().toISOString(),
          hashtags: [],
          source: 'inline_script'
        };
      }
    }
    
    // 5단계: HTML 파싱으로 기본 정보 추출
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
    
    return {
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      author: 'Unknown',
      upload_date: new Date().toISOString(),
      hashtags: descriptionMatch ? descriptionMatch[1].match(/#\w+/g) || [] : [],
      source: 'html_parsing'
    };
    
  } catch (error) {
    console.error('Instagram 추출 오류:', error);
    throw new Error(`Instagram 메타데이터 추출 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// TikTok 메타데이터 추출 함수
async function extractTikTokMetadata(url: string) {
  try {
    console.log('🔍 TikTok 메타데이터 추출 시작:', url);
    
    // 1단계: 기본 웹스크래핑
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // 2단계: webapp.video-detail 데이터 추출
    const webappMatch = html.match(/window\.webapp_video_detail\s*=\s*({.*?});/s);
    if (webappMatch) {
      try {
        const webappData = JSON.parse(webappMatch[1]);
        const videoData = webappData.videoData;
        if (videoData) {
          return {
            view_count: videoData.playCount || 0,
            like_count: videoData.diggCount || 0,
            comment_count: videoData.commentCount || 0,
            share_count: videoData.shareCount || 0,
            author: videoData.author?.nickname || videoData.author?.uniqueId || 'Unknown',
            upload_date: new Date(videoData.createTime * 1000).toISOString(),
            hashtags: videoData.challenges?.map((challenge: any) => `#${challenge.title}`) || [],
            source: 'webapp_video_detail'
          };
        }
      } catch (e) {
        console.log('webapp.video-detail 파싱 실패, 다음 단계 진행');
      }
    }
    
    // 3단계: og:메타태그 추출
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
    const ogDescriptionMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/);
    const ogVideoMatch = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]+)"/);
    
    if (ogTitleMatch || ogDescriptionMatch) {
      return {
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        author: 'Unknown',
        upload_date: new Date().toISOString(),
        hashtags: ogDescriptionMatch ? ogDescriptionMatch[1].match(/#\w+/g) || [] : [],
        video_url: ogVideoMatch ? ogVideoMatch[1] : null,
        source: 'og_meta_tags'
      };
    }
    
    // 4단계: 기본 HTML 파싱
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    
    return {
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      share_count: 0,
      author: 'Unknown',
      upload_date: new Date().toISOString(),
      hashtags: [],
      source: 'html_parsing'
    };
    
  } catch (error) {
    console.error('TikTok 추출 오류:', error);
    throw new Error(`TikTok 메타데이터 추출 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 메인 API 핸들러
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 메타데이터 추출 API 호출됨');
    
    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = extractRequestSchema.parse(body);
    
    const { url, platform } = validatedData;
    
    // 플랫폼별 추출 함수 호출
    let metadata;
    if (platform === 'instagram') {
      metadata = await extractInstagramMetadata(url);
    } else if (platform === 'tiktok') {
      metadata = await extractTikTokMetadata(url);
    } else {
      throw new Error(`지원하지 않는 플랫폼: ${platform}`);
    }
    
    // content_id 추출 (URL에서)
    const contentId = extractContentId(url, platform);
    
    // 응답 데이터 구성
    const responseData = {
      content_id: contentId,
      platform,
      metadata: {
        ...metadata,
        source_url: url,
        extracted_at: new Date().toISOString(),
        extractor: 'cursor_extractor'
      },
      success: true,
      message: `${platform} 메타데이터 추출 완료`
    };
    
    console.log('✅ 메타데이터 추출 성공:', responseData);
    
    return NextResponse.json(responseData, { status: 200 });
    
  } catch (error) {
    console.error('❌ 메타데이터 추출 실패:', error);
    
    // Zod 검증 오류 처리
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '요청 데이터 검증 실패',
        details: error.errors
      }, { status: 400 });
    }
    
    // 일반 오류 처리
    return NextResponse.json({
      success: false,
      error: 'EXTRACTION_ERROR',
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// content_id 추출 함수
function extractContentId(url: string, platform: string): string {
  try {
    const urlObj = new URL(url);
    
    if (platform === 'instagram') {
      // Instagram: /p/{shortcode}/ 또는 /reel/{shortcode}/
      const pathMatch = urlObj.pathname.match(/\/(?:p|reel)\/([^\/]+)/);
      return pathMatch ? pathMatch[1] : `ig_${Date.now()}`;
    } else if (platform === 'tiktok') {
      // TikTok: /@{username}/video/{id} 또는 /v/{id}
      const pathMatch = urlObj.pathname.match(/\/(?:video|v)\/([^\/\?]+)/);
      return pathMatch ? pathMatch[1] : `tt_${Date.now()}`;
    }
    
    return `${platform}_${Date.now()}`;
  } catch (error) {
    console.error('content_id 추출 실패:', error);
    return `${platform}_${Date.now()}`;
  }
}

// GET 메서드 (헬스체크용)
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'social-metadata-extractor',
    version: '1.0.0',
    supported_platforms: ['instagram', 'tiktok'],
    timestamp: new Date().toISOString()
  });
}