import { NextRequest, NextResponse } from 'next/server';

interface TikTokMetadata {
  id: string | null;
  title: string | null;
  author: string | null;
  upload_date: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  hashtags: string[];
  top_comments: Array<{
    author: string;
    text: string;
    like_count: number;
  }>;
  thumbnail_url: string | null;
  duration: number | null;
  followers: number | null;
  scraped_data: any;
  source: string;
  error?: string;
}

function extractShortcode(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

function decodeHtmlEntitiesNode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=')
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractHashtags(text: string): string[] {
  if (!text) return [];
  
  const decodedText = decodeHtmlEntitiesNode(text);
  const hashtagRegex = /#[\w가-힣]+/g;
  const hashtags = decodedText.match(hashtagRegex) || [];
  
  return [...new Set(hashtags)]
    .map(tag => tag.slice(1)) // # 제거
    .filter(tag => tag.length > 0 && tag.length <= 50);
}

async function scrapeTikTokPage(url: string): Promise<any> {
  try {
    console.log('TikTok 스크래핑 시작:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      next: { revalidate: 300 } // 5분 캐시
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML 길이:', html.length);
    
    // webapp.video-detail 데이터 추출 (더 정확한 정규식)
    const videoDetailMatch = html.match(/"webapp\.video-detail":\s*({[^}]+})/);
    console.log('videoDetailMatch:', videoDetailMatch ? '찾음' : '없음');
    
    if (!videoDetailMatch) {
      throw new Error('TikTok 비디오 데이터를 찾을 수 없습니다');
    }

    // stats 데이터 추출
    const statsMatch = html.match(/"stats":\s*({[^}]+})/);
    console.log('statsMatch:', statsMatch ? '찾음' : '없음');
    
    // author 데이터 추출
    const authorMatch = html.match(/"author":\s*({[^}]+})/);
    console.log('authorMatch:', authorMatch ? '찾음' : '없음');

    // JSON 파싱 시도
    let videoData: any = {};
    let statsData: any = {};
    let authorData: any = {};

    try {
      // video-detail 데이터 파싱
      const videoDetailStr = videoDetailMatch[1];
      const itemInfoMatch = videoDetailStr.match(/"itemInfo":\s*({[^}]+})/);
      if (itemInfoMatch) {
        const itemStructMatch = itemInfoMatch[1].match(/"itemStruct":\s*({[^}]+})/);
        if (itemStructMatch) {
          // 기본 비디오 정보 추출
          const itemStruct = itemStructMatch[1];
          
          // ID 추출
          const idMatch = itemStruct.match(/"id":\s*"([^"]+)"/);
          if (idMatch) videoData.id = idMatch[1];
          
          // 설명 추출
          const descMatch = itemStruct.match(/"desc":\s*"([^"]*)"/);
          if (descMatch) videoData.desc = descMatch[1];
          
          // 생성 시간 추출
          const createTimeMatch = itemStruct.match(/"createTime":\s*"([^"]+)"/);
          if (createTimeMatch) videoData.createTime = createTimeMatch[1];
          
          // 비디오 정보 추출
          const videoMatch = itemStruct.match(/"video":\s*({[^}]+})/);
          if (videoMatch) {
            const videoInfo = videoMatch[1];
            
            // 썸네일 추출
            const coverMatch = videoInfo.match(/"cover":\s*"([^"]+)"/);
            if (coverMatch) videoData.cover = coverMatch[1].replace(/\\u002F/g, '/');
            
            // 길이 추출
            const durationMatch = videoInfo.match(/"duration":\s*(\d+)/);
            if (durationMatch) videoData.duration = parseInt(durationMatch[1]);
            
            // 해상도 추출
            const widthMatch = videoInfo.match(/"width":\s*(\d+)/);
            const heightMatch = videoInfo.match(/"height":\s*(\d+)/);
            if (widthMatch) videoData.width = parseInt(widthMatch[1]);
            if (heightMatch) videoData.height = parseInt(heightMatch[1]);
          }
        }
      }
    } catch (e) {
      console.log('video-detail 파싱 오류:', e);
    }

    try {
      // stats 데이터 파싱
      if (statsMatch) {
        const statsStr = statsMatch[1];
        
        // 좋아요 수
        const diggMatch = statsStr.match(/"diggCount":\s*(\d+)/);
        if (diggMatch) statsData.diggCount = parseInt(diggMatch[1]);
        
        // 댓글 수
        const commentMatch = statsStr.match(/"commentCount":\s*(\d+)/);
        if (commentMatch) statsData.commentCount = parseInt(commentMatch[1]);
        
        // 공유 수
        const shareMatch = statsStr.match(/"shareCount":\s*(\d+)/);
        if (shareMatch) statsData.shareCount = parseInt(shareMatch[1]);
        
        // 재생 수
        const playMatch = statsStr.match(/"playCount":\s*(\d+)/);
        if (playMatch) statsData.playCount = parseInt(playMatch[1]);
        
        // 저장 수
        const collectMatch = statsStr.match(/"collectCount":\s*"?(\d+)"?/);
        if (collectMatch) statsData.collectCount = parseInt(collectMatch[1]);
      }
    } catch (e) {
      console.log('stats 파싱 오류:', e);
    }

    try {
      // author 데이터 파싱
      if (authorMatch) {
        const authorStr = authorMatch[1];
        
        // 닉네임
        const nicknameMatch = authorStr.match(/"nickname":\s*"([^"]+)"/);
        if (nicknameMatch) authorData.nickname = nicknameMatch[1];
        
        // 사용자명
        const uniqueIdMatch = authorStr.match(/"uniqueId":\s*"([^"]+)"/);
        if (uniqueIdMatch) authorData.uniqueId = uniqueIdMatch[1];
        
        // 팔로워 수
        const followerMatch = authorStr.match(/"followerCount":\s*(\d+)/);
        if (followerMatch) authorData.followerCount = parseInt(followerMatch[1]);
        
        // 팔로잉 수
        const followingMatch = authorStr.match(/"followingCount":\s*(\d+)/);
        if (followingMatch) authorData.followingCount = parseInt(followingMatch[1]);
      }
    } catch (e) {
      console.log('author 파싱 오류:', e);
    }

    const result = {
      video: videoData,
      stats: statsData,
      author: authorData
    };

    console.log('추출된 데이터:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('TikTok 스크래핑 오류:', error);
    throw error;
  }
}

async function extractTikTokMetadata(url: string): Promise<TikTokMetadata> {
  try {
    // 1. 웹 스크래핑 시도
    const scrapedData = await scrapeTikTokPage(url);
    
    if (scrapedData && scrapedData.video && scrapedData.stats && scrapedData.video.id) {
      console.log('웹 스크래핑 성공');
      
      // Unix timestamp를 날짜로 변환
      const createTime = scrapedData.video.createTime ? 
        new Date(parseInt(scrapedData.video.createTime) * 1000).toISOString() : 
        null;
      
      // 해시태그 추출 (설명에서)
      const hashtags = scrapedData.video.desc ? 
        extractHashtags(scrapedData.video.desc) : [];
      
      return {
        id: scrapedData.video.id,
        title: scrapedData.video.desc || null,
        author: scrapedData.author?.nickname || scrapedData.author?.uniqueId || null,
        upload_date: createTime,
        view_count: scrapedData.stats.playCount || null,
        like_count: scrapedData.stats.diggCount || null,
        comment_count: scrapedData.stats.commentCount || null,
        share_count: scrapedData.stats.shareCount || null,
        hashtags: hashtags,
        top_comments: [], // TikTok은 댓글을 별도 API로 가져와야 함
        thumbnail_url: scrapedData.video.cover || null,
        duration: scrapedData.video.duration || null,
        followers: scrapedData.author?.followerCount || null,
        scraped_data: scrapedData,
        source: 'web_scraping'
      };
    }
    
    throw new Error('스크래핑된 데이터가 유효하지 않습니다');
    
  } catch (error) {
    console.error('TikTok 메타데이터 추출 실패:', error);
    
    // 폴백: 실제 데이터가 없으면 null 값들로 반환
    return {
      id: null,
      title: null,
      author: null,
      upload_date: null,
      view_count: null,
      like_count: null,
      comment_count: null,
      share_count: null,
      hashtags: [],
      top_comments: [],
      thumbnail_url: null,
      duration: null,
      followers: null,
      scraped_data: null,
      source: 'fallback',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!url.includes('tiktok.com')) {
      return NextResponse.json(
        { error: '유효한 TikTok URL이 아닙니다.' },
        { status: 400 }
      );
    }

    const metadata = await extractTikTokMetadata(url);

    return NextResponse.json({
      success: true,
      metadata,
      message: `${metadata.source === 'web_scraping' ? '웹 스크래핑' : '폴백'} 모드로 TikTok 데이터를 가져왔습니다.`
    });

  } catch (error) {
    console.error('TikTok 메타데이터 추출 오류:', error);
    return NextResponse.json(
      { 
        error: 'TikTok 메타데이터 추출 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
